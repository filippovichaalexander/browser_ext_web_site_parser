/**
 * Data fetching utility functions for GSC extension
 */

import { getApiDateRange, getPeriodDates } from './dateUtils.js';

/**
 * Fetch GSC data for a specific period
 * @param {string} siteUrlForApi - The site URL to fetch data for
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {number} rowLimit - Maximum number of rows to fetch
 * @param {string} pageUrl - Page URL to fetch data for (null for domain-wide)
 * @param {string} authToken - The authentication token
 * @param {string} deviceFilter - Device filter (desktop, mobile, tablet, all)
 * @param {string} searchTypeFilter - Search type filter (web, image, video, news, all)
 * @param {string} dimension - The dimension to group by ('query' or 'page')
 * @param {Function} updateStatus - Function to update status messages
 * @returns {Promise<Object>} - The fetched data and metadata
 */
export async function fetchGscDataForPeriod(siteUrlForApi, startDate, endDate, rowLimit, pageUrl, authToken, deviceFilter = 'all', searchTypeFilter = 'web', dimension = 'query', updateStatus = () => {}) {
    const apiUrl = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrlForApi)}/searchAnalytics/query`;
    
    // Base request body - use the specified dimension
    const requestBody = {
        startDate,
        endDate,
        dimensions: [dimension], // Use the specified dimension (query or page)
        rowLimit: rowLimit,
        startRow: 0
    };
    
    // Handle search type filter
    if (searchTypeFilter && searchTypeFilter !== 'all') {
        // Add search type as a top-level parameter
        requestBody.type = searchTypeFilter.toLowerCase();
    }

    // Initialize filter groups array
    requestBody.dimensionFilterGroups = [];
    let groupFilters = []; // Filters within the main group

    // Add page filter if pageUrl is specified (page-level fetch)
    if (pageUrl) {
        groupFilters.push({ dimension: 'page', operator: 'equals', expression: pageUrl });
    }

    // Add device filter if not 'all'
    if (deviceFilter && deviceFilter !== 'all') {
        groupFilters.push({ dimension: 'device', operator: 'equals', expression: deviceFilter });
    }
    
    // NOTE: Search type is handled via top-level 'type' parameter, not as a dimension filter

    // Add the group of filters if any exist
    if (groupFilters.length > 0) {
        requestBody.dimensionFilterGroups.push({ filters: groupFilters });
    }

    updateStatus(`Fetching data for ${startDate} to ${endDate}...`);

    // Validate auth token before making request
    if (!authToken || typeof authToken !== 'string' || authToken.length < 10) {
        throw new Error('Invalid authentication token');
    }

    // Validate API URL to prevent injection attacks
    if (!apiUrl.startsWith('https://www.googleapis.com/webmasters/v3/')) {
        throw new Error('Invalid API endpoint');
    }

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${authToken}`, 
            'Content-Type': 'application/json',
            'User-Agent': 'GSC-Keywords-Extension/1.7'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        let errorData, errorMsg;
        try { errorData = await response.json(); } catch (e) { errorData = { error: { message: response.statusText || 'Failed to parse error' } }; }
        errorMsg = `API Error ${response.status} (${startDate}-${endDate}): ${errorData.error?.message || 'Unknown API error'}`;
        // Specific error handling (can be enhanced)
        if (response.status === 401) { errorMsg = `Authorization failed (${startDate}-${endDate}). Token invalid/expired? Please Sign Out & Sign In again.`; }
        else if (response.status === 403) { errorMsg = `Permission denied for ${siteUrlForApi} (${startDate}-${endDate}). Ensure account has access. ${errorData.error?.message || ''}`; }
        else if (response.status === 404) { errorMsg = `Site '${siteUrlForApi}' not found/accessible (${startDate}-${endDate}). Verify domain property.`; }
        else if (response.status === 429) { errorMsg = `Rate limit/Quota exceeded (${startDate}-${endDate}). Wait and try again.`; }
        else if (response.status >= 500) { errorMsg = `Google Server Error (${response.status}) (${startDate}-${endDate}). Try again later.`; }
        throw new Error(errorMsg);
    }

    const result = await response.json();
    updateStatus(`Processing data for ${startDate} to ${endDate}...`);

    // Calculate total metrics from all rows
    let totalClicks = 0;
    let totalImpressions = 0;
    let totalCTR = 0;
    let totalPosition = 0;
    let rowCount = 0;
    
    const mappedData = (result.rows || []).map(r => {
        const clicks = parseInt(r.clicks ?? 0);
        const impressions = parseInt(r.impressions ?? 0);
        // CTR comes as a decimal (e.g., 0.104 for 10.4%)
        const ctr = parseFloat(r.ctr ?? 0);
        const position = parseFloat(r.position ?? 0);
        
        // Sum up metrics for totals
        totalClicks += clicks;
        totalImpressions += impressions;
        // For weighted average, we'll calculate the total clicks from CTR and impressions
        totalCTR += ctr; // Will be used to calculate average later
        totalPosition += position * (impressions || 1); // Weighted by impressions
        rowCount += 1;
        
        return {
            query: r.keys?.[0] || null,
            clicks: clicks,
            impressions: impressions,
            ctr: ctr,
            position: position
        };
    }).filter(i => i.query !== null);
    
    // Calculate averages
    // Use the average of individual CTR values (API already provides them as percentages)
    const avgCTR = rowCount > 0 ? (totalCTR / rowCount) : 0;
    const avgPosition = totalImpressions > 0 ? (totalPosition / totalImpressions) : 0;

    const metadata = {
        siteUrl: siteUrlForApi,
        pageUrl: pageUrl,
        startDate,
        endDate,
        rowLimit,
        extractedCount: mappedData.length,
        containsSampledData: result.responseAggregationType === 'byProperty',
        fetchTimestamp: Date.now(),
        deviceFilter: deviceFilter,
        searchTypeFilter: searchTypeFilter,
        // Add aggregated metrics
        totalClicks: totalClicks,
        totalImpressions: totalImpressions,
        avgCTR: avgCTR * 100, // Convert to percentage
        avgPosition: avgPosition,
        dimension: dimension // Include the dimension used for this request
    };

    return { data: mappedData, metadata: metadata };
}

/**
 * Handle fetching GSC data
 * @param {Object} params - Parameters for the fetch operation
 * @param {Function} displayQueryData - Function to display the query data
 * @param {Function} handleSignOutClick - Function to handle sign out
 * @param {boolean} isSignedIn - Whether the user is signed in
 * @param {string} currentAuthToken - The current auth token
 * @param {string} selectedSiteProperty - The selected site property
 * @param {string} customUrl - Custom URL entered by the user
 * @returns {Promise<void>}
 */
// Import the fetch site properties function
import { fetchSiteProperties, populateSitePropertiesDropdown, selectCustomProperty, getBestMatchingProperty } from './sitePropertiesUtils.js';

export async function handleFetchDataClick(
    { displayQueryData, handleSignOutClick, isSignedIn, currentAuthToken, selectedSiteProperty, customUrl, setSelectedSiteProperty, updateStatus }
) {
    const button = document.getElementById('fetchApiData');
    if (!isSignedIn || !currentAuthToken) {
        updateStatus("Please Sign In first.", true);
        return;
    }

    try {
        button.disabled = true;
        
        // Store the original property selection and ensure it's preserved
        const originalSiteProperty = selectedSiteProperty;
        
        // Initialize adjustment flags at the function level scope
        let mainPeriodAdjusted = false;
        let comparisonPeriodAdjusted = false;
        
        console.log('Original site property:', originalSiteProperty);
        
        // Refresh site properties in the background (don't await to avoid blocking)
        // This ensures site properties are periodically updated when user fetches data
        try {
            console.log('Refreshing site properties in background at:', new Date().toISOString());
            // Use forceRefresh=false to use cache if within expiry time
            fetchSiteProperties(currentAuthToken, isSignedIn, updateStatus, handleSignOutClick, displayQueryData, false)
                .then(properties => {
                    if (properties && properties.length > 0) {
                        console.log('Site properties refreshed in background, count:', properties.length);
                        populateSitePropertiesDropdown(properties, updateStatus);
                    }
                })
                .catch(error => {
                    // Just log the error but don't interrupt the main data fetch
                    console.warn('Background site properties refresh failed:', error);
                });
        } catch (error) {
            // Just log the error but don't interrupt the main data fetch
            console.warn('Background site properties refresh failed:', error);
        }
        
        let autoSelectedProperty = false;
        // Check if a site property is selected
        if (!selectedSiteProperty) {
            // If no property is selected, try to get the current tab's URL
            updateStatus('No site property selected. Getting current tab info...');
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs?.[0]?.url) throw new Error("No site property selected and could not get active tab URL.");

            const pageUrl = tabs[0].url;
            if (!pageUrl.startsWith('http')) throw new Error('No site property selected. Navigate to a valid web page (http/https).');

            try {
                const bestProp = getBestMatchingProperty(pageUrl) || `sc-domain:${new URL(pageUrl).hostname}`;
                // Only set the property if none was selected to begin with
                if (!originalSiteProperty) {
                    selectCustomProperty(bestProp, updateStatus);
                    autoSelectedProperty = true;
                }
            } catch (e) {
                throw new Error('Invalid page URL. Please select a site property or navigate to a valid web page.');
            }
        }

        // --- Read UI Controls ---
        const keywordLimit = Math.min(parseInt(document.getElementById('keywordLimit').value) || 1000, 25000);
        
        // Always use the original property to prevent changes
        let siteUrlForApi = originalSiteProperty;
        
        // If no site property is available, try to use the current tab URL again
        // This addresses a potential race condition on first load
        if (!siteUrlForApi) {
            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs?.[0]?.url && tabs[0].url.startsWith('http')) {
                    const bestProp = getBestMatchingProperty(tabs[0].url) || `sc-domain:${new URL(tabs[0].url).hostname}`;
                    siteUrlForApi = bestProp;
                    if (!originalSiteProperty) {
                        setSelectedSiteProperty(siteUrlForApi);
                        updateStatus(`Using current tab property: ${siteUrlForApi.replace(/^https?:\/\//,'').replace(/^sc-domain:/,'')}`);
                    }
                }
            } catch (e) {
                console.error('Error getting tab URL:', e);
            }
        }
        
        // Final check - if we still don't have a site property, show error
        if (!siteUrlForApi) {
            throw new Error('Site property is not set. Please select a site property from the dropdown.');
        }
        const isDomainProperty = siteUrlForApi.startsWith('sc-domain:');
        const siteDomain = isDomainProperty ? siteUrlForApi.replace(/^sc-domain:/, '') : new URL(siteUrlForApi).hostname;
        
        // For URL properties, we need the page URL
        let pageUrl = '';
        
        // Get the current tab URL for URL properties (domain properties don't need specific page)
        if (!isDomainProperty) {
            // Use the custom URL if it's been set, otherwise query the current tab
            let tabUrl;
            let tabDomain;
            
            // Check if we have a custom URL set by the user
            if (customUrl && customUrl.startsWith('http')) {
                // Use the custom URL set by the user
                tabUrl = customUrl;
                try {
                    tabDomain = new URL(tabUrl).hostname;
                    console.log(`Using custom URL: ${tabUrl}`);
                } catch (e) {
                    throw new Error(`Invalid custom URL: ${tabUrl}. Please enter a valid URL.`);
                }
            } else {
                // Fall back to current tab URL if no custom URL is set
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs?.[0]?.url) {
                    tabUrl = tabs[0].url;
                    tabDomain = new URL(tabUrl).hostname;
                    console.log(`Using current tab URL: ${tabUrl}`);
                } else {
                    throw new Error("Could not get URL for page-specific data. Use domain-wide option instead.");
                }
            }
            
            // Check if the tab URL belongs to the selected property's domain
            if (tabDomain === siteDomain || tabDomain.endsWith('.' + siteDomain)) {
                // For URL properties, check if the tab URL starts with the property URL
                if (!isDomainProperty) {
                    const propertyUrlObj = new URL(siteUrlForApi);
                    const propertyPath = propertyUrlObj.pathname;
                    const tabUrlObj = new URL(tabUrl);
                    const tabPath = tabUrlObj.pathname;
                    
                    // If the tab URL path starts with the property path, use the tab URL
                    // This handles subdirectory properties correctly
                    if (tabPath.startsWith(propertyPath)) {
                        pageUrl = tabUrl;
                        console.log(`Using current tab URL (${tabUrl}) for page-specific data`);
                    } else {
                        throw new Error(`Current page (${tabPath}) doesn't belong to the selected property (${propertyPath}). Use domain-wide option instead.`);
                    }
                } else {
                    // For domain properties, just use the tab URL
                    pageUrl = tabUrl;
                    console.log(`Using current tab URL (${tabUrl}) for page-specific data`);
                }
            } else {
                throw new Error(`Current tab (${tabDomain}) doesn't match selected property (${siteDomain}). Use domain-wide option instead.`);
            }
        } else if (!isDomainProperty) {
            // If it's a URL property but domain-wide is checked, we'll use an empty pageUrl
            pageUrl = '';
        }
        const dateRangeSelect = document.getElementById('dateRange');
        const selectedRangeOption = dateRangeSelect.value;
        const isCustomDateMode = selectedRangeOption === 'custom';
        const compareDataCheckbox = document.getElementById('compareData');
        const doComparison = compareDataCheckbox?.checked;
        const compareType = doComparison ? document.querySelector('input[name="comparisonType"]:checked')?.value : null; // 'previous' or 'lastYear'

        // --- Get Filter Values (Revised Logic - Prioritize Dropdown if Changed) ---
        // Read both sets of controls
        const devicePrimaryEl = document.getElementById('deviceFilter');
        const searchTypePrimaryEl = document.getElementById('searchTypeFilter');
        const deviceDropdownEl = document.getElementById('deviceFilter_dropdown');
        const searchTypeDropdownEl = document.getElementById('searchTypeFilter_dropdown');

        // Get values, defaulting if elements don't exist
        const primaryDeviceValue = devicePrimaryEl ? devicePrimaryEl.value : 'all';
        const primarySearchTypeValue = searchTypePrimaryEl ? searchTypePrimaryEl.value : 'web'; // Default primary search type to 'web' if needed
        const dropdownDeviceValue = deviceDropdownEl ? deviceDropdownEl.value : 'all';
        const dropdownSearchTypeValue = searchTypeDropdownEl ? searchTypeDropdownEl.value : 'all'; // Read 'all' from dropdown UI

        // Prioritize the dropdown value *if it's not the default 'all'*
        let deviceFilter = (dropdownDeviceValue !== 'all') ? dropdownDeviceValue : primaryDeviceValue;

        // Prioritize dropdown search type if it's not 'all'. Otherwise, use primary.
        let searchTypeFilter = (dropdownSearchTypeValue !== 'all') ? dropdownSearchTypeValue : primarySearchTypeValue;

        // Ensure the final searchTypeFilter isn't 'all' before passing to API function (API default is 'web')
        // The API function itself expects 'web' as default if 'all' is passed.
        // So, we can pass 'all' if both UI elements are 'all'.

        console.log("Determined filters:", {
             primaryDevice: primaryDeviceValue,
             primarySearch: primarySearchTypeValue,
             dropdownDevice: dropdownDeviceValue,
             dropdownSearch: dropdownSearchTypeValue,
             finalDevice: deviceFilter,
             finalSearch: searchTypeFilter // This value ('all' or specific type) will be passed
        });

        let period1 = null; // Comparison period
        let period2 = { startDate: null, endDate: null }; // Main period

        // --- Define Date Regex Early ---
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // Moved declaration up

        // --- Determine Main Period (Period 2) Dates ---
        if (isCustomDateMode) {
            // Handle custom date range
            const startDateInput = document.getElementById('period2StartDate');
            if (!startDateInput?.value) {
                throw new Error("Please select a start date for the custom range.");
            }
            
            const startDate = startDateInput.value;
            // Calculate end date (3 months from start date or today, whichever is earlier)
            const endDateObj = new Date(startDate);
            endDateObj.setMonth(endDateObj.getMonth() + 3);
            
            const today = new Date();
            const endDate = endDateObj > today ? 
                today.toISOString().split('T')[0] : 
                endDateObj.toISOString().split('T')[0];
            
            period2 = { startDate, endDate };
        } else {
            // Use predefined date range
            updateStatus('Using predefined date range...');
            period2 = getApiDateRange(selectedRangeOption);
            if (!period2) {
                throw new Error("Invalid predefined date range selected.");
            }
        }

        // --- Validate Main Period Dates (Common for both modes) ---
        if (!dateRegex.test(period2.startDate) || !dateRegex.test(period2.endDate)) {
            throw new Error("Invalid date format for main period. Please use YYYY-MM-DD.");
        }
        const d2Start = new Date(period2.startDate + 'T00:00:00Z');
        const d2End = new Date(period2.endDate + 'T23:59:59Z');
        const today = new Date();
        const sixteenMonthsAgo = new Date();
        // Calculate 16 months ago more precisely (16 months * 30.5 days per month)
        sixteenMonthsAgo.setTime(today.getTime() - (16 * 30.5 * 24 * 60 * 60 * 1000));
        sixteenMonthsAgo.setUTCHours(0, 0, 0, 0);
        console.log('16 months ago date calculated as:', sixteenMonthsAgo.toISOString().split('T')[0]);

        if (d2Start > d2End) {
            throw new Error("Start date cannot be after end date for the main period.");
        }
        
        // Instead of throwing an error, adjust the date to be within 16 months
        if (d2Start < sixteenMonthsAgo) {
            console.log('Adjusting main period start date to be within 16 month limit');
            d2Start.setTime(sixteenMonthsAgo.getTime());
            period2.startDate = d2Start.toISOString().split('T')[0];
            console.log('Adjusted main period start date:', period2.startDate);
            // Add a warning to the UI
            updateStatus('Warning: Main period start date adjusted to fit within Google\'s 16-month limit: ' + period2.startDate, true, 'warning');
            mainPeriodAdjusted = true;
        }
        
        const todayStr = today.toISOString().split('T')[0];
        if (period2.endDate > todayStr) {
            throw new Error("Main period end date cannot be in the future.");
        }
        // --- End Main Period Validation ---


        // --- Determine Comparison Period (Period 1) Dates (if enabled) ---
        if (doComparison && compareType) {
            updateStatus('Calculating comparison period...');
            if (compareType === 'previous') {
                if (isCustomDateMode) {
                    // For custom dates, calculate an equivalent previous period
                    const p2Start = new Date(period2.startDate);
                    const p2End = new Date(period2.endDate);
                    const duration = p2End - p2Start;
                    
                    const p1End = new Date(p2Start);
                    p1End.setDate(p1End.getDate() - 1); // Day before period 2 starts
                    
                    const p1Start = new Date(p1End);
                    p1Start.setTime(p1End.getTime() - duration); // Same duration before
                    
                    period1 = {
                        startDate: p1Start.toISOString().split('T')[0],
                        endDate: p1End.toISOString().split('T')[0]
                    };
                } else {
                    // For predefined ranges, use direct calculation for more precise previous period
                    // Get the current period dates
                    let days;
                    switch(selectedRangeOption) {
                        case 'last7days': days = 7; break;
                        case 'last28days': days = 28; break;
                        case 'last3months': days = 90; break;
                        case 'last6months': days = 180; break;
                        case 'last8months': days = 240; break;
                        case 'lastYear': days = 365; break;
                        default: days = parseInt(selectedRangeOption);
                    }
                    
                    if (isNaN(days) || days <= 0) {
                        throw new Error("Invalid date range for comparison.");
                    }
                    
                    // Calculate previous period directly from period2 dates to ensure proper alignment
                    // This ensures the comparison period ends exactly the day before period2 starts
                    const p2Start = new Date(period2.startDate + 'T00:00:00Z');
                    const p1End = new Date(p2Start);
                    p1End.setDate(p1End.getDate() - 1); // Day before period 2 starts
                    
                    const p1Start = new Date(p1End);
                    p1Start.setDate(p1Start.getDate() - days + 1); // Go back by the number of days
                    
                    // Format YYYY-MM-DD
                    const formatDate = (date) => date.toISOString().split('T')[0];
                    period1 = {
                        startDate: formatDate(p1Start),
                        endDate: formatDate(p1End)
                    };
                }
            } else if (compareType === 'lastYear') {
                // Calculate dates one year prior to period 2
                // We use the exact same date range but exactly one year earlier
                const p2Start = new Date(period2.startDate);
                const p2End = new Date(period2.endDate);
                
                // Calculate new dates by subtracting exactly 365 days (or 366 if leap year)
                const isLeapYear = (year) => {
                    return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
                };
                
                // Get exact number of days to subtract
                const yearToCheck = p2Start.getFullYear() - 1;
                const daysToSubtract = isLeapYear(yearToCheck) ? 366 : 365;
                
                // Create new dates exactly one year earlier
                const p1Start = new Date(p2Start);
                p1Start.setDate(p1Start.getDate() - daysToSubtract);
                
                const p1End = new Date(p2End);
                p1End.setDate(p1End.getDate() - daysToSubtract);
                
                // Format back to YYYY-MM-DD
                const formatDate = (date) => date.toISOString().split('T')[0];
                period1 = { 
                    startDate: formatDate(p1Start), 
                    endDate: formatDate(p1End) 
                };
                
                console.log('Year-over-year comparison calculated:', 
                    `Current: ${period2.startDate} to ${period2.endDate}`, 
                    `YoY: ${period1.startDate} to ${period1.endDate}`);
            }

            // --- Validate Comparison Period Dates (if calculated) ---
            if (period1) {
                // Validation using dateRegex (now declared earlier)
                if (!dateRegex.test(period1.startDate) || !dateRegex.test(period1.endDate)) {
                    throw new Error("Invalid date format for comparison period. Please use YYYY-MM-DD.");
                }
                const d1Start = new Date(period1.startDate + 'T00:00:00Z');
                const d1End = new Date(period1.endDate + 'T23:59:59Z');

                if (d1Start > d1End) {
                    throw new Error("Start date cannot be after end date for the comparison period.");
                }
                
                // Instead of throwing an error, adjust the date to be within 16 months
                if (d1Start < sixteenMonthsAgo) {
                    console.log('Adjusting comparison period start date to be within 16 month limit');
                    d1Start.setTime(sixteenMonthsAgo.getTime());
                    period1.startDate = d1Start.toISOString().split('T')[0];
                    console.log('Adjusted comparison period start date:', period1.startDate);
                    // Add a warning to the UI
                    updateStatus('Warning: Comparison period start date adjusted to fit within Google\'s 16-month limit: ' + period1.startDate, true, 'warning');
                    comparisonPeriodAdjusted = true;
                }
                
                if (period1.endDate > todayStr) {
                    throw new Error("Comparison period end date cannot be in the future.");
                }
            }
            // --- End Comparison Period Validation ---
        } else {
            period1 = null; // Ensure period1 is null if comparison is off
        }

        console.log("Period 1 (Comparison):", period1);
        console.log("Period 2 (Main):", period2);
        console.log("Filters determined:", { device: deviceFilter, searchType: searchTypeFilter });

        // --- Fetch Data ---
        updateStatus('Fetching page and keyword data...');
        
        // Fetch both page-level and keyword-level data in parallel for the main period (Period 2)
        const [resultPeriod2Pages, resultPeriod2Keywords] = await Promise.all([
            // Page-level data for dashboard (no row limit to get all pages for accurate aggregation)
            fetchGscDataForPeriod(siteUrlForApi, period2.startDate, period2.endDate, 5000, pageUrl, currentAuthToken, deviceFilter, searchTypeFilter, 'page', updateStatus)
                .catch(err => {
                    console.error('Error fetching page-level data for period 2:', err);
                    updateStatus('Error fetching page-level data', true);
                    return { data: [], metadata: null };
                }),
            // Keyword-level data for the table
            fetchGscDataForPeriod(siteUrlForApi, period2.startDate, period2.endDate, keywordLimit, pageUrl, currentAuthToken, deviceFilter, searchTypeFilter, 'query', updateStatus)
                .catch(err => {
                    console.error('Error fetching keyword data for period 2:', err);
                    updateStatus('Error fetching keyword data', true);
                    return { data: [], metadata: null };
                })
        ]);
        
        // Check if we got valid data
        if (!resultPeriod2Pages || !resultPeriod2Keywords) {
            throw new Error('Failed to fetch required data. Please try again.');
        }
        
        // Combine the results - use page data for metrics and keyword data for the table
        const resultPeriod2 = {
            data: resultPeriod2Keywords.data, // Use keyword data for the table
            metadata: {
                ...resultPeriod2Keywords.metadata, // Base metadata from keyword query
                // Include page-level metrics
                pageLevelMetrics: {
                    totalClicks: resultPeriod2Pages.metadata?.totalClicks || 0,
                    totalImpressions: resultPeriod2Pages.metadata?.totalImpressions || 0,
                    avgCTR: resultPeriod2Pages.metadata?.avgCTR || 0,
                    avgPosition: resultPeriod2Pages.metadata?.avgPosition || 0
                },
                // Add the actual metrics to the root level for backward compatibility
                totalClicks: resultPeriod2Pages.metadata?.totalClicks || 0,
                totalImpressions: resultPeriod2Pages.metadata?.totalImpressions || 0,
                avgCTR: resultPeriod2Pages.metadata?.avgCTR || 0,
                avgPosition: resultPeriod2Pages.metadata?.avgPosition || 0
            }
        };

        // Fetch comparison data (Period 1) if needed
        let resultPeriod1 = { data: [], metadata: null }; // Default empty result
        if (period1) {
            updateStatus(`Fetching comparison data (${period1.startDate} to ${period1.endDate})...`);
            
            try {
                // Fetch both page-level and keyword-level data in parallel for the comparison period (Period 1)
                const [resultPeriod1Pages, resultPeriod1Keywords] = await Promise.all([
                    // Page-level data for dashboard (no row limit to get all pages for accurate aggregation)
                    fetchGscDataForPeriod(siteUrlForApi, period1.startDate, period1.endDate, 5000, pageUrl, currentAuthToken, deviceFilter, searchTypeFilter, 'page', updateStatus)
                        .catch(err => {
                            console.error('Error fetching page-level comparison data:', err);
                            updateStatus('Error fetching comparison page-level data', true);
                            return { data: [], metadata: null };
                        }),
                    // Keyword-level data for the table
                    fetchGscDataForPeriod(siteUrlForApi, period1.startDate, period1.endDate, keywordLimit, pageUrl, currentAuthToken, deviceFilter, searchTypeFilter, 'query', updateStatus)
                        .catch(err => {
                            console.error('Error fetching keyword-level comparison data:', err);
                            updateStatus('Error fetching comparison keyword data', true);
                            return { data: [], metadata: null };
                        })
                ]);
                
                // Only set resultPeriod1 if we got valid data
                if (resultPeriod1Pages?.metadata && resultPeriod1Keywords?.data) {
                    resultPeriod1 = {
                        data: resultPeriod1Keywords.data,
                        metadata: {
                            ...resultPeriod1Keywords.metadata,
                            // Include page-level metrics
                            pageLevelMetrics: {
                                totalClicks: resultPeriod1Pages.metadata?.totalClicks || 0,
                                totalImpressions: resultPeriod1Pages.metadata?.totalImpressions || 0,
                                avgCTR: resultPeriod1Pages.metadata?.avgCTR || 0,
                                avgPosition: resultPeriod1Pages.metadata?.avgPosition || 0
                            },
                            // For backward compatibility
                            totalClicks: resultPeriod1Pages.metadata?.totalClicks || 0,
                            totalImpressions: resultPeriod1Pages.metadata?.totalImpressions || 0,
                            avgCTR: resultPeriod1Pages.metadata?.avgCTR || 0,
                            avgPosition: resultPeriod1Pages.metadata?.avgPosition || 0
                        }
                    };
                } else {
                    console.warn('Incomplete comparison data received, falling back to no comparison');
                    updateStatus('Warning: Could not load complete comparison data', true, 'warning');
                }
            } catch (err) {
                console.error('Error processing comparison data:', err);
                updateStatus('Error processing comparison data', true);
                // Continue with empty comparison data rather than failing the entire operation
                resultPeriod1 = { data: [], metadata: null };
            }
        }

        // --- Combine and Store Results ---
        updateStatus('Combining and storing results...');

        // Create combined metadata for display, using Period 2 as the primary
        const combinedMetadata = {
            ...resultPeriod2.metadata, // Base on Period 2 (includes filters)
            comparisonStartDate: resultPeriod1.metadata?.startDate || null,
            comparisonEndDate: resultPeriod1.metadata?.endDate || null,
            comparisonType: period1 ? compareType : null, // 'previous', 'lastYear', or null
            // Track date adjustments
            mainPeriodAdjusted: mainPeriodAdjusted || false,
            comparisonPeriodAdjusted: comparisonPeriodAdjusted || false,
            // Ensure fetchTimestamp reflects the *latest* fetch
            fetchTimestamp: period1 ? Math.max(resultPeriod1.metadata?.fetchTimestamp || 0, resultPeriod2.metadata.fetchTimestamp) : resultPeriod2.metadata.fetchTimestamp
        };
        
        // Add date adjustment flags based on date calculations
        if (period2.startDate <= sixteenMonthsAgo.toISOString().split('T')[0]) {
            combinedMetadata.mainPeriodAdjusted = true;
        }
        
        if (period1 && period1.startDate <= sixteenMonthsAgo.toISOString().split('T')[0]) {
            combinedMetadata.comparisonPeriodAdjusted = true;
        }
        
        console.log('Final metadata with adjustment flags:', {
            mainPeriodAdjusted: combinedMetadata.mainPeriodAdjusted,
            comparisonPeriodAdjusted: combinedMetadata.comparisonPeriodAdjusted,
            mainPeriod: `${period2.startDate} to ${period2.endDate}`,
            comparisonPeriod: period1 ? `${period1.startDate} to ${period1.endDate}` : 'none'
        });
        
        // Data to store in local storage
        const dataToStoreCurrent = { metadata: combinedMetadata, queries: resultPeriod2.data };
        // Store Period 1's data/metadata separately for the comparison logic in displayQueryData
        const dataToStorePrevious = { metadata: resultPeriod1.metadata, queries: resultPeriod1.data };
        
        // Save to storage
        chrome.storage.local.set({
            gscApiResult: dataToStoreCurrent,
            gscApiResult_previous: dataToStorePrevious
        }, () => {
            let displayError = false;
            if (chrome.runtime.lastError) {
                console.error("Error saving data to storage:", chrome.runtime.lastError);
                updateStatus('Error saving data.', true);
                displayError = true;
            } else {
                console.log("API results saved to storage (Current & Previous).");
            }

            // Display results
            setTimeout(() => {
                try {
                    // ---> ADDED LOGGING HERE <---
                    console.log("Inside setTimeout: About to call displayQueryData.");
                    console.log("Inside setTimeout: Passing resultPeriod2.data:", resultPeriod2?.data);
                    console.log("Inside setTimeout: Passing resultPeriod1.data:", resultPeriod1?.data);
                    console.log("Inside setTimeout: Property type:", isDomainProperty ? 'domain' : 'URL');
                    
                    // Always restore the original property selection to ensure it's preserved
                    setSelectedSiteProperty(originalSiteProperty);
                    console.log('Restored original site property:', originalSiteProperty);
                    
                    // If the dropdown element exists, update it to match the original property
                    const sitePropertyInput = document.getElementById('sitePropertyInput');
                    const sitePropertyDropdown = document.getElementById('sitePropertyDropdown');
                    if (sitePropertyInput && sitePropertyDropdown && originalSiteProperty) {
                        // Find the matching option and update the UI accordingly
                        const options = sitePropertyDropdown.querySelectorAll('.custom-select-option');
                        options.forEach(option => {
                            if (option.dataset.value === originalSiteProperty) {
                                sitePropertyInput.value = option.textContent;
                            }
                        });
                    }
                    
                    displayQueryData(
                        resultPeriod2.data,         // Current data (Period 2)
                        resultPeriod1.data,         // Previous data (Period 1)
                        siteDomain,
                        pageUrl,
                        combinedMetadata,           // Combined metadata for current display
                        resultPeriod1.metadata      // Period 1 metadata for comparison context
                    );
                    if (!displayError) {
                         let dateMsg = `fetched data for ${period2.startDate} to ${period2.endDate}`;
                         if (period1) {
                             const compTypeDesc = compareType === 'lastYear' ? 'vs Last Year' : 'vs Previous Period';
                             dateMsg = `compared ${period2.startDate}/${period2.endDate} ${compTypeDesc} (${period1.startDate}/${period1.endDate})`;
                         }
                        updateStatus(`Success: ${resultPeriod2.data.length} keywords ${dateMsg}.`);
                    }
                } catch (displayErr) {
                    console.error("Error during post-fetch display:", displayErr);
                    updateStatus(`Error displaying results: ${displayErr.message}`, true);
                }
            }, 0); // Yield thread
        }); // End set callback

    } catch (error) {
        console.error("Error in handleFetchDataClick:", error);
        updateStatus(`Error: ${error.message}`, true);
    } finally {
        if (button) button.disabled = false; // Ensure button re-enabled
    }
} // End handleFetchDataClick
