/**
 * @fileoverview Utility functions for filtering and sorting data.
 */

import { sortDataAdvanced } from './sortUtils.js';
import { updateStatus } from './statusUtils.js';

/**
 * Apply all filtering and sorting operations to the data.
 * Handles filter pills, search terms, regex filters, and advanced filter rules.
 * 
 * @param {Object} options - Options for filtering and sorting
 * @param {Array} options.currentQueryData - The raw query data to filter
 * @param {string} options.currentSearchTerm - The current search term
 * @param {Object} options.queryRegexObject - Compiled regex object for query filtering
 * @param {Array} options.filterRules - Array of filter rule objects
 * @param {string} options.filterLogic - The logic to apply to filter rules ('AND' or 'OR')
 * @param {Array} options.currentSortKeys - Array of sort keys and directions
 * @param {Function} options.refreshDataDisplay - Function to refresh the data display
 * @param {Function} options.updateMultiSortInfo - Function to update the sort info in the UI
 * @param {Object} options.currentMetadata - Current metadata
 * @returns {Array} The filtered and sorted data
 */
export function applyFiltersAndSort({
    currentQueryData,
    currentSearchTerm,
    queryRegexObject,
    filterRules,
    filterLogic,
    currentSortKeys,
    refreshDataDisplay,
    updateMultiSortInfo,
    currentMetadata
}) {
    const activeFilterPill = document.querySelector('.filter-container .filter-pill.active');
    const activePillFilter = activeFilterPill ? activeFilterPill.dataset.filter : 'all';

    let resultData = [...currentQueryData];

    // 1. Apply Filter Pill Logic FIRST
    if (activePillFilter !== 'all') {
        resultData = resultData.filter(item => {
            const pos = parseFloat(item.position);
            const ctr = parseFloat(item.ctr) * 100; // Percentage
            const clicks = parseInt(item.clicks);
            const impressions = parseInt(item.impressions);

            switch (activePillFilter) {
                case 'position-1-3': return !isNaN(pos) && pos >= 1 && pos <= 3;
                case 'position-5-20': return !isNaN(pos) && pos >= 5 && pos <= 20;
                case 'position-gt-20': return !isNaN(pos) && pos > 20;
                case 'low-ctr': return !isNaN(ctr) && ctr < 1 && !isNaN(impressions) && impressions >= 10;
                case 'high-impressions': return !isNaN(impressions) && impressions >= 100;
                case 'has-clicks': return !isNaN(clicks) && clicks > 0;
                case 'no-clicks': return !isNaN(clicks) && clicks === 0;
                case 'questions':
                    const questionWords = ['how', 'what', 'when', 'where', 'why', 'who', 'which', '?', 'vs', 'versus'];
                    const queryLower = item.query?.toLowerCase() || '';
                    return questionWords.some(word => queryLower.includes(word));
                default: return true; // Should not happen if 'all' is handled
            }
        });
    }

    // 2. Apply Basic Search Term Filter (if any) - applied AFTER pill filter
    if (currentSearchTerm) {
        const searchTermLower = currentSearchTerm.toLowerCase();
        resultData = resultData.filter(item => item.query?.toLowerCase().includes(searchTermLower));
    }

    // 3. Apply Query Regex Filter (if valid)
    if (queryRegexObject) {
        try {
            resultData = resultData.filter(item => queryRegexObject.test(item.query || ''));
        } catch (e) {
            console.warn("Regex test failed during filter:", e);
        }
    }

    // 4. Apply Multi-Condition Numerical Filters
    if (filterRules.length > 0) {
        resultData = resultData.filter(item => {
            const results = filterRules.map(rule => {
                let itemValue = null;
                switch (rule.metric) {
                    case 'clicks': itemValue = parseInt(item.clicks); break;
                    case 'impressions': itemValue = parseInt(item.impressions); break;
                    case 'ctr': itemValue = parseFloat(item.ctr) * 100; break; // Use percentage
                    case 'position': itemValue = parseFloat(item.position); break;
                }

                // Treat NaN/null as non-matching for most operators
                if (isNaN(itemValue) || itemValue === null) return false;

                const filterValue = parseFloat(rule.value);
                const filterValueEnd = parseFloat(rule.valueEnd);

                switch (rule.operator) {
                    case '>': return itemValue > filterValue;
                    case '<': return itemValue < filterValue;
                    case '=': return itemValue === filterValue;
                    case '>=': return itemValue >= filterValue;
                    case '<=': return itemValue <= filterValue;
                    case 'between': return itemValue >= filterValue && itemValue <= filterValueEnd;
                    default: return false;
                }
            });

            if (filterLogic === 'AND') {
                return results.every(res => res); // All conditions must be true
            } else { // OR logic
                return results.some(res => res); // At least one condition must be true
            }
        });
    }

    // 5. Apply Multi-Column Sort
    resultData = sortDataAdvanced(resultData, currentSortKeys);

    // Call the provided callback functions to update the UI
    if (refreshDataDisplay) refreshDataDisplay(resultData);
    if (updateMultiSortInfo) updateMultiSortInfo();

    if (currentMetadata) {
        updateStatus(`Showing ${resultData.length} of ${currentQueryData.length} keywords`);
    }

    return resultData;
}

/**
 * Handles search input events for filtering data
 * 
 * @param {Event} event - The input event
 * @param {Function} onSearch - Callback function to handle the search
 * @param {Object} options - Additional options
 * @param {string} options.currentSearchTerm - Reference to the current search term
 */
export function handleSearchInput(event, onSearch, { currentSearchTerm }) {
    const searchTerm = event.target.value;
    if (onSearch) onSearch(searchTerm);
    
    // Save search term to Chrome storage
    chrome.storage.local.set({ 'lastSearchTerm': searchTerm });
}

/**
 * Handles filter pill click events for quick filtering
 * 
 * @param {Event} event - The click event
 * @param {Function} onFilterChange - Callback function to handle the filter change
 */
export function handleFilterPillClick(event, onFilterChange) {
    const filterContainer = event.target.closest('.filter-container');
    if (!filterContainer) return;
    
    // Remove active class from all pills
    filterContainer.querySelectorAll('.filter-pill').forEach(pill => 
        pill.classList.remove('active')
    );
    
    // Add active class to the clicked pill
    event.target.classList.add('active');
    
    // Call the callback to apply filters
    if (onFilterChange) onFilterChange();
}
