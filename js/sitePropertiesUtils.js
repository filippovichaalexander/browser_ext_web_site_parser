/**
 * Site properties utility functions for GSC extension
 */

// State variables
export let siteProperties = []; // List of all available GSC properties
export let selectedSiteProperty = null; // Currently selected property

// Constants
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get the current website URL, handling both popup and fullscreen modes
 * @returns {Promise<string|null>} The current website URL or null if not found
 */
export function getCurrentWebsiteUrl() {
  return new Promise((resolve) => {
    // Check if we're in fullscreen mode
    const urlParams = new URLSearchParams(window.location.search);
    const isFullscreen = urlParams.get('mode') === 'fullscreen';
    
    if (!isFullscreen) {
      // Popup mode: use the standard active tab query
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0] && tabs[0].url && !tabs[0].url.startsWith('chrome-extension://')) {
          resolve(tabs[0].url);
        } else {
          resolve(null);
        }
      });
    } else {
      // Fullscreen mode: find the most recent non-extension tab
      chrome.tabs.query({}, function(tabs) {
        // Filter out extension tabs
        const websiteTabs = tabs.filter(tab => 
          tab.url && 
          !tab.url.startsWith('chrome-extension://') && 
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('moz-extension://') &&
          !tab.url.startsWith('edge-extension://')
        );
        
        if (websiteTabs.length === 0) {
          resolve(null);
          return;
        }
        
        // Try to find an active website tab first
        const activeSiteTab = websiteTabs.find(tab => tab.active);
        if (activeSiteTab) {
          resolve(activeSiteTab.url);
          return;
        }
        
        // Fallback to the most recently accessed website tab
        const sortedTabs = websiteTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
        resolve(sortedTabs[0].url);
      });
    }
  });
}

/**
 * Set the selected site property
 * @param {string} property - The site property to select
 */
export function setSelectedSiteProperty(property) {
  selectedSiteProperty = property;
}

/**
 * Cache site properties with current timestamp
 * @param {Array} properties - The site properties to cache
 */
export function cacheSiteProperties(properties) {
  if (!Array.isArray(properties)) {
    console.error('Cannot cache site properties: Not an array');
    return;
  }
  
  const cacheData = {
    properties: properties,
    timestamp: Date.now()
  };
  
  chrome.storage.local.set({ 'cachedSiteProperties': cacheData }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error caching site properties:', chrome.runtime.lastError);
    }
  });
}

/**
 * Get cached site properties if they exist and aren't stale
 * @returns {Promise<Object|null>} Object with properties array and timestamp, or null if no valid cache
 */
export function getCachedSiteProperties() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['cachedSiteProperties'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error retrieving cached site properties:', chrome.runtime.lastError);
        resolve(null);
        return;
      }
      
      const cachedData = result.cachedSiteProperties;
      if (!cachedData || !Array.isArray(cachedData.properties) || !cachedData.timestamp) {
        resolve(null);
        return;
      }
      
      // Check if cache is stale
      const now = Date.now();
      const cacheAge = now - cachedData.timestamp;
      if (cacheAge > CACHE_EXPIRY_TIME) {
        resolve(null);
        return;
      }
      
      resolve(cachedData);
    });
  });
}

/**
 * Fetch all available GSC properties for the user
 * @param {string} currentAuthToken - The current auth token
 * @param {boolean} isSignedIn - Whether the user is signed in
 * @param {Function} updateStatus - Function to update status message
 * @param {Function} handleSignOutClick - Function to handle sign out
 * @param {Function} displayQueryData - Function to display query data
 * @param {boolean} forceRefresh - Force refresh from API even if cache exists
 * @returns {Promise<Array>} Array of site properties
 */
export async function fetchSiteProperties(currentAuthToken, isSignedIn, updateStatus, handleSignOutClick, displayQueryData, forceRefresh = false) {
  if (!isSignedIn || !currentAuthToken) {
    console.error("Cannot fetch site properties: Not signed in");
    return [];
  }
  
  // Check for cached site properties if not forcing refresh
  if (!forceRefresh) {
    try {
      const cachedData = await getCachedSiteProperties();
      if (cachedData && cachedData.properties.length > 0) {
        updateStatus(`Using cached site properties (${cachedData.properties.length} sites)`);
        return cachedData.properties;
      }
    } catch (error) {
      console.error('Error retrieving cached site properties:', error);
      // Continue to fetch from API if cache retrieval fails
    }
  }

  updateStatus("Fetching site properties...");
  
  try {
    const apiUrl = "https://www.googleapis.com/webmasters/v3/sites";
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${currentAuthToken}` }
    });

    if (!response.ok) {
      let errorData;
      try { 
        errorData = await response.json(); 
      } catch (e) { 
        errorData = { error: { message: response.statusText || 'Failed to parse error' } }; 
      }
      
      const errorMsg = `API Error ${response.status}: ${errorData.error?.message || 'Unknown API error'}`;
      
      if (response.status === 401) {
        await handleSignOutClick(updateStatus, displayQueryData);
        throw new Error(`Authorization failed. Token invalid/expired? Please Sign Out & Sign In again.`);
      }
      
      throw new Error(errorMsg);
    }

    const result = await response.json();
    
    if (!result.siteEntry || !Array.isArray(result.siteEntry)) {
      throw new Error("Invalid API response format: missing siteEntry array");
    }
    
    // Map the API response to a more usable format
    const properties = result.siteEntry.map(entry => ({
      siteUrl: entry.siteUrl,
      permissionLevel: entry.permissionLevel,
      // Determine if it's a domain property or URL property
      type: entry.siteUrl.startsWith('sc-domain:') ? 'domain' : 'url'
    }));
    
    // Sort properties: domains first, then URLs, both alphabetically
    properties.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'domain' ? -1 : 1; // Domains first
      }
      
      // For same types, sort alphabetically
      const aDisplay = a.siteUrl.replace(/^sc-domain:/, '');
      const bDisplay = b.siteUrl.replace(/^sc-domain:/, '');
      return aDisplay.localeCompare(bDisplay);
    });
    
    updateStatus(`Found ${properties.length} site properties`);
    
    // Cache the fetched properties
    cacheSiteProperties(properties);
    
    return properties;
  } catch (error) {
    console.error("Error fetching site properties:", error);
    updateStatus(`Error fetching site properties: ${error.message}`, true);
    return [];
  }
}

/**
 * Populate the site properties dropdown
 * @param {Array} properties - Array of site properties
 * @param {Function} updateStatus - Function to update status message
 */
export function populateSitePropertiesDropdown(properties, updateStatus) {
  siteProperties = properties; // Store properties globally
  const dropdownContent = document.getElementById('sitePropertyDropdown');
  const sitePropertyInput = document.getElementById('sitePropertyInput');

  if (!dropdownContent || !sitePropertyInput) return;

  // Clear existing options
  dropdownContent.innerHTML = '';

  if (properties.length === 0) {
    const noPropertiesOption = document.createElement('div');
    noPropertiesOption.className = 'custom-select-option';
    noPropertiesOption.textContent = "No properties found";
    dropdownContent.appendChild(noPropertiesOption);
    sitePropertyInput.placeholder = "No properties found";
    sitePropertyInput.disabled = true; // Disable input if no properties
  } else {
    // Add a default "Select a property..." option
    const defaultOption = document.createElement('div');
    defaultOption.className = 'custom-select-option';
    defaultOption.textContent = "Select a property...";
    defaultOption.dataset.value = ""; // Empty value for default
    dropdownContent.appendChild(defaultOption);

    // Add properties to dropdown
    properties.forEach(property => {
      const option = document.createElement('div');
      option.className = 'custom-select-option';
      option.dataset.value = property.siteUrl;

      // Format display text based on property type
      const displayUrl = property.siteUrl.replace(/^sc-domain:/, '');
      option.textContent = property.type === 'domain'
        ? `${displayUrl} (Domain)`
        : `${displayUrl}`;

      // Add class for styling
      option.classList.add(property.type === 'domain' ? 'property-domain' : 'property-url');

      // Add data attributes for additional info
      option.dataset.type = property.type;
      option.dataset.permissionLevel = property.permissionLevel;

      dropdownContent.appendChild(option);
    });

    sitePropertyInput.placeholder = "Select or search property...";
    sitePropertyInput.disabled = false; // Enable input
  }

  // Add search input at the top of the dropdown content
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search properties...';
  searchInput.id = 'sitePropertySearchInput';
  dropdownContent.insertBefore(searchInput, dropdownContent.firstChild); // Insert at the beginning

  // Auto-select best matching property based on current page URL (always prioritize current page)
  if (properties.length > 0) {
    getCurrentWebsiteUrl().then(currentUrl => {
      if (currentUrl) {
        const bestMatch = getBestMatchingProperty(currentUrl);
        if (bestMatch) {
          // Always use the best match for current page, regardless of saved selection
          selectCustomProperty(bestMatch, updateStatus);
          updateStatus(`Auto-selected property based on current page: ${bestMatch.replace(/^sc-domain:/, '')}`);
        } else if (selectedSiteProperty) {
          // Fall back to saved property only if no match found for current page
          selectCustomProperty(selectedSiteProperty, updateStatus);
        }
      } else if (selectedSiteProperty) {
        // Fall back to saved property if can't get current tab URL
        selectCustomProperty(selectedSiteProperty, updateStatus);
      }
    }).catch(error => {
      console.error('Error getting current website URL for auto-selection:', error);
      if (selectedSiteProperty) {
        selectCustomProperty(selectedSiteProperty, updateStatus);
      }
    });
  } else if (selectedSiteProperty) {
    // No properties available, but show saved selection for consistency
    selectCustomProperty(selectedSiteProperty, updateStatus);
  }
}

/**
 * Function to handle selecting a custom property option
 * @param {string} value - The value of the selected property
 * @param {Function} [updateStatus] - Function to update status message (optional)
 */
export function selectCustomProperty(value, updateStatus = () => {}) {
  const dropdownContent = document.getElementById('sitePropertyDropdown');
  const sitePropertyInput = document.getElementById('sitePropertyInput');
  const options = dropdownContent.querySelectorAll('.custom-select-option');
  let selectedOptionElement = null;

  // Remove 'selected' class from all options
  options.forEach(opt => opt.classList.remove('selected'));

  // Find and mark the selected option
  options.forEach(option => {
    if (option.dataset.value === value) {
      option.classList.add('selected');
      sitePropertyInput.value = option.textContent; // Set input value to option text
      selectedSiteProperty = value; // Update state variable
      selectedOptionElement = option;
    }
  });

  // If no option matched the value (e.g., saved property no longer exists)
  if (!selectedOptionElement) {
      sitePropertyInput.value = ""; // Clear input
      selectedSiteProperty = null; // Clear state variable
  }

  // Store the selection in Chrome storage
  chrome.storage.local.set({ 'selectedSiteProperty': selectedSiteProperty }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error saving selected property:", chrome.runtime.lastError);
    }
  });

  // Update Custom URL field based on property type
  const customUrlInput = document.getElementById('customUrlInput');
  const customUrlHelpText = document.getElementById('customUrlHelp');
  
  if (customUrlInput) {
      if (selectedOptionElement && selectedOptionElement.dataset.type === 'domain') {
          // For domain properties, disable the Custom URL field
          customUrlInput.disabled = true;
          customUrlInput.placeholder = "Report covers entire domain - Custom URL not needed";
          customUrlInput.style.backgroundColor = '#f5f5f5';
          customUrlInput.style.color = '#666';
          
          // Show help text if it exists
          if (customUrlHelpText) {
              customUrlHelpText.textContent = "Domain properties automatically include all pages of the domain";
              customUrlHelpText.style.display = 'block';
          }
      } else {
          // For URL properties, enable the field and populate with current page
          customUrlInput.disabled = false;
          customUrlInput.placeholder = "Enter URL for analysis...";
          customUrlInput.style.backgroundColor = '';
          customUrlInput.style.color = '';
          
          // Pre-fill with current page URL if not already set
          if (!customUrlInput.value) {
              getCurrentWebsiteUrl().then(currentUrl => {
                  if (currentUrl) {
                      customUrlInput.value = currentUrl;
                  }
              }).catch(error => {
                  console.error('Error getting current website URL for custom URL field:', error);
              });
          }
          
          // Hide help text if it exists
          if (customUrlHelpText) {
              customUrlHelpText.style.display = 'none';
          }
      }
  }

  try {
    // Only call updateStatus if it's a function
    if (typeof updateStatus === 'function') {
      updateStatus(`Selected property: ${selectedSiteProperty ? selectedSiteProperty.replace(/^sc-domain:/, '') : 'None'}`);
    }
  } catch (e) {
    console.warn('Error updating status during property selection:', e);
  }
  // Removed direct scope update logic - scope will update after data fetch via displayMetadata
}

/**
 * Handle site property selection change (for traditional select element)
 * @param {Event} event - The change event
 * @param {Function} updateStatus - Function to update status message
 */
export function handleSitePropertyChange(event, updateStatus) {
  const selectedValue = event.target.value;
  const selectedOption = event.target.options[event.target.selectedIndex];
  
  if (selectedValue) {
    selectedSiteProperty = selectedValue;
    
    // Store the selection in Chrome storage
    chrome.storage.local.set({ 'selectedSiteProperty': selectedValue }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error saving selected property:", chrome.runtime.lastError);
      }
    });
    
    // Update Custom URL field based on property type
    const propertyType = selectedOption.dataset.type;
    const customUrlInput = document.getElementById('customUrlInput');
    const customUrlHelpText = document.getElementById('customUrlHelp');
    
    if (customUrlInput) {
        if (propertyType === 'domain') {
            // For domain properties, disable the Custom URL field
            customUrlInput.disabled = true;
            customUrlInput.placeholder = "Report covers entire domain - Custom URL not needed";
            customUrlInput.style.backgroundColor = '#f5f5f5';
            customUrlInput.style.color = '#666';
            
            // Show help text if it exists
            if (customUrlHelpText) {
                customUrlHelpText.textContent = "Domain properties automatically include all pages of the domain";
                customUrlHelpText.style.display = 'block';
            }
        } else {
            // For URL properties, enable the field and populate with current page
            customUrlInput.disabled = false;
            customUrlInput.placeholder = "Enter URL for analysis...";
            customUrlInput.style.backgroundColor = '';
            customUrlInput.style.color = '';
            
            // Pre-fill with current page URL if not already set
            if (!customUrlInput.value) {
                getCurrentWebsiteUrl().then(currentUrl => {
                    if (currentUrl) {
                        customUrlInput.value = currentUrl;
                    }
                }).catch(error => {
                    console.error('Error getting current website URL for custom URL field:', error);
                });
            }
            
            // Hide help text if it exists
            if (customUrlHelpText) {
                customUrlHelpText.style.display = 'none';
            }
        }
    }
    
    updateStatus(`Selected property: ${selectedValue.replace(/^sc-domain:/, '')}`);
  } else {
    selectedSiteProperty = null;
    
    // Remove the selection from Chrome storage
    chrome.storage.local.remove('selectedSiteProperty', () => {
      if (chrome.runtime.lastError) {
        console.error("Error removing selected property:", chrome.runtime.lastError);
      }
    });
    
    // Reset Custom URL field
    const customUrlInput = document.getElementById('customUrlInput');
    const customUrlHelpText = document.getElementById('customUrlHelp');
    
    if (customUrlInput) {
        customUrlInput.disabled = false;
        customUrlInput.placeholder = "Enter URL for analysis...";
        customUrlInput.style.backgroundColor = '';
        customUrlInput.style.color = '';
        
        // Hide help text if it exists
        if (customUrlHelpText) {
            customUrlHelpText.style.display = 'none';
        }
    }
    
    updateStatus('No property selected');
  }
}

/**
 * Find the most specific site property that matches the given URL.
 * Prefers URL properties over domain properties and chooses the longest match.
 * @param {string} url - The page URL to match.
 * @returns {string|null} The matching site property or null if none found.
 */
export function getBestMatchingProperty(url) {
  if (!url || !siteProperties.length) return null;
  try {
    const urlObj = new URL(url);
    let bestProp = null;
    let bestLength = 0;

    for (const prop of siteProperties) {
      if (prop.type === 'url') {
        if (url.startsWith(prop.siteUrl) && prop.siteUrl.length > bestLength) {
          bestProp = prop.siteUrl;
          bestLength = prop.siteUrl.length;
        }
      } else {
        const domain = prop.siteUrl.replace(/^sc-domain:/, '');
        if (urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)) {
          if (domain.length > bestLength) {
            bestProp = prop.siteUrl;
            bestLength = domain.length;
          }
        }
      }
    }

    return bestProp;
  } catch (e) {
    console.error('Property match error:', e);
    return null;
  }
}
