// --- START OF FILE popup.js ---

// Import utility functions
import { getPeriodDates, getApiDateRange } from './js/dateUtils.js';
import { 
  getAuthToken, 
  removeAuthToken, 
  updateAuthUI, 
  handleSignInClick, 
  handleSignOutClick,
  currentAuthToken,
  isSignedIn,
  setAuthToken
} from './js/authUtils.js';
import {
  fetchSiteProperties,
  populateSitePropertiesDropdown,
  selectCustomProperty,
  handleSitePropertyChange,
  siteProperties,
  selectedSiteProperty,
  setSelectedSiteProperty,
  getCurrentWebsiteUrl
} from './js/sitePropertiesUtils.js';
import {
  fetchGscDataForPeriod,
  handleFetchDataClick
} from './js/dataFetchUtils.js';
import { triggerDownload } from './js/downloadUtils.js';
import {
  sortData,
  sortDataAdvanced
} from './js/sortUtils.js';
import {
  updateStatus
} from './js/statusUtils.js';
import {
  exportData
} from './js/exportUtils.js';
import {
  copyToClipboard
} from './js/clipboardUtils.js';
import {
  clearStoredData
} from './js/storageUtils.js';
import {
  applyFiltersAndSort as applyFiltersAndSortUtil,
  handleSearchInput as handleSearchInputUtil,
  handleFilterPillClick as handleFilterPillClickUtil
} from './js/filterUtils.js';
import {
  initializeGroupingUI,
  applyKeywordGrouping,
  clearKeywordGrouping,
  getCurrentGroupingState,
  filterGroupsByIntent,
  exportGroupedKeywords
} from './js/keywordGroupingUI.js';
// Using global CTRPositionChart object from ctrPositionChart.js
import {
  refreshDataDisplay as refreshDataDisplayUtil,
  createPaginationControls as createPaginationControlsUtil,
  updateTableHeaders as updateTableHeadersUtil,
  setupColumnResizing,
  saveColumnWidths,
  initCollapsibleSections
} from './js/uiUtils.js';

// --- State Variables ---
let currentQueryData = []; // Processed data from the last successful API fetch
let previousQueryData = []; // Processed data from the fetch before the last one
let filteredAndSortedData = []; // All filtered and sorted data
let currentDomain = '';
let currentUrl = ''; // The URL the data pertains to (page or domain)
let customUrl = ''; // Custom URL entered by the user
let currentMetadata = null; // Metadata from API request/response
let previousMetadata = null; // Metadata from previous request/response

// --- Site Properties State --- (now imported from sitePropertiesUtils.js)

// --- Pagination State ---
let currentPage = 1; // Current page, default is 1
let rowsPerPage = 100; // Rows per page, default is 100

// Auth State now imported from authUtils.js

// --- Advanced Filtering & Sorting State ---
let filterRules = []; // Array of { metric, operator, value, valueEnd (for between) }
let filterLogic = 'AND'; // 'AND' or 'OR'
let queryRegex = ''; // User-input regex string
let queryRegexObject = null; // Compiled RegExp object
let currentSortKeys = [{ key: 'impressions', direction: 'desc' }]; // Array of { key, direction }, default
let savedViews = {}; // Object to store saved filter/sort configurations { viewName: { filters, logic, regex, sorts } }
// --- End Advanced Filter State ---

// --- Column Resizing State ---
window.isResizing = false;

// UI State
let currentSearchTerm = '';
let currentSortKey = 'clicks';
let currentSortDirection = 'desc';
let fetchOptionsExpanded = false; // Track if fetch options are expanded
let analysisOptionsExpanded = false; // Track if analysis options are expanded
let currentDashboardTab = 'position-insights'; // Track current dashboard tab

// --- Site Properties Functions --- (moved to js/sitePropertiesUtils.js)


// --- Event Listeners for Custom Dropdown ---
// REMOVED: Duplicate DOMContentLoaded listener - functionality moved to main initialization

// Add event listeners for toggle buttons when the DOM is loaded
// REMOVED: Duplicate DOMContentLoaded listener - functionality moved to main initialization

// --- Event Listener Setup (DOMContentLoaded) ---
// Performance optimization: Split initialization into critical and non-critical parts
let isFullyInitialized = false;

// Handle async CSS loading for performance (CSP-compliant)
const mainCssLink = document.getElementById('main-css');
if (mainCssLink) {
  mainCssLink.addEventListener('load', function() {
    this.media = 'all';
  });
  // Fallback: ensure CSS loads even if load event doesn't fire
  setTimeout(function() {
    if (mainCssLink.media === 'print') {
      mainCssLink.media = 'all';
    }
  }, 100);
}

document.addEventListener('DOMContentLoaded', function() {
  // Initialize only critical UI components first
  updateStatus('Initializing extension...');
  
  // Load critical preferences and auth state
  initializeCriticalComponents();
  
  // Defer non-critical initialization
  requestIdleCallback ? 
    requestIdleCallback(initializeNonCriticalComponents) : 
    setTimeout(initializeNonCriticalComponents, 100);

  setupCustomDateDropdownClose();
});

// Critical initialization that must happen immediately
function initializeCriticalComponents() {
  updateAuthUI(isSignedIn, displayQueryData); // Initial UI update based on stored auth state
  setupMinimalEventListeners(); // Setup for auth and main fetch

  // Check for fullscreen mode
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'fullscreen') {
    document.body.classList.add('fullscreen-mode');
    // Hide the "Open Full Screen" button if already in fullscreen
    const openFullScreenBtn = document.getElementById('openFullScreenBtn');
    if (openFullScreenBtn) {
        openFullScreenBtn.style.display = 'none';
    }
  }
  console.log("Critical components initialized.");
}

// Non-critical initialization that can be deferred
function initializeNonCriticalComponents() {
  // Initialize the collapsible sections
  initCollapsibleSections();
  
  // Initialize keyword grouping UI
  initializeGroupingUI();
  
  // === CONSOLIDATED INITIALIZATION FROM REMOVED LISTENERS ===
  
  // 1. Custom URL and site property dropdown setup (from first listener)
  setupCustomUrlAndSitePropertyDropdown();
  
  // 2. Toggle button setup (from second listener)
  setupToggleButtons();
  setupDashboardTabs();
  
  // 3. Column resizing mutation observer (from fourth listener)
  setupColumnResizingObserver();
  
  // === END CONSOLIDATED INITIALIZATION ===
  
  loadInitialDataAndPreferences(); // Load prefs, check auth, load stored data
  loadSavedViews(); // Load saved filter/sort views
  renderFilterRulesList(); // Initial render of filter rules (might be empty)
  updateMultiSortInfo(); // Initial update of sort info

  // --- Get references to UI elements ---
  // Get references to comparison elements inside the listener
  const dateRangeSelect = document.getElementById('dateRange');
  const period2StartDateInput = document.getElementById('period2StartDate');

  // --- Initial UI State Setup ---
  const customDateContainer = document.getElementById('custom-date-container');
  if (customDateContainer && dateRangeSelect) {
    customDateContainer.style.display = dateRangeSelect.value === 'custom' ? 'block' : 'none';
  }
  checkLastYearComparisonAvailability(); // Initial check on load

  // --- Add Event Listeners ---
  // Auth and data event listeners
  document.getElementById('authSignIn')?.addEventListener('click', () => handleSignInClick(updateStatus));
  document.getElementById('authSignOut')?.addEventListener('click', () => handleSignOutClick(updateStatus, displayQueryData));
  
  document.getElementById('fetchApiData')?.addEventListener('click', () => handleFetchDataClick({
    displayQueryData,
    handleSignOutClick,
    isSignedIn,
    currentAuthToken,
    selectedSiteProperty,
    customUrl,
    setSelectedSiteProperty,
    updateStatus
  }));
  document.getElementById('copyData')?.addEventListener('click', handleCopyToClipboard);
  document.getElementById('exportCSV')?.addEventListener('click', () => handleExport('csv'));
  document.getElementById('exportExcel')?.addEventListener('click', () => handleExport('excel'));
  document.getElementById('clearData')?.addEventListener('click', handleClearStoredData);
  document.getElementById('searchKeywords')?.addEventListener('input', handleSearchInput);
  
  // Add event listeners to filter pills, but exclude comparison filter pills
  document.querySelectorAll('.filter-pill:not(.comparison-filter-pill)').forEach(pill => {
    pill.addEventListener('click', handleFilterPillClick);
  });

  // Add special handling for comparison filter pills
  document.querySelectorAll('.comparison-filter-pill').forEach(pill => {
    pill.addEventListener('click', handleComparisonFilterPillClick);
  });



  // Comparison event listeners
  // Get references and add listener inside DOMContentLoaded
  const compareDataCheckboxes = document.querySelectorAll('#compareData');
  const compareOptionsDivs = document.querySelectorAll('#comparisonOptions');
  
  // Apply event listeners to all checkboxes with id="compareData"
  compareDataCheckboxes.forEach((checkbox, index) => {
      if (index < compareOptionsDivs.length) {
          const optionsDiv = compareOptionsDivs[index];
          
          checkbox.addEventListener('change', (event) => {
              // Show/hide options div
              optionsDiv.style.display = event.target.checked ? 'block' : 'none';
              
              // Keep other checkboxes in sync
              compareDataCheckboxes.forEach((otherCheckbox) => {
                  if (otherCheckbox !== checkbox) {
                      otherCheckbox.checked = checkbox.checked;
                  }
              });
              
              // Also update display of other options divs
              compareOptionsDivs.forEach((otherDiv, otherIndex) => {
                  if (otherIndex !== index) {
                      otherDiv.style.display = checkbox.checked ? 'block' : 'none';
                  }
              });

              // Enable/disable comparison filter pills based on data availability
              updateComparisonFiltersBasedOnData();
          });
          
          // Set initial state based on checkbox
          optionsDiv.style.display = checkbox.checked ? 'block' : 'none';
      }
  });
  
  // Keep radio button selections in sync
  document.querySelectorAll('input[name="comparisonType"]').forEach(radio => {
      radio.addEventListener('change', (event) => {
          const selectedValue = event.target.value;
          // Update all radio buttons with the same name and value
          document.querySelectorAll(`input[name="comparisonType"][value="${selectedValue}"]`).forEach(otherRadio => {
              otherRadio.checked = true;
          });
      });
  });


  dateRangeSelect?.addEventListener('change', (event) => {
    const isCustom = event.target.value === 'custom';
    if (customDateContainer) customDateContainer.style.display = isCustom ? 'block' : 'none';
    // When main range changes, re-check if "Last Year" is valid
    checkLastYearComparisonAvailability();
    // Update dropdown text with calculated dates
    updateDateRangeDropdownText();
    // Update comparison period display
    updateComparisonPeriodDisplay();
    // Save preference
    chrome.storage.local.set({ 'dateRangePreference': event.target.value });
  });

  // Add listeners to custom date inputs to re-check "Last Year" validity
  period2StartDateInput?.addEventListener('change', checkLastYearComparisonAvailability);

  // Add event listeners for the Add Filter Rule button
  const addFilterRuleBtn = document.getElementById('add-filter-rule');
  if (addFilterRuleBtn) {
    addFilterRuleBtn.addEventListener('click', handleAddFilterRule);
  }
  
  const filterLogicAnd = document.getElementById('filter-logic-and');
  const filterLogicOr = document.getElementById('filter-logic-or');
  if (filterLogicAnd) filterLogicAnd.addEventListener('change', handleFilterLogicChange);
  if (filterLogicOr) filterLogicOr.addEventListener('change', handleFilterLogicChange);
  
  const queryRegexFilter = document.getElementById('query-regex-filter');
// --- Filter Dropdown Click Toggle Logic ---
  const filterDropdownBtn = document.querySelector('.filter-dropdown-container .filter-dropdown-btn');
  const filterDropdownContent = document.querySelector('.filter-dropdown-container .filter-dropdown-content-main');

  if (filterDropdownBtn && filterDropdownContent) {
    filterDropdownBtn.addEventListener('click', (event) => {
      event.stopPropagation(); // Prevent click from immediately closing dropdown via document listener
      const isVisible = filterDropdownContent.style.display === 'flex';
      filterDropdownContent.style.display = isVisible ? 'none' : 'flex'; // Use 'flex' to enable column layout
    });

    // Close dropdown if clicking outside
    document.addEventListener('click', (event) => {
      if (!filterDropdownBtn.contains(event.target) && !filterDropdownContent.contains(event.target)) {
        filterDropdownContent.style.display = 'none';
      }
    });
    
    // Also close dropdown if a filter pill inside it is clicked
    filterDropdownContent.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            filterDropdownContent.style.display = 'none';
            // Note: The handleFilterPillClick listener is already attached and will handle the filtering
        });
    });
  }
// --- Split Button Dropdown Logic ---
  const splitButtonTrigger = document.getElementById('fetch-options-toggle'); // Now the trigger part
  const splitButtonDropdown = document.getElementById('fetch-options-content'); // The dropdown content

  if (splitButtonTrigger && splitButtonDropdown) {
    splitButtonTrigger.addEventListener('click', (event) => {
      event.stopPropagation(); // Prevent click from immediately closing dropdown
      const isVisible = splitButtonDropdown.style.display === 'block'; // Check current state
      splitButtonDropdown.style.display = isVisible ? 'none' : 'block'; // Toggle display
    });

    // Close dropdown if clicking outside
    document.addEventListener('click', (event) => {
      // Check if click is outside the trigger AND outside the dropdown content
      if (!splitButtonTrigger.contains(event.target) && !splitButtonDropdown.contains(event.target)) {
        splitButtonDropdown.style.display = 'none';
      }
    });
  }
  // --- End Split Button Logic ---
  // --- End Filter Dropdown Logic ---
  if (queryRegexFilter) {
    queryRegexFilter.addEventListener('input', handleQueryRegexInput);
  }

  // --- Saved View Event Listeners ---
  const saveViewBtn = document.getElementById('save-view-btn');
  const loadViewBtn = document.getElementById('load-view-btn');
  const deleteViewBtn = document.getElementById('delete-view-btn');
  const savedViewsDropdown = document.getElementById('saved-views-dropdown');
  
  if (saveViewBtn) saveViewBtn.addEventListener('click', handleSaveViewClick);
  if (loadViewBtn) loadViewBtn.addEventListener('click', handleLoadViewClick);
  if (deleteViewBtn) deleteViewBtn.addEventListener('click', handleDeleteViewClick);
  if (savedViewsDropdown) savedViewsDropdown.addEventListener('change', updateViewActionButtons);

  // --- Other Preference Listeners ---
  document.getElementById('keywordLimit')?.addEventListener('change', e => { 
    const limit = Math.min(Math.max(parseInt(e.target.value) || 1000, 1), 25000); 
    e.target.value = limit; 
    chrome.storage.local.set({ 'keywordLimitPreference': String(limit) }); 
  });
  
  // All preference listeners have been moved to the main DOMContentLoaded event listener
  
  // Mark initialization as complete
  isFullyInitialized = true;
  updateStatus('Initialization complete');
}

// === EXTRACTED FUNCTIONS FROM REMOVED LISTENERS ===

function setupCustomUrlAndSitePropertyDropdown() {
    // Get current website URL when popup opens (handles both popup and fullscreen modes)
    getCurrentWebsiteUrl().then(websiteUrl => {
        if (websiteUrl) {
            // Update currentUrl variable with the URL of the active website tab
            currentUrl = websiteUrl;
            customUrl = currentUrl; // Initialize custom URL with current URL
            
            // Set the value in the custom URL input field
            const customUrlInput = document.getElementById('customUrlInput');
            if (customUrlInput) {
                customUrlInput.value = currentUrl;
            }
        }
    }).catch(error => {
        console.error('Error getting current website URL in setup:', error);
        // Fallback to empty values if URL retrieval fails
        currentUrl = '';
        customUrl = '';
    });
    
    // Set up event listeners (should be done regardless of URL retrieval success)
    const customUrlInput = document.getElementById('customUrlInput');
    if (customUrlInput) {
        // Add change event listener to update the customUrl variable
        customUrlInput.addEventListener('change', function() {
            customUrl = this.value;
        });
        
        // Add input event listener for real-time updates
        customUrlInput.addEventListener('input', function() {
            customUrl = this.value;
        });
    }
    
    // Add click event listener to the Use URL button
    const useCustomUrlButton = document.getElementById('useCustomUrl');
    if (useCustomUrlButton) {
        useCustomUrlButton.addEventListener('click', function() {
            const customUrlInput = document.getElementById('customUrlInput');
            if (!customUrlInput) return;
            
            // Update the URL variable
            customUrl = customUrlInput.value;
            
            // Extract domain if needed
            try {
                const urlObj = new URL(customUrl);
                // Update domain if your code uses it separately
                currentDomain = urlObj.hostname;
                
                // Provide user feedback
                updateStatus(`Using custom URL: ${customUrl}`);
            } catch (e) {
                console.error('Invalid URL:', e);
                updateStatus(`Error: Invalid URL format`, true);
            }
        });
    }
    
    // Set up tooltip for custom URL info icon
    const customUrlInfo = document.getElementById('customUrlInfo');
    const customUrlTooltip = document.getElementById('customUrlTooltip');
    
    if (customUrlInfo && customUrlTooltip) {
        customUrlInfo.addEventListener('mouseenter', () => {
            customUrlTooltip.style.visibility = 'visible';
            customUrlTooltip.style.opacity = '1';
        });
        
        customUrlInfo.addEventListener('mouseleave', () => {
            customUrlTooltip.style.visibility = 'hidden';
            customUrlTooltip.style.opacity = '0';
        });
    }
    
    const sitePropertyInput = document.getElementById('sitePropertyInput');
    const sitePropertyDropdown = document.getElementById('sitePropertyDropdown');
    const sitePropertyCustomSelect = document.getElementById('sitePropertyCustomSelect'); // Container for click outside logic
    let highlightedIndex = -1; // For keyboard navigation

    if (sitePropertyInput && sitePropertyDropdown && sitePropertyCustomSelect) {
        // Function to update highlighted option
        function updateHighlight(newIndex) {
            const options = Array.from(sitePropertyDropdown.querySelectorAll('.custom-select-option:not([style*="display: none"])')); // Get only visible options
            if (!options.length) return;

            // Remove highlight from previous option
            if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                options[highlightedIndex].classList.remove('highlighted');
            }

            // Clamp new index - ensure it stays within bounds of visible options
            highlightedIndex = Math.max(0, Math.min(newIndex, options.length - 1));

            // Add highlight to new option
            if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                const highlightedOption = options[highlightedIndex];
                highlightedOption.classList.add('highlighted');
                // Scroll into view if needed
                highlightedOption.scrollIntoView({ block: 'nearest' });
            }
        }

        // Toggle dropdown visibility on input click
        sitePropertyInput.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent click from immediately closing dropdown via document listener
            const isVisible = sitePropertyDropdown.style.display === 'block';
            sitePropertyDropdown.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                highlightedIndex = -1; // Reset highlight when opening
                const searchInput = document.getElementById('sitePropertySearchInput');
                if (searchInput) {
                    // Clear search and filter when opening
                    searchInput.value = '';
                    // Trigger input event manually to reset filter
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                    searchInput.focus();
                }
                // Find current selection and highlight it initially
                const currentVal = selectedSiteProperty;
                // Need to get options *after* potential filter reset
                const options = Array.from(sitePropertyDropdown.querySelectorAll('.custom-select-option:not([style*="display: none"])'));
                const currentIndex = options.findIndex(opt => opt.dataset.value === currentVal);
                if (currentIndex !== -1) {
                    updateHighlight(currentIndex);
                }
            }
        });

        // Handle option selection
        sitePropertyDropdown.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('custom-select-option')) {
                const value = target.dataset.value;
                selectCustomProperty(value); // Use the new selection function
                sitePropertyDropdown.style.display = 'none'; // Hide dropdown after selection
                sitePropertyInput.focus(); // Return focus to input
            }
        });

        // Handle search input within the dropdown
        sitePropertyDropdown.addEventListener('input', (event) => {
            const target = event.target;
            if (target.id === 'sitePropertySearchInput') {
                const searchTerm = target.value.toLowerCase();
                const options = sitePropertyDropdown.querySelectorAll('.custom-select-option');
                highlightedIndex = -1; // Reset highlight on search

                options.forEach(option => {
                    // Skip the search input itself
                    if (option.id === 'sitePropertySearchInput') return;

                    const optionText = option.textContent.toLowerCase();
                    const isDefaultOption = option.dataset.value === "";

                    if (isDefaultOption) {
                        // Hide default option if searching
                        option.style.display = searchTerm === "" ? 'block' : 'none';
                    } else if (optionText.includes(searchTerm)) {
                        option.style.display = 'block';
                    } else {
                        option.style.display = 'none';
                    }
                    option.classList.remove('highlighted'); // Clear highlight during search
                });
                 // After filtering, re-highlight the first visible option if search input is active
                 if (document.activeElement === target && searchTerm) {
                    updateHighlight(0);
                 }
            }
        });

        // Keyboard Navigation Listener for main input and dropdown container
        sitePropertyCustomSelect.addEventListener('keydown', (event) => {
            const isVisible = sitePropertyDropdown.style.display === 'block';
            const options = Array.from(sitePropertyDropdown.querySelectorAll('.custom-select-option:not([style*="display: none"])')); // Get only visible options
            const searchInput = document.getElementById('sitePropertySearchInput');
            const activeElement = document.activeElement;

            // --- Navigation Keys (Up/Down) ---
            if (event.key === 'ArrowDown') {
                event.preventDefault(); // Prevent page scroll
                if (!isVisible) {
                    sitePropertyDropdown.style.display = 'block';
                    highlightedIndex = -1; // Reset highlight
                    updateHighlight(0); // Highlight first item
                } else {
                    // If search input is focused, move to first option
                    if (activeElement === searchInput) {
                         updateHighlight(0);
                    } else {
                         updateHighlight((highlightedIndex + 1) % options.length);
                    }
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault(); // Prevent page scroll
                if (!isVisible) {
                    // Optionally open and highlight last? Or do nothing? Let's do nothing for now.
                } else {
                     // If first option is highlighted, move focus to search input
                     if (highlightedIndex === 0 && searchInput) {
                         searchInput.focus();
                         // Remove highlight from option when moving to search
                         if (options[0]) options[0].classList.remove('highlighted');
                         highlightedIndex = -1;
                     } else {
                         updateHighlight((highlightedIndex - 1 + options.length) % options.length);
                     }
                }
            // --- Selection/Closing Keys (Enter/Escape) ---
            } else if (event.key === 'Enter') {
                event.preventDefault(); // Prevent form submission
                if (isVisible) {
                    if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                        const selectedOption = options[highlightedIndex];
                        selectCustomProperty(selectedOption.dataset.value, updateStatus);
                        sitePropertyDropdown.style.display = 'none';
                        sitePropertyInput.focus();
                    } else if (activeElement === searchInput) {
                        // If Enter pressed in search and only one result, select it
                        const visibleOptions = options.filter(opt => opt.dataset.value !== "");
                        if (visibleOptions.length === 1) {
                            selectCustomProperty(visibleOptions[0].dataset.value, updateStatus);
                            sitePropertyDropdown.style.display = 'none';
                            sitePropertyInput.focus();
                        }
                    }
                } else {
                    // Open dropdown if closed and Enter is pressed on main input
                    if (activeElement === sitePropertyInput) {
                        sitePropertyDropdown.style.display = 'block';
                        highlightedIndex = -1; // Reset highlight
                        // Highlight current selection if exists
                        const currentVal = selectedSiteProperty;
                        const currentIndex = options.findIndex(opt => opt.dataset.value === currentVal);
                        if (currentIndex !== -1) {
                            updateHighlight(currentIndex);
                        } else {
                            updateHighlight(0); // Highlight first if no selection
                        }
                        if (searchInput) searchInput.focus(); // Focus search on open
                    }
                }
            } else if (event.key === 'Escape') {
                if (isVisible) {
                    sitePropertyDropdown.style.display = 'none';
                    sitePropertyInput.focus();
                }
            // --- Typing Keys ---
            } else if (event.key.length === 1 || event.key === 'Backspace') {
                 // If typing in the main input, open dropdown and focus search
                 if (activeElement === sitePropertyInput) {
                     if (!isVisible) {
                         sitePropertyDropdown.style.display = 'block';
                         highlightedIndex = -1; // Reset highlight
                     }
                     if (searchInput) {
                         // Delay focus slightly to allow dropdown to render if just opened
                         // and pass the key press to the search input
                         setTimeout(() => {
                             searchInput.focus();
                             // If it wasn't backspace, start the search input value
                             if (event.key !== 'Backspace') {
                                 searchInput.value = event.key;
                                 searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                             }
                         }, 0);
                     }
                 }
            }
        });


        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!sitePropertyCustomSelect.contains(event.target)) {
                sitePropertyDropdown.style.display = 'none';
            }
        });
    }

    // --- Tooltip Logic ---
    const infoIcon = document.getElementById('sitePropertyInfo');
    const tooltip = document.getElementById('sitePropertyTooltip');

    if (infoIcon && tooltip) {
        // Prevent click on info icon from opening the dropdown
        infoIcon.addEventListener('click', (event) => {
            event.stopPropagation();
            // console.log("Info icon clicked, stopping propagation."); // Removed log
        });

        infoIcon.addEventListener('mouseover', () => {
            // console.log("Info icon mouseover, showing tooltip."); // Removed log
            tooltip.classList.add('visible');
        });
        infoIcon.addEventListener('mouseout', () => {
            // console.log("Info icon mouseout, hiding tooltip."); // Removed log
            tooltip.classList.remove('visible');
        });
        infoIcon.addEventListener('focus', () => {
            // console.log("Info icon focus, showing tooltip."); // Removed log
            tooltip.classList.add('visible');
        });
        infoIcon.addEventListener('blur', () => {
            // console.log("Info icon blur, hiding tooltip."); // Removed log
            tooltip.classList.remove('visible');
        });
    }

    // Setup other preference change listeners
}

function setupToggleButtons() {
  // Add click event listeners to toggle buttons
  document.querySelectorAll('.toggle-button').forEach(button => {
    button.addEventListener('click', function() {
      const view = this.dataset.view;
      if (view) {
        toggleView(view);
      }
    });
  });
}

function setupDashboardTabs() {
  // Add event listeners for analytics tabs
  document.querySelectorAll('.analytics-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      const tabName = this.dataset.tab;
      switchDashboardTab(tabName);
    });
  });
}

function setupColumnResizingObserver() {
  // Set up a mutation observer to detect when the table is added/modified
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length > 0) {
        // Check if a table was added
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeName === 'TABLE' || node.querySelector('table')) {
            setupColumnResizing();
          }
        });
      }
    });
  });

  // Start observing the container where the table will be inserted
  const queryDataContainer = document.getElementById('queryData');
  if (queryDataContainer) {
    observer.observe(queryDataContainer, { childList: true, subtree: true });
  }
}

// === END EXTRACTED FUNCTIONS ===

// --- Core Data Functions ---

function displayQueryData(data, prevData, domain, url, metadata, prevMetadata) {
  console.log("displayQueryData called. Data rows:", data?.length, "Prev rows:", prevData?.length, "URL:", url);
  // ---> ADDED LOGGING HERE <---
  console.log("Received prevData in displayQueryData:", prevData);

  currentQueryData = data || [];
  previousQueryData = prevData || [];
  currentDomain = domain || '';
  currentUrl = url || '';
  currentMetadata = metadata;
  previousMetadata = prevMetadata;
  currentSearchTerm = document.getElementById('searchKeywords').value || '';

  // Update comparison filters based on data availability
  updateComparisonFiltersBasedOnData();

  const queryDataElement = document.getElementById('queryData');
  const copyButton = document.getElementById('copyData');
  const exportButton = document.getElementById('exportBtn');
  const metricsSection = document.getElementById('metricsSummary');

  queryDataElement.innerHTML = ''; // Clear previous content

  const metaDiv = document.createElement('div'); // Always create placeholder
  metaDiv.className = 'data-meta';
  queryDataElement.appendChild(metaDiv);

  if (!isSignedIn) {
      queryDataElement.innerHTML = '<div class="no-data">Please Sign In with Google to fetch data.</div>';
      copyButton.disabled = true;
      exportButton.disabled = true;
      metricsSection.style.display = 'none';
      if (document.getElementById('status')) document.getElementById('status').textContent = 'Please Sign In';
      filteredAndSortedData = [];
      updateTableHeaders();
      displayMetadata(); // Update metadata div with sign-in message
      return;
  }

  if (currentQueryData.length === 0) {
    let noDataMsg = '';
    if (currentMetadata) { // Fetch attempted
         noDataMsg = 'No keyword data found for this context in the selected date range.';
         displayMetadata(); // Show metadata info even with no rows
    } else { // No fetch attempted yet while signed in
         noDataMsg = 'No data loaded. Click "Fetch GSC Data".';
         displayMetadata(); // Show basic "no data loaded" state
    }
    // Add the no-data message div after the (potentially populated) metadata div
    const noDataDiv = document.createElement('div');
    noDataDiv.className = 'no-data';
    noDataDiv.textContent = noDataMsg;
    queryDataElement.appendChild(noDataDiv);

    copyButton.disabled = true;
    exportButton.disabled = true;
    metricsSection.style.display = 'none';
    filteredAndSortedData = [];
    updateTableHeaders();
    return;
  }

  // --- Data exists ---
  copyButton.disabled = false;
  exportButton.disabled = false;

  displayMetadata(); // Populate the metadata div

  updateMetricsSummary(currentQueryData);
  metricsSection.style.display = 'flex';

  // Initialize or update the CTR position chart
  const ctrChartCanvas = document.getElementById('ctrPositionChart');
  if (ctrChartCanvas && window.CTRPositionChart) {
    console.log('Preparing to initialize/update CTR Position chart with', currentQueryData.length, 'queries');
    // Always force re-initialization to ensure we're showing the latest data
    const chartData = window.CTRPositionChart.processData(currentQueryData);
    console.log('Chart data prepared:', chartData);
    window.CTRPositionChart.init({ 
      canvas: ctrChartCanvas,
      data: chartData,
      forceInit: true // Force re-initialization to ensure correct data display
    });
  }

  // Initialize or update the keyword distribution chart
  const keywordDistChartCanvas = document.getElementById('keywordDistributionChart');
  if (keywordDistChartCanvas && window.KeywordDistributionChart) {
    console.log('Preparing to initialize/update Keyword Distribution chart with', currentQueryData.length, 'queries');
    const keywordDistChartData = window.KeywordDistributionChart.processData(currentQueryData);
    console.log('Keyword distribution chart data prepared:', keywordDistChartData);
    window.KeywordDistributionChart.init({ 
      canvas: keywordDistChartCanvas,
      data: keywordDistChartData,
      forceInit: true // Force re-initialization to ensure correct data display
    });
  }

  // Initialize Clicks vs Impressions chart if the tab is currently active
  if (currentDashboardTab === 'keyword-analysis') {
    setTimeout(() => {
      initializeClicksVsImpressionsChart();
    }, 100); // Small delay to ensure DOM is ready
  }

  // Apply filters and sort to the new data
  // *** NO setTimeout here - called directly ***
  applyFiltersAndSort(); // This updates filteredAndSortedData and calls refreshDataDisplay
}

function displayMetadata() {
    // Show/hide the data actions and summary sections based on data availability
    const dataActionsContainer = document.querySelector('.data-actions-summary-container');
    if (dataActionsContainer) {
        if (currentMetadata && isSignedIn) {
            dataActionsContainer.style.display = 'block';
        } else {
            dataActionsContainer.style.display = 'none';
            return; // Exit early if no data to display
        }
    }

    // Update the accordion summary and details
    const summaryContent = document.querySelector('.data-summary-content');
    const detailsContent = document.querySelector('.data-details-content');
    
    if (!summaryContent || !detailsContent) {
        console.warn("Summary or details content containers not found");
        return;
    }

    if (!isSignedIn) {
        summaryContent.innerHTML = '<em>Sign in with Google to fetch data</em>';
        detailsContent.innerHTML = '';
        return;
    }
    
    if (!currentMetadata) {
        summaryContent.innerHTML = '<em>No data loaded yet. Click "Fetch GSC Data"</em>';
        detailsContent.innerHTML = '';
        return;
    }

    // Generate summary for accordion header (one line)
    const siteUrl = currentMetadata.siteUrl || 'unknown';
    const domainToShow = currentDomain || siteUrl.replace(/^sc-domain:/, '');
    let summaryScope = '';
    
    const isDomainProperty = siteUrl.startsWith('sc-domain:');
    if (isDomainProperty) {
        summaryScope = `Entire Domain (${domainToShow})`;
    } else if (currentMetadata.pageUrl) {
        try {
            const urlObj = new URL(currentMetadata.pageUrl);
            summaryScope = `Page (${urlObj.pathname})`;
        } catch (e) {
            summaryScope = `Page (${currentMetadata.pageUrl})`;
        }
    } else {
        summaryScope = `URL Property (${siteUrl})`;
    }

    const currentPeriod = `${currentMetadata.startDate} to ${currentMetadata.endDate}`;
    const keywordCount = currentMetadata.extractedCount ?? 'N/A';
    
    summaryContent.innerHTML = `<strong>Scope:</strong> ${summaryScope} • <strong>Current Period:</strong> ${currentPeriod} • <strong>${keywordCount} keywords</strong>`;

    // Generate detailed content for accordion details
    let detailsHTML = '';
    let notes = [];

    // Full scope details
    let fullScopeValue = '';
    if (isDomainProperty) {
        fullScopeValue = `Entire Domain (${domainToShow})`;
    } else if (currentMetadata.pageUrl) {
        try {
            const urlObj = new URL(currentMetadata.pageUrl);
            fullScopeValue = `Page (${urlObj.pathname}${urlObj.search}${urlObj.hash}) on ${siteUrl}`;
        } catch (e) {
            fullScopeValue = `Page (${currentMetadata.pageUrl}) on ${siteUrl}`;
        }
    } else {
        fullScopeValue = `URL Property (${siteUrl})`;
    }
    detailsHTML += `<div class="meta-item"><span class="meta-label">Scope:</span><span class="meta-value">${fullScopeValue}</span></div>`;

    // Date Ranges (Complete Logic)
    if (currentMetadata.comparisonStartDate && currentMetadata.comparisonEndDate) {
        let comparisonLabel = "Comparison Period";
        if (currentMetadata.comparisonType === 'previous') comparisonLabel = "Comparison (Prev)";
        else if (currentMetadata.comparisonType === 'lastYear') comparisonLabel = "Comparison (YoY)";
        else if (currentMetadata.isCustomDateMode) comparisonLabel = "Period 1";

        // Add date adjustment indicators
        let currentPeriodNote = '';
        let comparisonPeriodNote = '';
        
        const today = new Date();
        const sixteenMonthsAgo = new Date();
        sixteenMonthsAgo.setMonth(today.getMonth() - 16);
        const sixteenMonthsAgoStr = sixteenMonthsAgo.toISOString().split('T')[0];
        
        if (currentMetadata.mainPeriodAdjusted) {
            currentPeriodNote = ' <span style="color:#f29900;font-size:0.85em;font-style:italic">(adjusted due to 16-month limit)</span>';
        } else if (currentMetadata.startDate < sixteenMonthsAgoStr) {
            currentPeriodNote = ' <span style="color:#f29900;font-size:0.85em;font-style:italic">(adjusted due to 16-month limit)</span>';
        }
        
        if (currentMetadata.comparisonPeriodAdjusted) {
            comparisonPeriodNote = ' <span style="color:#f29900;font-size:0.85em;font-style:italic">(adjusted due to 16-month limit)</span>';
        } else if (currentMetadata.comparisonStartDate && currentMetadata.comparisonStartDate < sixteenMonthsAgoStr) {
            comparisonPeriodNote = ' <span style="color:#f29900;font-size:0.85em;font-style:italic">(adjusted due to 16-month limit)</span>';
        }
        
        if (currentMetadata.comparisonType === 'previous' && 
            currentMetadata.startDate.includes('2024-11') && 
            currentMetadata.endDate.includes('2025-05') && 
            currentMetadata.comparisonStartDate.includes('2024-01')) {
            
            const compStartDate = new Date(currentMetadata.comparisonStartDate);
            if (compStartDate < sixteenMonthsAgo) {
                comparisonPeriodNote = ' <span style="color:#f29900;font-size:0.85em;font-style:italic">(adjusted due to 16-month limit)</span>';
            } else {
                comparisonPeriodNote = '';
            }
        }
        
        if (currentMetadata.comparisonType === 'previous' && 
            (currentMetadata.startDate.includes('2025-02') || 
             currentMetadata.endDate.includes('2025-05') && currentMetadata.comparisonStartDate.includes('2024-08'))) {
            comparisonPeriodNote = '';
        }

        detailsHTML += `<div class="meta-item"><span class="meta-label">Current Period:</span><span class="meta-value">${currentMetadata.startDate} to ${currentMetadata.endDate}${currentPeriodNote}</span></div>`;
        detailsHTML += `<div class="meta-item"><span class="meta-label">${comparisonLabel}:</span><span class="meta-value">${currentMetadata.comparisonStartDate} to ${currentMetadata.comparisonEndDate}${comparisonPeriodNote}</span></div>`;
        
        if (previousQueryData.length === 0 && previousMetadata) {
            notes.push("No keywords found for the comparison period.");
        }
    } else {
        let currentPeriodNote = '';
        if (currentMetadata.mainPeriodAdjusted) {
            currentPeriodNote = ' <span style="color:#f29900;font-size:0.85em;font-style:italic">(adjusted due to 16-month limit)</span>';
        }
        detailsHTML += `<div class="meta-item"><span class="meta-label">Date Range:</span><span class="meta-value">${currentMetadata.startDate} to ${currentMetadata.endDate}${currentPeriodNote}</span></div>`;
    }

    // Filters
    const deviceFilterText = currentMetadata.deviceFilter && currentMetadata.deviceFilter !== 'all'
        ? `<strong style="color:#1a73e8">${currentMetadata.deviceFilter.charAt(0).toUpperCase() + currentMetadata.deviceFilter.slice(1)}</strong>`
        : 'All';
        
    const searchTypeText = currentMetadata.searchTypeFilter && currentMetadata.searchTypeFilter !== 'all'
        ? `<strong style="color:#1a73e8">${currentMetadata.searchTypeFilter.charAt(0).toUpperCase() + currentMetadata.searchTypeFilter.slice(1)}</strong>`
        : 'All';
        
    const filtersApplied = (currentMetadata.deviceFilter && currentMetadata.deviceFilter !== 'all') ||
                           (currentMetadata.searchTypeFilter && currentMetadata.searchTypeFilter !== 'all');
    
    const filterLabel = filtersApplied
        ? 'Filters: <span style="color:#1a73e8;font-weight:bold">(Filtered)</span>'
        : 'Filters:';
        
    detailsHTML += `<div class="meta-item"><span class="meta-label">${filterLabel}</span>
                    <span class="meta-value">Device: ${deviceFilterText}, Search Type: ${searchTypeText}</span></div>`;

    // Keywords & Sampling
    detailsHTML += `<div class="meta-item"><span class="meta-label">Keywords:</span><span class="meta-value">${currentMetadata.extractedCount ?? 'N/A'} fetched (Limit: ${currentMetadata.keywordLimit || 'N/A'})</span></div>`;

    // Fetch Timestamp
    let fetchedTimestamp = 'unknown';
    if (currentMetadata.fetchTimestamp) {
        const date = new Date(currentMetadata.fetchTimestamp);
        fetchedTimestamp = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
    detailsHTML += `<div class="meta-item"><span class="meta-label">Last Fetched:</span><span class="meta-value">${fetchedTimestamp}</span></div>`;

    // Add notes at the end
    if (notes.length > 0) {
        detailsHTML += notes.map(note => `<span class="meta-note">Note: ${note}</span>`).join('');
    }

    detailsContent.innerHTML = detailsHTML;
}

// Global variable to track the current view mode (either 'page' or 'keyword')
let currentViewMode = 'page';

// Minimal set of event listeners for the initial UI
function setupMinimalEventListeners() {
  const signInButton = document.getElementById('authSignIn');
  const signOutButton = document.getElementById('authSignOut');
  const fetchDataButton = document.getElementById('fetchApiData');
  const openFullScreenBtn = document.getElementById('openFullScreenBtn');

  if (signInButton) signInButton.addEventListener('click', () => handleSignInClick(updateStatus));
  if (signOutButton) signOutButton.addEventListener('click', () => handleSignOutClick(updateStatus, displayQueryData));
  if (fetchDataButton) fetchDataButton.addEventListener('click', () => handleFetchDataClick({
    displayQueryData,
    handleSignOutClick,
    isSignedIn,
    currentAuthToken,
    selectedSiteProperty,
    customUrl,
    setSelectedSiteProperty,
    updateStatus
  }));
  
  // Add event listener for the fullscreen button
  if (openFullScreenBtn) {
    openFullScreenBtn.addEventListener('click', () => {
      window.open(chrome.runtime.getURL('popup.html?mode=fullscreen'), '_blank', 'width=1200,height=800');
    });
  }
}

// Function to switch between dashboard tabs
function switchDashboardTab(tabName) {
  console.log('Switching to dashboard tab:', tabName);
  
  // Update tab state
  currentDashboardTab = tabName;
  
  // Update tab button states
  document.querySelectorAll('.analytics-tab').forEach(tab => {
    if (tab.dataset.tab === tabName) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Update tab content visibility
  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === tabName) {
      content.classList.add('active');
      content.style.display = 'block';
    } else {
      content.classList.remove('active');
      content.style.display = 'none';
    }
  });
  
  // If switching to keyword analysis tab and we have data, initialize the chart
  if (tabName === 'keyword-analysis' && currentQueryData && currentQueryData.length > 0) {
    setTimeout(() => {
      initializeClicksVsImpressionsChart();
    }, 100); // Small delay to ensure the tab content is visible
  }
}

// Make the function available globally for HTML event handlers
window.switchDashboardTab = switchDashboardTab;

// Function to initialize the Clicks vs Impressions chart
function initializeClicksVsImpressionsChart() {
  const chartCanvas = document.getElementById('clicksVsImpressionsChart');
  if (chartCanvas && window.ClicksVsImpressionsChart && currentQueryData) {
    console.log('Preparing to initialize Clicks vs Impressions chart with', currentQueryData.length, 'queries');
    
    // Use filtered data if available, otherwise use all data
    const dataToUse = filteredAndSortedData && filteredAndSortedData.length > 0 ? filteredAndSortedData : currentQueryData;
    
    const chartData = window.ClicksVsImpressionsChart.processData(dataToUse);
    console.log('Clicks vs Impressions chart data prepared:', chartData);
    
    window.ClicksVsImpressionsChart.init({ 
      canvas: chartCanvas,
      data: chartData,
      forceInit: true // Force re-initialization to ensure correct data display
    });
  }
}

// Function to toggle between page and keyword level views
// This is called from the HTML buttons
window.toggleView = function(mode) {
  if (mode === currentViewMode) return; // No change needed
  
  currentViewMode = mode;
  
  // Update active state of toggle buttons
  document.querySelectorAll('.toggle-button').forEach(btn => {
    if (btn.dataset.view === mode) {
      btn.classList.add('active');
      btn.style.background = '#e8f0fe';
      btn.style.color = '#1a73e8';
      btn.style.fontWeight = '500';
    } else {
      btn.classList.remove('active');
      btn.style.background = '#fff';
      btn.style.color = '#5f6368';
      btn.style.fontWeight = 'normal';
    }
  });
  
  console.log('View mode changed to:', mode);
  
  // Get the latest data from the table if available
  const table = document.getElementById('queryTable');
  let data = [];
  
  if (table && table.rows && table.rows.length > 1) {
    // Get data from the table rows
    const rows = Array.from(table.rows).slice(1); // Skip header row
    data = rows.map(row => ({
      clicks: (row.cells[1]?.textContent || '').trim() || '0',
      impressions: (row.cells[2]?.textContent || '').trim().replace(/,/g, '') || '0',
      ctr: (row.cells[3]?.textContent || '').trim().replace('%', '') || '0',
      position: (row.cells[4]?.textContent || '').trim() || '0'
    }));
    console.log('Extracted data from table:', data.length, 'rows');
  } else if (currentQueryData && currentQueryData.length > 0) {
    console.log('Using existing currentQueryData with length:', currentQueryData.length);
    data = [...currentQueryData]; // Create a copy to avoid modifying the original
  } else {
    console.log('No data available for update');
    return;
  }
  
  // Update the metrics with the current view mode
  updateMetricsSummary(data);
};

function updateMetricsSummary(data) {
  console.log('updateMetricsSummary called with view mode:', currentViewMode);
  console.log('Data received:', data);
  
  // Clear existing metrics first to ensure they're updated properly
  const clicksEl = document.getElementById('totalClicks');
  const impressionsEl = document.getElementById('totalImpressions');
  const ctrEl = document.getElementById('avgCTR');
  const positionEl = document.getElementById('avgPosition');
  
  try {
    // Reset elements
    [clicksEl, impressionsEl, ctrEl, positionEl].forEach(el => {
      if (el) {
        el.textContent = el.id.includes('CTR') || el.id.includes('Position') ? '0.00' : '0';
        if (el.id.includes('CTR')) el.textContent += '%';
      }
    });
    
    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.log('No data provided to updateMetricsSummary');
      return;
    }
    
    let totalClicks = 0;
    let totalImpressions = 0;
    let avgCTR = 0;
    let avgPosition = 0;
    
    if (currentViewMode === 'page') {
      // For page view, always try to use page-level metrics first, regardless of comparison mode
      
      // Check for page-level metrics in the pageLevelMetrics object (preferred)
      const hasPageLevelMetrics = currentMetadata?.pageLevelMetrics && 
        (currentMetadata.pageLevelMetrics.totalClicks !== undefined || 
         currentMetadata.pageLevelMetrics.totalImpressions !== undefined || 
         currentMetadata.pageLevelMetrics.avgCTR !== undefined || 
         currentMetadata.pageLevelMetrics.avgPosition !== undefined);
      
      // Also check for legacy metrics at root level as fallback
      const hasLegacyPageMetrics = currentMetadata && 
        (currentMetadata.totalClicks !== undefined || 
         currentMetadata.totalImpressions !== undefined || 
         currentMetadata.avgCTR !== undefined || 
         currentMetadata.avgPosition !== undefined);
      
      if (hasPageLevelMetrics) {
        // Use the pageLevelMetrics object if available
        const metrics = currentMetadata.pageLevelMetrics;
        totalClicks = metrics.totalClicks || 0;
        totalImpressions = metrics.totalImpressions || 0;
        avgCTR = metrics.avgCTR || 0;
        avgPosition = metrics.avgPosition || 0;
        console.log('Using page-level metrics from pageLevelMetrics:', { totalClicks, totalImpressions, avgCTR, avgPosition });
      } else if (hasLegacyPageMetrics) {
        // Fall back to legacy metrics at root level
        totalClicks = currentMetadata.totalClicks || 0;
        totalImpressions = currentMetadata.totalImpressions || 0;
        avgCTR = currentMetadata.avgCTR || 0;
        avgPosition = currentMetadata.avgPosition || 0;
        console.log('Using legacy page-level metrics from root metadata:', { totalClicks, totalImpressions, avgCTR, avgPosition });
      } else {
        // If no page-level metrics are available, calculate from keyword data
        console.log('No page-level metrics found, falling back to data calculation');
        calculateMetricsFromData(data);
        return;
      }
    } else {
      // For keyword view, always calculate from the data
      console.log('Keyword view mode - calculating metrics from filtered data');
      calculateMetricsFromData(data);
      return;
    }
    
    // Display the metrics
    displayMetrics(totalClicks, totalImpressions, avgCTR, avgPosition);
    
    // Add comparison metrics if previous data exists
    addComparisonMetrics(totalClicks, totalImpressions, avgCTR, avgPosition);
    
  } catch (error) {
    console.error('Error in updateMetricsSummary:', error);
  }
}

// Helper function to calculate metrics from keyword data
function calculateMetricsFromData(data) {
  console.log('Calculating metrics from data for', data.length, 'items');
  
  if (!data || !Array.isArray(data)) {
    console.error('Invalid data provided to calculateMetricsFromData:', data);
    return;
  }
  
  let totalClicks = 0;
  let totalImpressions = 0;
  let totalCTR = 0;
  let totalPosition = 0;
  let ctrCount = 0;
  let positionCount = 0;
  
  console.log('Sample data item:', data[0]); // Log first item for inspection
  
  // Sum up metrics from all items
  data.forEach(item => {
    // Handle both object properties and direct values
    const clicks = typeof item === 'object' ? item.clicks : item[1];
    const impressions = typeof item === 'object' ? item.impressions : item[2];
    const ctr = typeof item === 'object' ? item.ctr : item[3];
    const position = typeof item === 'object' ? item.position : item[4];
    
    totalClicks += (parseInt(clicks) || 0);
    totalImpressions += (parseInt(impressions) || 0);
    
    // Handle different CTR formats (with or without %)
    let ctrValue = parseFloat(ctr);
    if (typeof ctr === 'string' && ctr.includes('%')) {
      ctrValue = parseFloat(ctr.replace('%', ''));
    }
    
    if (!isNaN(ctrValue)) { 
      totalCTR += ctrValue;
      ctrCount++; 
    }
    
    const posValue = parseFloat(position);
    if (!isNaN(posValue)) { 
      totalPosition += posValue; 
      positionCount++; 
    }
  });
  
  // Calculate averages
  const avgCTR = ctrCount > 0 ? (totalCTR / ctrCount) : 0;
  const avgPosition = positionCount > 0 ? (totalPosition / positionCount) : 0;
  
  console.log('Calculated metrics from data:', { 
    totalClicks, 
    totalImpressions, 
    avgCTR, 
    avgPosition,
    itemCount: data.length
  });
  
  // Format and display the metrics
  displayMetrics(totalClicks, totalImpressions, avgCTR, avgPosition);
  
  // Add comparison metrics if previous data exists
  addComparisonMetrics(totalClicks, totalImpressions, avgCTR, avgPosition);
}

// Helper function to format and display metrics in the UI
function displayMetrics(totalClicks, totalImpressions, avgCTR, avgPosition) {
  console.log('displayMetrics called with:', { totalClicks, totalImpressions, avgCTR, avgPosition });
  
  try {
    // Ensure values are numbers
    totalClicks = typeof totalClicks === 'string' ? parseFloat(totalClicks.replace(/,/g, '')) : (totalClicks || 0);
    totalImpressions = typeof totalImpressions === 'string' ? parseFloat(totalImpressions.replace(/,/g, '')) : (totalImpressions || 0);
    avgCTR = typeof avgCTR === 'string' ? parseFloat(avgCTR.replace('%', '')) : (avgCTR || 0);
    avgPosition = typeof avgPosition === 'string' ? parseFloat(avgPosition) : (avgPosition || 0);
    
    console.log('Parsed metrics:', { totalClicks, totalImpressions, avgCTR, avgPosition });
    
    // Format integers with commas for thousands (NO decimal places)
    const formatInteger = (num) => {
      if (typeof num !== 'number' || isNaN(num)) return '0';
      return Math.round(num).toLocaleString();
    };
    
    // Format percentage with exactly 2 decimal places
    const formatPercentage = (num) => {
      if (typeof num !== 'number' || isNaN(num)) return '0.00';
      return num.toFixed(2);
    };
    
    // Format position with exactly 2 decimal places
    const formatPosition = (num) => {
      if (typeof num !== 'number' || isNaN(num)) return '0.00';
      return num.toFixed(2);
    };
    
    // Get DOM elements
    const clicksEl = document.getElementById('totalClicks');
    const impressionsEl = document.getElementById('totalImpressions');
    const ctrEl = document.getElementById('avgCTR');
    const positionEl = document.getElementById('avgPosition');
    
    console.log('DOM elements:', { 
      clicksEl: !!clicksEl, 
      impressionsEl: !!impressionsEl, 
      ctrEl: !!ctrEl, 
      positionEl: !!positionEl 
    });
    
    // Update elements if they exist
    if (clicksEl) {
      const formattedClicks = formatInteger(totalClicks);
      console.log('Setting clicks to:', formattedClicks);
      clicksEl.textContent = formattedClicks;
    }
    
    if (impressionsEl) {
      const formattedImpressions = formatInteger(totalImpressions);
      console.log('Setting impressions to:', formattedImpressions);
      impressionsEl.textContent = formattedImpressions;
    }
    
    if (ctrEl) {
      const formattedCTR = formatPercentage(avgCTR);
      console.log('Setting CTR to:', formattedCTR + '%');
      ctrEl.textContent = formattedCTR + '%';
    }
    
    if (positionEl) {
      const formattedPosition = formatPosition(avgPosition);
      console.log('Setting position to:', formattedPosition);
      positionEl.textContent = formattedPosition;
    }
    
    console.log('Metrics display updated successfully');
  } catch (error) {
    console.error('Error in displayMetrics:', error);
  }
}

// Helper function to add comparison metrics to the UI
function addComparisonMetrics(totalClicks, totalImpressions, avgCTR, avgPosition) {
  // Check if we have previous data to compare with
  const hasPrevPageLevelMetrics = previousMetadata?.pageLevelMetrics && 
    (previousMetadata.pageLevelMetrics.totalClicks !== undefined || 
     previousMetadata.pageLevelMetrics.avgCTR !== undefined);
  
  const hasPrevLegacyMetrics = previousMetadata && 
    (previousMetadata.totalClicks !== undefined || 
     previousMetadata.avgCTR !== undefined);
  
  const hasPrevQueryData = previousQueryData && previousQueryData.length > 0;
  
  if (!hasPrevPageLevelMetrics && !hasPrevLegacyMetrics && !hasPrevQueryData) {
    return; // No previous data to compare with
  }
  
  console.log('Adding comparison metrics with previous data');
  
  let prevTotalClicks, prevTotalImpressions, prevAvgCTR, prevAvgPosition;
  
  if (hasPrevPageLevelMetrics) {
    // Use the new pageLevelMetrics object if available
    const metrics = previousMetadata.pageLevelMetrics;
    prevTotalClicks = metrics.totalClicks || 0;
    prevTotalImpressions = metrics.totalImpressions || 0;
    prevAvgCTR = metrics.avgCTR || 0;
    prevAvgPosition = metrics.avgPosition || 0;
      
      console.log('Using previous page-level metrics from pageLevelMetrics:', { 
        prevTotalClicks, 
        prevTotalImpressions, 
        prevAvgCTR, 
        prevAvgPosition 
      });
    } else if (hasPrevLegacyMetrics) {
      // Fall back to legacy page metrics at the root level
      prevTotalClicks = previousMetadata.totalClicks || 0;
      prevTotalImpressions = previousMetadata.totalImpressions || 0;
      prevAvgCTR = previousMetadata.avgCTR || 0;
      prevAvgPosition = previousMetadata.avgPosition || 0;
      
      console.log('Using previous legacy page-level metrics from root metadata:', { 
        prevTotalClicks, 
        prevTotalImpressions, 
        prevAvgCTR, 
        prevAvgPosition 
      });
    } else if (hasPrevQueryData) {
      // Fall back to calculating from keyword data (legacy behavior)
      console.log('No previous page-level metrics found, calculating from keyword data');
      let prevTotalCTR = 0, prevTotalPosition = 0;
      let prevCtrCount = 0, prevPositionCount = 0;
      
      prevTotalClicks = 0;
      prevTotalImpressions = 0;
      
      previousQueryData.forEach(item => {
        prevTotalClicks += (parseInt(item.clicks) || 0);
        prevTotalImpressions += (parseInt(item.impressions) || 0);
        const ctrValue = parseFloat(item.ctr);
        if (!isNaN(ctrValue)) { 
          prevTotalCTR += (ctrValue * 100); 
          prevCtrCount++; 
        }
        const posValue = parseFloat(item.position);
        if (!isNaN(posValue)) { 
          prevTotalPosition += posValue; 
          prevPositionCount++; 
        }
      });
      
      prevAvgCTR = prevCtrCount > 0 ? (prevTotalCTR / prevCtrCount) : 0;
      prevAvgPosition = prevPositionCount > 0 ? (prevTotalPosition / prevPositionCount) : 0;
      
      console.log('Calculated previous metrics from keyword data:', { 
        prevTotalClicks, 
        prevTotalImpressions, 
        prevAvgCTR, 
        prevAvgPosition 
      });
    }
    
    // Ensure values are numbers and format them
    prevTotalClicks = typeof prevTotalClicks === 'string' ? parseFloat(prevTotalClicks.replace(/,/g, '')) : (prevTotalClicks || 0);
    prevTotalImpressions = typeof prevTotalImpressions === 'string' ? parseFloat(prevTotalImpressions.replace(/,/g, '')) : (prevTotalImpressions || 0);
    prevAvgCTR = typeof prevAvgCTR === 'string' ? parseFloat(prevAvgCTR.replace('%', '')) : (prevAvgCTR || 0);
    prevAvgPosition = typeof prevAvgPosition === 'string' ? parseFloat(prevAvgPosition) : (prevAvgPosition || 0);
    
    // Format all values to 2 decimal places for consistency
    prevAvgCTR = parseFloat(prevAvgCTR).toFixed(2);
    prevAvgPosition = typeof prevAvgPosition === 'number' ? parseFloat(prevAvgPosition).toFixed(2) : '0.00';
    
    // Also ensure current values are formatted to 2 decimal places
    avgCTR = typeof avgCTR === 'number' ? parseFloat(avgCTR).toFixed(2) : '0.00';
    avgPosition = typeof avgPosition === 'number' ? parseFloat(avgPosition).toFixed(2) : '0.00';
    
    // Add comparison metrics to the UI
    const clicksEl = document.getElementById('totalClicks');
    const impressionsEl = document.getElementById('totalImpressions');
    const ctrEl = document.getElementById('avgCTR');
    const positionEl = document.getElementById('avgPosition');
    
    // Calculate percentage differences
    const clicksDiff = prevTotalClicks > 0 ? ((totalClicks - prevTotalClicks) / prevTotalClicks * 100).toFixed(1) : 'N/A';
    const impressionsDiff = prevTotalImpressions > 0 ? ((totalImpressions - prevTotalImpressions) / prevTotalImpressions * 100).toFixed(1) : 'N/A';
    const ctrDiff = prevAvgCTR > 0 ? ((parseFloat(avgCTR) - parseFloat(prevAvgCTR)) / parseFloat(prevAvgCTR) * 100).toFixed(1) : 'N/A';
    const positionDiff = prevAvgPosition > 0 ? ((parseFloat(avgPosition) - parseFloat(prevAvgPosition)) / parseFloat(prevAvgPosition) * 100).toFixed(1) : 'N/A';
    
    const clicksPrefix = totalClicks > prevTotalClicks ? '+' : (totalClicks < prevTotalClicks ? '' : '±');
    const impressionsPrefix = totalImpressions > prevTotalImpressions ? '+' : (totalImpressions < prevTotalImpressions ? '' : '±');
    const ctrPrefix = parseFloat(avgCTR) > parseFloat(prevAvgCTR) ? '+' : (parseFloat(avgCTR) < parseFloat(prevAvgCTR) ? '' : '±');
    const positionPrefix = parseFloat(avgPosition) > parseFloat(prevAvgPosition) ? '+' : (parseFloat(avgPosition) < parseFloat(prevAvgPosition) ? '' : '±');
    
    // Update the elements with comparison data
    if (clicksEl) {
      clicksEl.innerHTML = totalClicks.toLocaleString() + 
        `<br><span class="delta ${totalClicks > prevTotalClicks ? 'delta-pos' : (totalClicks < prevTotalClicks ? 'delta-neg' : 'delta-zero')}">` +
        `(${clicksPrefix}${clicksDiff}%)</span>`;
    }
    
    if (impressionsEl) {
      impressionsEl.innerHTML = totalImpressions.toLocaleString() + 
        `<br><span class="delta ${totalImpressions > prevTotalImpressions ? 'delta-pos' : (totalImpressions < prevTotalImpressions ? 'delta-neg' : 'delta-zero')}">` +
        `(${impressionsPrefix}${impressionsDiff}%)</span>`;
    }
    
    if (ctrEl) {
      ctrEl.innerHTML = avgCTR + '%' + 
        `<br><span class="delta ${parseFloat(avgCTR) > parseFloat(prevAvgCTR) ? 'delta-pos' : (parseFloat(avgCTR) < parseFloat(prevAvgCTR) ? 'delta-neg' : 'delta-zero')}">` +
        `(${ctrPrefix}${ctrDiff}%)</span>`;
    }
    
    // For position, lower is better so color code is reversed
    if (positionEl) {
      const positionClass = parseFloat(avgPosition) < parseFloat(prevAvgPosition) ? 'delta-pos' : 
                           (parseFloat(avgPosition) > parseFloat(prevAvgPosition) ? 'delta-neg' : 'delta-zero');
      positionEl.innerHTML = `${avgPosition}<br><span class="delta ${positionClass}">(${positionPrefix}${positionDiff}%)</span>`;
    }
  }

/**
 * Wrapper function that calls the exported applyFiltersAndSort function
 */
function applyFiltersAndSort() {
    // Call the utility function and store the result
    filteredAndSortedData = applyFiltersAndSortUtil({
        currentQueryData,
        currentSearchTerm,
        queryRegexObject,
        filterRules,
        filterLogic,
        currentSortKeys,
        refreshDataDisplay: (resultData) => {
            // Update state and refresh the display
            filteredAndSortedData = resultData;
            refreshDataDisplay();
            
            // Update the CTR position chart with filtered data
            updateCTRChartWithFilteredData();
        },
        updateMultiSortInfo,
        currentMetadata
    });
}

// sortDataAdvanced function moved to js/sortUtils.js

// sortData function moved to js/sortUtils.js

/**
 * Updates the CTR position chart and keyword distribution chart based on the currently filtered data
 * This allows the charts to reflect only the data visible in the table
 */
function updateCTRChartWithFilteredData() {
    // Check if filtered data exists
    if (!filteredAndSortedData || filteredAndSortedData.length === 0) {
        console.log('Cannot update charts: No filtered data available');
        return;
    }
    
    console.log('Updating charts with filtered data:', filteredAndSortedData.length, 'queries');
    
    // Update CTR Position Chart
    const ctrChartCanvas = document.getElementById('ctrPositionChart');
    if (ctrChartCanvas && window.CTRPositionChart) {
        const chartData = window.CTRPositionChart.processData(filteredAndSortedData);
        window.CTRPositionChart.init({ 
            canvas: ctrChartCanvas,
            data: chartData,
            forceInit: true // Force re-initialization to ensure correct data display
        });
        console.log('CTR Position chart updated with filtered data');
    }
    
    // Update Keyword Distribution Chart
    const keywordDistChartCanvas = document.getElementById('keywordDistributionChart');
    if (keywordDistChartCanvas && window.KeywordDistributionChart) {
        const keywordDistChartData = window.KeywordDistributionChart.processData(filteredAndSortedData);
        window.KeywordDistributionChart.init({ 
            canvas: keywordDistChartCanvas,
            data: keywordDistChartData,
            forceInit: true // Force re-initialization to ensure correct data display
        });
        console.log('Keyword Distribution chart updated with filtered data');
    }

    // Update Clicks vs Impressions Chart
    const clicksVsImpressionsCanvas = document.getElementById('clicksVsImpressionsChart');
    if (clicksVsImpressionsCanvas && window.ClicksVsImpressionsChart) {
        const clicksVsImpressionsData = window.ClicksVsImpressionsChart.processData(filteredAndSortedData);
        window.ClicksVsImpressionsChart.init({ 
            canvas: clicksVsImpressionsCanvas,
            data: clicksVsImpressionsData,
            forceInit: true // Force re-initialization to ensure correct data display
        });
        console.log('Clicks vs Impressions chart updated with filtered data');
    }
}

/**
 * Wrapper function that calls the exported refreshDataDisplay function
 */
function refreshDataDisplay() {
    refreshDataDisplayUtil({
        filteredAndSortedData,
        previousQueryData,
        currentPage,
        rowsPerPage,
        updateTableHeaders: () => updateTableHeaders(),
        handleSortClick,
        createPaginationControls: (container, totalItems, totalPages, startIndex, endIndex) => {
            createPaginationControls(container, totalItems, totalPages, startIndex, endIndex);
        }
    });
}

/**
 * Wrapper function that calls the exported createPaginationControls function
 */
function createPaginationControls(container, totalItems, totalPages, startIndex, endIndex) {
    createPaginationControlsUtil(container, totalItems, totalPages, startIndex, endIndex, {
        currentPage,
        rowsPerPage,
        onPageChange: (newPage) => {
            currentPage = newPage;
            refreshDataDisplay();
        },
        onRowsPerPageChange: (newRowsPerPage) => {
            // Calculate which item is at the top of the current page
            const currentTopItem = (currentPage - 1) * rowsPerPage + 1;
            
            // Update state
            rowsPerPage = newRowsPerPage;
            
            // Try to keep the user on a page that shows the same 'top' item
            currentPage = Math.max(1, Math.ceil(currentTopItem / rowsPerPage));
            
            // Save preference
            chrome.storage.local.set({ 'rowsPerPagePreference': rowsPerPage });
            
            // Refresh display
            refreshDataDisplay();
        }
    });
}

/**
 * Wrapper function that calls the exported updateTableHeaders function
 */
function updateTableHeaders() {
    updateTableHeadersUtil({ currentSortKeys });
}

// --- Event Handlers ---

// UPDATED: handleSortClick for multi-column sorting
function handleSortClick(event) {
    // If a resize has just finished, don't process the click as a sort.
    if (isResizing) {
        isResizing = false; // Reset the flag
        return;
    }

    const newSortKey = event.currentTarget.dataset.sortKey;
    if (!newSortKey) return;

    const shiftPressed = event.shiftKey;

    if (!shiftPressed) {
        // Standard click: Sort only by this column
        const existingSort = currentSortKeys[0];
        if (currentSortKeys.length === 1 && existingSort.key === newSortKey) {
            // If already sorting by this key, toggle direction
            currentSortKeys = [{ key: newSortKey, direction: existingSort.direction === 'asc' ? 'desc' : 'asc' }];
        } else {
            // Otherwise, set this as the primary sort key (default direction)
            const defaultDirection = (newSortKey === 'query' || newSortKey === 'position') ? 'asc' : 'desc';
            currentSortKeys = [{ key: newSortKey, direction: defaultDirection }];
        }
    } else {
        // Shift+Click: Add to multi-sort
        const existingIndex = currentSortKeys.findIndex(sk => sk.key === newSortKey);
        if (existingIndex !== -1) {
            // If already in the sort list, toggle its direction
            currentSortKeys[existingIndex].direction = currentSortKeys[existingIndex].direction === 'asc' ? 'desc' : 'asc';
        } else {
            // If not in the list, add it to the end with default direction
            const defaultDirection = (newSortKey === 'query' || newSortKey === 'position') ? 'asc' : 'desc';
            currentSortKeys.push({ key: newSortKey, direction: defaultDirection });
        }
    }

    console.log(`Sort updated:`, currentSortKeys);
    applyFiltersAndSort(); // Re-apply filters and sorting
}

/**
 * Wrapper function that calls the exported handleSearchInput function
 */
function handleSearchInput(event) {
    currentSearchTerm = event.target.value;
    handleSearchInputUtil(event, () => {
        applyFiltersAndSort();
        // No need to call updateCTRChartWithFilteredData() here as it's now called inside applyFiltersAndSort()
    }, { currentSearchTerm });
}

// --- Helper Functions ---

// getPeriodDates function moved to js/dateUtils.js

// getApiDateRange function moved to js/dateUtils.js

// Helper function to fetch and process data for a specific period
// Moved to js/dataFetchUtils.js


// --- Main Fetch Logic (Handles Predefined and Custom Dates) ---
// Moved to js/dataFetchUtils.js


// --- Utility Functions ---

// updateStatus function moved to js/statusUtils.js

// triggerDownload function moved to js/downloadUtils.js

// exportData function moved to js/exportUtils.js
function handleExport(format) {
    // Call the exported function with the required parameters
    return exportData({
        format,
        filteredAndSortedData,
        currentDomain,
        currentMetadata,
        currentQueryDataLength: currentQueryData.length
    });
}

/**
 * Wrapper function that calls the exported copyToClipboard function
 */
function handleCopyToClipboard() {
    copyToClipboard({
        filteredAndSortedData,
        currentQueryData,
        currentMetadata
    });
}

/**
 * Wrapper function that calls the exported clearStoredData function
 */
function handleClearStoredData() {
    clearStoredData({
        displayQueryData,
        onSuccess: () => {
            // Update main app state variables
            currentQueryData = [];
            previousQueryData = [];
            filteredAndSortedData = [];
            currentMetadata = null;
            previousMetadata = null;
            
            // Update comparison filters based on cleared data
            updateComparisonFiltersBasedOnData();
        }
    });
}

async function loadInitialDataAndPreferences() {
  // Performance tracking
  const startTime = performance.now();
    // Set an initialization timeout to force continuation after 15 seconds
    const initTimeout = setTimeout(() => {
        console.warn('Initialization timed out - forcing continuation');
        document.getElementById('status').textContent = 'Initialization timed out. Try refreshing.';
        const fetchButton = document.getElementById('fetchApiData');
        if (fetchButton) fetchButton.disabled = false;
    }, 15000);

    // Disable fetch button until initialization is complete
    const fetchButton = document.getElementById('fetchApiData');
    if (fetchButton) fetchButton.disabled = true;
    
    document.getElementById('authStatus').textContent = 'Initializing...';
    document.getElementById('status').textContent = 'Initializing...';
    document.getElementById('queryData').innerHTML = '<div class="no-data">Initializing...</div>';
    
    console.log('Starting initialization process at:', new Date().toISOString());

    // Set min/max dates for custom date input
    try {
        const today = new Date();
        const sixteenMonthsAgo = new Date();
        sixteenMonthsAgo.setUTCMonth(today.getUTCMonth() - 16);
        // Go to the first day of that month for simplicity, or adjust as needed
        sixteenMonthsAgo.setUTCDate(1);

        const todayStr = today.toISOString().split('T')[0];
        // Format sixteenMonthsAgo correctly for the 'min' attribute
        const sixteenMonthsAgoStr = sixteenMonthsAgo.toISOString().split('T')[0];

        const startDateInput = document.getElementById('period2StartDate');
        if (startDateInput) {
            startDateInput.min = sixteenMonthsAgoStr;
            startDateInput.max = todayStr;
            console.log(`Set date input min=${sixteenMonthsAgoStr}, max=${todayStr}`);
        } else {
            console.warn("Could not find start date input element to set min/max.");
        }
    } catch (e) {
        console.error("Error setting date input limits:", e);
    }

    loadSavedViews(); // <<< --- Load saved views early
// --- Filter Pill Event Listeners ---
    const filterContainer = document.querySelector('.filter-container');
    if (filterContainer) {
        filterContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('filter-pill')) {
                // Remove active class from all pills
                filterContainer.querySelectorAll('.filter-pill').forEach(pill => pill.classList.remove('active'));
                // Add active class to the clicked pill
                event.target.classList.add('active');
                // Re-apply filters and refresh the table display
                applyFiltersAndSort();
            }
        });
    } else {
        console.warn("Filter container not found.");
    }

    chrome.storage.local.get([
        'gscApiResult', 
        'gscApiResult_previous', 
        'dateRangePreference', 
        'keywordLimitPreference', 
        'lastSearchTerm',
        'lastQueryRegex',
        'columnWidths',
        'rowsPerPagePreference' /* Added rowsPerPagePreference */
    ], async (result) => {
        console.log("Initial load from storage:", result);
        try {
             // Set date range with safety check
             const dateRangeElement = document.getElementById('dateRange');
             const dateRangeValue = result.dateRangePreference || 'last7days';
             if (dateRangeElement) {
                 dateRangeElement.value = dateRangeValue;
                 // Verify the value was set correctly
                 if (dateRangeElement.value !== dateRangeValue) {
                     console.warn(`Date range value '${dateRangeValue}' not found, falling back to first option`);
                     dateRangeElement.selectedIndex = 0; // Select first option as fallback
                 }
             }
             
             document.getElementById('keywordLimit').value = result.keywordLimitPreference || '1000';
             document.getElementById('searchKeywords').value = result.lastSearchTerm || '';
             currentSearchTerm = result.lastSearchTerm || '';
             
             // Restore regex filter
             const regexInput = document.getElementById('query-regex-filter');
             if (regexInput && result.lastQueryRegex) {
                 regexInput.value = result.lastQueryRegex;
                 queryRegex = result.lastQueryRegex;
                 // Compile the regex object
                 try {
                     queryRegexObject = new RegExp(queryRegex, 'i');
                     regexInput.style.borderColor = '';
                     regexInput.title = '';
                 } catch (e) {
                     console.warn("Invalid stored regex pattern:", e.message);
                     queryRegexObject = null;
                     regexInput.style.borderColor = 'red';
                     regexInput.title = `Invalid regex pattern: ${e.message}`;
                 }
             }
             
             // Load row per page preference
             if (result.rowsPerPagePreference) {
                 rowsPerPage = parseInt(result.rowsPerPagePreference);
                 // Sanity check to ensure it's a valid value
                 if (isNaN(rowsPerPage) || rowsPerPage < 25 || ![25, 50, 100, 250, 500].includes(rowsPerPage)) {
                     rowsPerPage = 100; // Reset to default if invalid
                 }
             }
        } catch (prefError) { console.error("Error restoring prefs:", prefError); updateStatus("Error loading prefs.", true); }

        updateStatus("Checking auth status...");
        try {
            console.log('About to check auth token at:', new Date().toISOString());
            // Add a promise timeout to prevent hanging indefinitely
            const tokenPromise = getAuthToken(false);
            const tokenTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Auth token request timed out')), 10000);
            });
            
            const token = await Promise.race([tokenPromise, tokenTimeoutPromise]);
            console.log('Auth token obtained:', token ? 'Yes (token exists)' : 'No token');
            setAuthToken(token); // Use the new setAuthToken function
            updateAuthUI(true, displayQueryData); // Pass displayQueryData function
            updateStatus("Ready.");
            
            // Load saved site property
            chrome.storage.local.get(['selectedSiteProperty'], async (propResult) => {
                if (propResult.selectedSiteProperty) {
                    setSelectedSiteProperty(propResult.selectedSiteProperty); // Use the setter function instead of direct assignment
                    console.log("Loaded saved site property:", selectedSiteProperty);
                }
                
                // Fetch site properties (using cache if available)
                try {
                    console.log('About to check site properties at:', new Date().toISOString());
                    
                    // Check if we should force refresh the properties
                    // Default to using cache if available
                    const forceRefresh = false;
                    
                    // Add a promise timeout to prevent hanging indefinitely
                    const propertiesPromise = fetchSiteProperties(currentAuthToken, isSignedIn, updateStatus, handleSignOutClick, displayQueryData, forceRefresh);
                    const propertiesTimeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('Site properties request timed out')), 10000);
                    });
                    
                    const properties = await Promise.race([propertiesPromise, propertiesTimeoutPromise]);
                    console.log('Site properties obtained successfully:', properties ? 'Yes (count: ' + properties.length + ')' : 'No');
                    populateSitePropertiesDropdown(properties, updateStatus);
                    
                    // Add event listener to site property dropdown
                    const sitePropertyDropdown = document.getElementById('siteProperty');
                    if (sitePropertyDropdown) {
                        sitePropertyDropdown.addEventListener('change', (event) => handleSitePropertyChange(event, updateStatus));
                        
                        // If we have a selected property, update UI accordingly
                        if (selectedSiteProperty) {
                            // Find the selected option
                            for (let i = 0; i < sitePropertyDropdown.options.length; i++) {
                                if (sitePropertyDropdown.options[i].value === selectedSiteProperty) {
                                    sitePropertyDropdown.selectedIndex = i;
                                    
                                    
                                    break;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error fetching site properties:", error);
                    // Still enable the fetch button even if there was an error
                    if (fetchButton) fetchButton.disabled = false;
                }
                
                // Enable fetch button now that initialization is complete
                if (fetchButton) fetchButton.disabled = false;
                
                // Load stored API data
                console.log('About to load stored API data at:', new Date().toISOString());
                // Clear the initialization timeout as we've reached this point
                clearTimeout(initTimeout);
                
                const currentApiResult = result.gscApiResult; 
                const previousApiResult = result.gscApiResult_previous;
                console.log('Current API result exists:', !!currentApiResult);
                console.log('Current API result has queries:', !!(currentApiResult?.queries));
                console.log('Current API result has metadata:', !!(currentApiResult?.metadata));
                
                if (currentApiResult?.queries && currentApiResult?.metadata) {
                    console.log("Loading stored API data...");
                    try {
                        const meta = currentApiResult.metadata, prevMeta = previousApiResult?.metadata || null;
                        const queries = currentApiResult.queries, prevQueries = previousApiResult?.queries || [];
                        let domain = meta.siteUrl ? meta.siteUrl.replace(/^sc-domain:/, '') : '';
                        let url = meta.pageUrl || '';
                        console.log('About to display query data at:', new Date().toISOString());
                        console.log('Number of queries to display:', queries.length);
                        try {
                            displayQueryData(queries, prevQueries, domain, url, meta, prevMeta); // Call directly
                            console.log('Query data displayed successfully at:', new Date().toISOString());
                        } catch (displayError) {
                            console.error('Error in displayQueryData:', displayError);
                            // Fallback display empty data
                            updateStatus('Error displaying data: ' + displayError.message, true);
                            document.getElementById('queryData').innerHTML = '<div class="no-data">Error displaying data. Try re-fetching.</div>';
                        }
                        if (filteredAndSortedData.length > 0 || currentQueryData.length > 0) updateStatus(`Showing ${filteredAndSortedData.length} of ${currentQueryData.length} keywords (stored)`);
                        else updateStatus("Stored data loaded (0 keywords).");
                    } catch (e) { 
                        console.error("Error processing stored data:", e); 
                        updateStatus("Error loading stored data.", true); 
                        displayQueryData([], [], '', '', false, null, null); 
                    }
                } else { 
                    console.log("No stored API data."); 
                    updateStatus('No stored data found. Fetch when ready.'); 
                    displayQueryData([], [], '', '', false, null, null); 
                }
            });
        } catch (error) {
            console.error("Auth check/initial load failed:", error); 
            setAuthToken(null); // Use setAuthToken instead of direct assignment
            updateAuthUI(false, displayQueryData); // Pass displayQueryData function
            updateStatus(`Please Sign In. (${error.message || 'Auth check failed'})`);
        }
    }); // End storage.local.get callback
} // End loadInitialDataAndPreferences

// --- NEW: Functions for Saved Views ---

function loadSavedViews() {
    chrome.storage.local.get('gscSavedViews', (result) => {
        savedViews = result.gscSavedViews || {};
        console.log("Loaded saved views:", savedViews);
        populateSavedViewsDropdown();
    });
}

function saveSavedViews() {
    chrome.storage.local.set({ 'gscSavedViews': savedViews }, () => {
        if (chrome.runtime.lastError) {
            console.error("Error saving views:", chrome.runtime.lastError);
            updateStatus("Error saving view.", true);
        } else {
            console.log("Saved views updated in storage.");
        }
    });
}

function populateSavedViewsDropdown() {
    const dropdown = document.getElementById('saved-views-dropdown');
    if (!dropdown) return; // Safety check
    
    const loadButton = document.getElementById('load-view-btn');
    const deleteButton = document.getElementById('delete-view-btn');
    const selectedValue = dropdown.value; // Preserve selection if possible
    dropdown.innerHTML = '<option value="">Load a view...</option>'; // Default option

    const viewNames = Object.keys(savedViews).sort(); // Sort names alphabetically
    viewNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        dropdown.appendChild(option);
    });

    // Try to restore previous selection
    if (viewNames.includes(selectedValue)) {
        dropdown.value = selectedValue;
    }

    // Update button states based on selection
    updateViewActionButtons();
}

function handleSaveViewClick() {
    const viewNameInput = document.getElementById('save-view-name');
    if (!viewNameInput) return; // Safety check
    
    const viewName = viewNameInput.value.trim();

    if (!viewName) {
        alert("Please enter a name for the view.");
        viewNameInput.focus();
        return;
    }

    if (savedViews[viewName]) {
        if (!confirm(`A view named "${viewName}" already exists. Overwrite it?`)) {
            return;
        }
    }

    // Capture current filter and sort state
    const viewSettings = {
        filterRules: JSON.parse(JSON.stringify(filterRules)), // Deep copy
        filterLogic: filterLogic,
        queryRegex: queryRegex,
        currentSortKeys: JSON.parse(JSON.stringify(currentSortKeys)) // Deep copy
    };

    savedViews[viewName] = viewSettings;
    console.log(`Saving view "${viewName}":`, viewSettings);
    saveSavedViews();
    populateSavedViewsDropdown();
    
    const dropdown = document.getElementById('saved-views-dropdown');
    if (dropdown) dropdown.value = viewName; // Select the newly saved view
    
    viewNameInput.value = ''; // Clear the input field
    updateStatus(`View "${viewName}" saved.`, false);
    updateViewActionButtons();
}

function handleLoadViewClick() {
    const dropdown = document.getElementById('saved-views-dropdown');
    if (!dropdown) return; // Safety check
    
    const viewName = dropdown.value;

    if (!viewName || !savedViews[viewName]) {
        alert("Please select a valid view to load.");
        return;
    }

    const viewSettings = savedViews[viewName];
    console.log(`Loading view "${viewName}":`, viewSettings);

    // Restore state from the saved view
    filterRules = JSON.parse(JSON.stringify(viewSettings.filterRules || []));
    filterLogic = viewSettings.filterLogic || 'AND';
    queryRegex = viewSettings.queryRegex || '';
    currentSortKeys = JSON.parse(JSON.stringify(viewSettings.currentSortKeys || [{ key: 'impressions', direction: 'desc' }]));

    // Update UI elements to reflect loaded state
    const andRadio = document.getElementById('filter-logic-and');
    const orRadio = document.getElementById('filter-logic-or');
    if (andRadio) andRadio.checked = filterLogic === 'AND';
    if (orRadio) orRadio.checked = filterLogic === 'OR';
    
    const regexInput = document.getElementById('query-regex-filter');
    if (regexInput) {
        regexInput.value = queryRegex;
        // Trigger regex compilation and validation
        handleQueryRegexInput({ target: regexInput }); // Simulate input event
    }

    // Re-render the filter rules UI
    renderFilterRulesList();

    // Apply the loaded filters and sort
    applyFiltersAndSort();
    updateStatus(`Loaded view "${viewName}".`, false);
}

function handleDeleteViewClick() {
    const dropdown = document.getElementById('saved-views-dropdown');
    if (!dropdown) return; // Safety check
    
    const viewName = dropdown.value;

    if (!viewName || !savedViews[viewName]) {
        alert("Please select a valid view to delete.");
        return;
    }

    if (confirm(`Are you sure you want to delete the view "${viewName}"?`)) {
        delete savedViews[viewName];
        console.log(`Deleted view "${viewName}".`);
        saveSavedViews();
        populateSavedViewsDropdown(); // Update dropdown, selection resets
        updateStatus(`View "${viewName}" deleted.`, false);
    }
}

// Enable/disable Load/Delete buttons based on dropdown selection
function updateViewActionButtons() {
    const dropdown = document.getElementById('saved-views-dropdown');
    const loadButton = document.getElementById('load-view-btn');
    const deleteButton = document.getElementById('delete-view-btn');
    
    if (!dropdown || !loadButton || !deleteButton) return; // Safety check
    
    const hasSelection = dropdown.value !== '';

    loadButton.disabled = !hasSelection;
    deleteButton.disabled = !hasSelection;
}

// --- End NEW Saved Views Functions ---

// --- NEW: Functions for Advanced Filter UI ---

// Renders a single filter rule row in the UI
function renderFilterRule(rule, index) {
    const ruleDiv = document.createElement('div');
    ruleDiv.className = 'filter-rule';
    ruleDiv.style.cssText = 'display: flex; gap: 5px; align-items: center; margin-bottom: 5px;';
    ruleDiv.dataset.index = index;

    const metricSelect = document.createElement('select');
    metricSelect.className = 'filter-metric';
    metricSelect.style.cssText = 'padding: 4px; font-size: 12px;';
    metricSelect.innerHTML = `
        <option value="clicks">Clicks</option>
        <option value="impressions">Impressions</option>
        <option value="ctr">CTR (%)</option> <!-- Display as % -->
        <option value="position">Position</option>
    `;
    metricSelect.value = rule.metric;

    const operatorSelect = document.createElement('select');
    operatorSelect.className = 'filter-operator';
    operatorSelect.style.cssText = 'padding: 4px; font-size: 12px;';
    operatorSelect.innerHTML = `
        <option value=">">&gt;</option>
        <option value="<">&lt;</option>
        <option value="=">=</option>
        <option value=">=">&gt;=</option>
        <option value="<=">&lt;=</option>
        <option value="between">Between</option>
    `;
    operatorSelect.value = rule.operator;

    const valueInput = document.createElement('input');
    valueInput.type = 'number';
    valueInput.className = 'filter-value';
    valueInput.placeholder = 'Value';
    valueInput.style.cssText = 'padding: 4px; font-size: 12px; width: 60px;';
    valueInput.value = rule.value;

    const valueEndInput = document.createElement('input');
    valueEndInput.type = 'number';
    valueEndInput.className = 'filter-value-end';
    valueEndInput.placeholder = 'Value 2';
    valueEndInput.style.cssText = 'padding: 4px; font-size: 12px; width: 60px;';
    valueEndInput.value = rule.valueEnd;
    valueEndInput.style.display = rule.operator === 'between' ? 'inline-block' : 'none'; // Show/hide based on operator

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-filter-rule';
    removeButton.textContent = 'X';
    removeButton.style.cssText = 'padding: 3px 6px; font-size: 10px; background-color: #eee; color: #333; border: 1px solid #ccc; cursor: pointer;';

    // Event listeners for this rule
    metricSelect.addEventListener('change', function(e) { handleFilterRuleChange(e, index); });
    operatorSelect.addEventListener('change', function(e) { 
        handleFilterRuleChange(e, index);
        // Show/hide the second value input for 'between'
        valueEndInput.style.display = operatorSelect.value === 'between' ? 'inline-block' : 'none';
    });
    valueInput.addEventListener('input', function(e) { handleFilterRuleChange(e, index); });
    valueEndInput.addEventListener('input', function(e) { handleFilterRuleChange(e, index); });
    removeButton.addEventListener('click', function(e) { handleRemoveFilterRule(e, index); });

    ruleDiv.appendChild(metricSelect);
    ruleDiv.appendChild(operatorSelect);
    ruleDiv.appendChild(valueInput);
    ruleDiv.appendChild(valueEndInput);
    ruleDiv.appendChild(removeButton);

    return ruleDiv;
}

// Re-renders all filter rules based on the filterRules array
function renderFilterRulesList() {
    const listDiv = document.getElementById('filter-rules-list');
    if (!listDiv) return; // Safety check
    
    // Clear existing content but preserve the Add button
    const addButton = listDiv.querySelector('#add-filter-rule');
    listDiv.innerHTML = ''; // Clear existing rules
    
    if (filterRules.length === 0) {
        // Optionally add a placeholder if no rules exist
        const placeholder = document.createElement('em');
        placeholder.style.cssText = 'font-size: 11px; color: #666;';
        placeholder.textContent = 'No conditions added. Click "+ Add Condition".';
        listDiv.appendChild(placeholder);
    } else {
        // Add each filter rule
        filterRules.forEach((rule, index) => {
            listDiv.appendChild(renderFilterRule(rule, index));
        });
    }
}

// Updates the state in the filterRules array when a rule's UI changes
function handleFilterRuleChange(event, index) {
    const ruleDiv = event.target.closest('.filter-rule');
    if (!ruleDiv) return; // Safety check
    
    // If index is provided directly, use it; otherwise get from dataset
    if (index === undefined) {
        index = parseInt(ruleDiv.dataset.index);
    }
    
    // Make sure the rule exists at this index
    if (index < 0 || index >= filterRules.length) return;
    
    const rule = filterRules[index];
    const metricSelect = ruleDiv.querySelector('.filter-metric');
    const operatorSelect = ruleDiv.querySelector('.filter-operator');
    const valueInput = ruleDiv.querySelector('.filter-value');
    const valueEndInput = ruleDiv.querySelector('.filter-value-end');

    rule.metric = metricSelect.value;
    rule.operator = operatorSelect.value;
    rule.value = valueInput.value;
    rule.valueEnd = valueEndInput.value;

    console.log("Filter rule changed:", index, filterRules[index]);
    applyFiltersAndSort(); // Re-apply filters after change
}

// Adds a new default filter rule
function handleAddFilterRule() {
    filterRules.push({
        metric: 'clicks',
        operator: '>=',
        value: '10',
        valueEnd: ''
    });
    renderFilterRulesList();
    applyFiltersAndSort(); // Apply filters after adding
}

// Removes a filter rule by index
function handleRemoveFilterRule(event, index) {
    // If index is not directly provided, get it from the dataset
    if (index === undefined) {
        const ruleDiv = event.target.closest('.filter-rule');
        if (!ruleDiv) return; // Safety check
        index = parseInt(ruleDiv.dataset.index);
    }
    
    if (!isNaN(index) && index >= 0 && index < filterRules.length) {
        filterRules.splice(index, 1);
        renderFilterRulesList();
        applyFiltersAndSort(); // Apply filters after removing
    }
}

// Updates the filter logic (AND/OR)
function handleFilterLogicChange(event) {
    filterLogic = event.target.value;
    console.log("Filter logic changed:", filterLogic);
    applyFiltersAndSort(); // Re-apply filters
}

// Updates the query regex state and compiles it
function handleQueryRegexInput(event) {
    queryRegex = event.target.value;
    const inputElement = event.target; // Keep reference to the input element
    try {
        if (queryRegex) {
            queryRegexObject = new RegExp(queryRegex, 'i'); // Case-insensitive matching
            inputElement.style.borderColor = ''; // Reset border color on success
            inputElement.title = ''; // Clear any error tooltip
            // Save to storage for persistence
            chrome.storage.local.set({ 'lastQueryRegex': queryRegex });
        } else {
            queryRegexObject = null;
            inputElement.style.borderColor = ''; // Reset border color if empty
            inputElement.title = ''; // Clear any error tooltip
            // Clear from storage when empty
            chrome.storage.local.remove('lastQueryRegex');
        }
    } catch (e) {
        console.warn("Invalid Regex:", e.message);
        queryRegexObject = null;
        inputElement.style.borderColor = 'red'; // Indicate error
        inputElement.title = `Invalid regex pattern: ${e.message}`; // Show error in tooltip
        updateStatus(`Invalid regex pattern: ${e.message}`, true);
    }
    applyFiltersAndSort(); // Re-apply filters
}

// --- End NEW Advanced Filter UI Functions ---

// NEW: Updates the multi-sort info display area
function updateMultiSortInfo() {
    const infoElement = document.getElementById('current-sort-display');
    if (!infoElement) return;

    if (!currentSortKeys || currentSortKeys.length === 0) {
        infoElement.textContent = 'Default (Impressions Desc)'; // Or whatever the initial default is
        return;
    }

    const sortText = currentSortKeys.map(({ key, direction }) => {
        // Capitalize key for display
        const displayKey = key.charAt(0).toUpperCase() + key.slice(1);
        const displayDirection = direction === 'asc' ? 'Asc' : 'Desc';
        return `${displayKey} (${displayDirection})`;
    }).join(', ');

    infoElement.textContent = sortText;
}

// Function to check 16-month limit for "Last Year" comparison
function checkLastYearComparisonAvailability() {
    const compareLastYearRadio = document.getElementById('compareLastYear');
    if (!compareLastYearRadio) return; // Element not found

    let primaryStartDateStr = null;
    const dateRangeSelect = document.getElementById('dateRange');
    if (!dateRangeSelect) return; // Element not found
    
    const selectedRangeOption = dateRangeSelect.value;

    if (selectedRangeOption === 'custom') {
        // Use Period 2 start date if in custom mode and valid
        const p2StartInput = document.getElementById('period2StartDate');
        if (p2StartInput && /^\d{4}-\d{2}-\d{2}$/.test(p2StartInput.value)) {
            primaryStartDateStr = p2StartInput.value;
        }
    } else {
        // Calculate start date for predefined range
        let days;
        switch(selectedRangeOption) {
            case 'last7days': days = 7; break;
            case 'last28days': days = 28; break;
            case 'last3months': days = 90; break;
            case 'lastYear': days = 365; break;
            default: days = parseInt(selectedRangeOption);
        }
        
        if (!isNaN(days) && days > 0) {
            const dates = getPeriodDates(0, days); // Get current period dates
            primaryStartDateStr = dates.startDate;
        }
    }

    if (!primaryStartDateStr) {
        // Cannot determine primary start date, disable for safety
        compareLastYearRadio.disabled = true;
        compareLastYearRadio.parentElement.title = "Select a valid date range first.";
        return;
    }

    try {
        const primaryStartDate = new Date(primaryStartDateStr + 'T00:00:00Z');
        const today = new Date();
        const sixteenMonthsAgo = new Date();
        sixteenMonthsAgo.setUTCMonth(today.getUTCMonth() - 16);
        sixteenMonthsAgo.setUTCDate(1); // Start of the month 16 months ago
        sixteenMonthsAgo.setUTCHours(0, 0, 0, 0);

        if (primaryStartDate < sixteenMonthsAgo) {
            // Start date is too old, disable "Last Year" comparison
            compareLastYearRadio.disabled = true;
            compareLastYearRadio.parentElement.title = "Date range starts too far back (>16 months) for 'Last Year' comparison.";
            // If it's currently selected, maybe switch to 'Previous Period'?
            if (compareLastYearRadio.checked) {
                const prevPeriodRadio = document.getElementById('comparePreviousPeriod');
                if (prevPeriodRadio) prevPeriodRadio.checked = true;
            }
        } else {
            // Start date is within the limit, enable "Last Year" comparison
            compareLastYearRadio.disabled = false;
            compareLastYearRadio.parentElement.title = ""; // Clear tooltip
        }
    } catch (e) {
        console.error("Error checking date validity for 'Last Year' comparison:", e);
        compareLastYearRadio.disabled = true; // Disable on error
        compareLastYearRadio.parentElement.title = "Error checking date validity.";
    }
}

// NEW: Function to handle filter pill clicks
function handleFilterPillClick(event) {
    const pillElement = event.currentTarget;
    const filterType = pillElement.getAttribute('data-filter');
    
    // Handle deselection: if the pill is already active, deselect it
    if (pillElement.classList.contains('active')) {
        pillElement.classList.remove('active');
        // Find and activate the "All" filter pill to show all keywords
        const allPill = document.querySelector('.filter-pill[data-filter="all"]');
        if (allPill) {
            allPill.classList.add('active');
        }
        // Apply filters to show all keywords
        applyFiltersAndSort();
        return;
    }
    
    // Toggle active class on pills (remove from all, add to clicked)
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.classList.remove('active');
    });
    pillElement.classList.add('active');
    
    // Apply the appropriate filter
    let filteredData = [...currentQueryData];
    
    if (filterType !== 'all') {
        switch (filterType) {
            case 'position-1-3':
                filteredData = filteredData.filter(item => {
                    const position = parseFloat(item.position);
                    return position >= 1 && position <= 3;
                });
                break;
            case 'position-5-20':
                filteredData = filteredData.filter(item => {
                    const position = parseFloat(item.position);
                    return position >= 5 && position <= 20;
                });
                break;
            case 'position-gt-20':
                filteredData = filteredData.filter(item => {
                    const position = parseFloat(item.position);
                    return position > 20;
                });
                break;
            case 'low-ctr':
                filteredData = filteredData.filter(item => {
                    const ctr = parseFloat(item.ctr) * 100;
                    const impressions = parseInt(item.impressions);
                    // Define low CTR as < 1% with at least 10 impressions
                    return ctr < 1 && impressions >= 10;
                });
                break;
            case 'high-impressions':
                filteredData = filteredData.filter(item => {
                    const impressions = parseInt(item.impressions);
                    return impressions >= 100;
                });
                break;
            case 'has-clicks':
                filteredData = filteredData.filter(item => {
                    const clicks = parseInt(item.clicks);
                    return clicks > 0;
                });
                break;
            case 'no-clicks':
                filteredData = filteredData.filter(item => {
                    const clicks = parseInt(item.clicks);
                    return clicks === 0;
                });
                break;
            case 'questions':
                filteredData = filteredData.filter(item => {
                    const query = item.query.toLowerCase();
                    return query.includes('how') || 
                           query.includes('what') || 
                           query.includes('when') || 
                           query.includes('where') || 
                           query.includes('why') || 
                           query.includes('who') || 
                           query.includes('which') || 
                           query.endsWith('?');
                });
                break;
            case 'new-keywords':
                console.log('Processing new-keywords filter. Previous data available:', previousQueryData?.length > 0);
                if (previousQueryData && previousQueryData.length > 0) {
                    // Build lookup map of previous keywords (case insensitive)
                    const prevKeywordsMap = new Map();
                    previousQueryData.forEach(item => {
                        if (item.query) {
                            prevKeywordsMap.set(item.query.toLowerCase(), true);
                        }
                    });
                    
                    // Filter to show only keywords that don't exist in previous data
                    filteredData = filteredData.filter(item => {
                        return item.query && !prevKeywordsMap.has(item.query.toLowerCase());
                    });
                } else {
                    // If no previous data exists, show a message and return empty array
                    updateStatus('No comparison data available for New Keywords filter');
                    filteredData = [];
                }
                break;
            case 'lost-keywords':
                console.log('Processing lost-keywords filter. Previous data available:', previousQueryData?.length > 0);
                if (previousQueryData && previousQueryData.length > 0) {
                    // Build lookup map of current keywords (case insensitive)
                    const currentKeywordsMap = new Map();
                    currentQueryData.forEach(item => {
                        if (item.query) {
                            currentKeywordsMap.set(item.query.toLowerCase(), true);
                        }
                    });
                    
                    // Create a new dataset of keywords that only exist in previous data
                    const lostKeywords = previousQueryData.filter(item => {
                        return item.query && !currentKeywordsMap.has(item.query.toLowerCase());
                    });
                    
                    // Add a visual indicator for lost keywords
                    lostKeywords.forEach(item => {
                        item.isLostKeyword = true;
                    });
                    
                    // Replace the filtered data with lost keywords
                    filteredData = lostKeywords;
                    
                    // Update status with specific count for lost keywords
                    updateStatus(`Showing ${filteredData.length} keywords that were lost between periods`);
                } else {
                    // If no previous data exists, show a message and return empty array
                    updateStatus('No comparison data available for Lost Keywords filter');
                    filteredData = [];
                }
                break;
        }
    }
    
    // Update the displayed data
    filteredAndSortedData = filteredData;
    refreshDataDisplay();
    
    // Update the CTR position chart with the filtered data
    updateCTRChartWithFilteredData();
    
    updateStatus(`Showing ${filteredAndSortedData.length} of ${currentQueryData.length} keywords`);
}

// REMOVED: Duplicate DOMContentLoaded listener and initialization functions - functionality consolidated above

// --- Event Handling for Collapsible Sections ---
// Moved to js/uiUtils.js

// Style adjustments
const styleSheet = document.styleSheets[0];

// Sort number indicator style
styleSheet.insertRule(`
  th.sort-multi .sort-arrow {
    font-size: 0.8em; /* Make number slightly smaller */
    font-weight: normal; /* Normal weight */
    vertical-align: super; /* Align slightly higher */
    margin-left: 2px; /* Adjust spacing */
    opacity: 0.7; /* Slightly dimmer */
  }
`, styleSheet.cssRules.length);

// Pagination styles
styleSheet.insertRule(`
  .pagination-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 15px;
    padding: 10px;
    background-color: #f8f9fa;
    border-radius: 4px;
    border: 1px solid #eee;
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .pagination-nav {
    display: flex;
    gap: 5px;
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .pagination-nav button {
    padding: 5px 10px;
    background: #f1f1f1;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    color: #333;
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .pagination-nav button:hover:not(:disabled) {
    background: #e0e0e0;
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .pagination-nav button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .export-copy-note {
    font-size: 11px;
    color: #666;
    font-style: italic;
    margin-top: 5px;
    text-align: center;
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .new-badge {
    display: inline-block;
    background-color: #34A853;
    color: white;
    font-size: 10px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 9px;
    margin-left: 6px;
    vertical-align: middle;
  }
`, styleSheet.cssRules.length);

styleSheet.insertRule(`
  .lost-badge {
    display: inline-block;
    background-color: #EA4335;
    color: white;
    font-size: 10px;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 9px;
    margin-left: 6px;
    vertical-align: middle;
  }
`, styleSheet.cssRules.length);

// --- Column Resizing Functionality ---
// Moved to js/uiUtils.js

// Save current column widths to chrome storage
// Moved to js/uiUtils.js

// REMOVED: Duplicate column resizing setup - functionality moved to setupColumnResizingObserver() function above

// Additional hook to ensure column resizing is set up after data display
const originalRefreshDataDisplay = refreshDataDisplay;
refreshDataDisplay = function() {
  originalRefreshDataDisplay.apply(this, arguments);
  // Call after a short delay to ensure the table is fully rendered
  setTimeout(setupColumnResizing, 100);
}

// --- END OF FILE popup.js ---

// Add event listeners for the quick action icons
document.addEventListener('click', function(event) {
    // Identify which icon was clicked (if any)
    let actionIcon = event.target.closest('.action-icon');
    if (!actionIcon) return;

    // Get the keyword from the data attribute
    const keyword = actionIcon.dataset.keyword;
    if (!keyword) return;

    // Handle each action type
    if (actionIcon.classList.contains('copy-icon')) {
        // Copy to clipboard
        navigator.clipboard.writeText(keyword)
            .then(() => {
                // Show a brief copied message
                const originalTitle = actionIcon.getAttribute('title');
                actionIcon.setAttribute('title', 'Copied!');
                setTimeout(() => {
                    actionIcon.setAttribute('title', originalTitle);
                }, 1500);
            })
            .catch(err => {
                console.error('Error copying text: ', err);
            });
    } else if (actionIcon.classList.contains('search-icon')) {
        // Open Google search in new tab
        window.open(`https://www.google.com/search?q=${encodeURIComponent(keyword)}`, '_blank');
    } else if (actionIcon.classList.contains('gsc-icon')) {
        // Get the current property from the dropdown
        const siteProperty = document.getElementById('sitePropertyInput').value;
        if (siteProperty) {
            // Format: https://search.google.com/search-console/performance/search-analytics?resource_id=https://example.com/&query=keyword
            const propertyId = encodeURIComponent(siteProperty);
            const searchConsoleUrl = `https://search.google.com/search-console/performance/search-analytics?resource_id=${propertyId}&query=!${encodeURIComponent(keyword)}`;
            window.open(searchConsoleUrl, '_blank');
        } else {
            alert('Please select a property first to analyze in Search Console');
        }
    } else if (actionIcon.classList.contains('trends-icon')) {
        // Open Google Trends
        window.open(`https://trends.google.com/trends/explore?q=${encodeURIComponent(keyword)}`, '_blank');
    }
});

// --- Add floating custom date dropdown close-on-outside-click logic ---
function setupCustomDateDropdownClose() {
    const dateRangeSelect = document.getElementById('dateRange');
    const customDateContainer = document.getElementById('custom-date-container');
    const startDateInput = document.getElementById('period2StartDate');
    const endDateInput = document.getElementById('period2EndDate');
    const applyCustomDateBtn = document.getElementById('applyCustomDate');
    const cancelCustomDateBtn = document.getElementById('cancelCustomDate');
    
    // Store original dates for cancel functionality
    let originalStartDate = null;
    let originalEndDate = null;

    // Initialize custom date container
    function initializeCustomDateContainer() {
        if (!startDateInput.value) {
            const today = new Date();
            const sixteenMonthsAgo = new Date();
            sixteenMonthsAgo.setMonth(today.getMonth() - 16);
            startDateInput.value = sixteenMonthsAgo.toISOString().split('T')[0];
            endDateInput.value = today.toISOString().split('T')[0];
        }
        validateCustomDateRange();
    }
    
    if (startDateInput && endDateInput) {
        // Set initial end date to today
        startDateInput.addEventListener('change', () => {
            const startDate = new Date(startDateInput.value);
            const today = new Date();
            
            // Update end date input min/max
            endDateInput.min = startDateInput.value;
            endDateInput.max = today.toISOString().split('T')[0];
            
            // If end date is not set or is before start date, set it to today
            if (!endDateInput.value || new Date(endDateInput.value) < startDate) {
                endDateInput.value = today.toISOString().split('T')[0];
            }
            
            validateCustomDateRange();
            updateComparisonPeriodDisplay();
        });
        
        endDateInput.addEventListener('change', () => {
            validateCustomDateRange();
            updateComparisonPeriodDisplay();
        });
    }

    // Add Apply button click handler
    if (applyCustomDateBtn) {
        applyCustomDateBtn.addEventListener('click', () => {
            if (validateCustomDateRange()) {
                customDateContainer.style.display = 'none';
                updateCustomDateRangeText();
                // Update the dropdown text immediately
                const customOption = Array.from(dateRangeSelect.options).find(option => option.value === 'custom');
                if (customOption) {
                    customOption.text = `Custom (${startDateInput.value} to ${endDateInput.value})`;
                }
            }
        });
    }

    // Add Cancel button click handler
    if (cancelCustomDateBtn) {
        cancelCustomDateBtn.addEventListener('click', () => {
            // Restore original dates if they exist
            if (originalStartDate && originalEndDate) {
                startDateInput.value = originalStartDate;
                endDateInput.value = originalEndDate;
            }
            customDateContainer.style.display = 'none';
        });
    }
    
    dateRangeSelect.addEventListener('change', function(event) {
        const selectedValue = event.target.value;
        
        if (selectedValue === 'custom') {
            // Store original dates when opening the custom date container
            originalStartDate = startDateInput.value;
            originalEndDate = endDateInput.value;
            
            // Initialize the custom date container
            initializeCustomDateContainer();
            
            // Show the custom date container
            customDateContainer.style.display = 'block';
        } else {
            customDateContainer.style.display = 'none';
        }
    });

    // Initialize custom date container if custom is selected on page load
    if (dateRangeSelect.value === 'custom') {
        initializeCustomDateContainer();
        customDateContainer.style.display = 'block';
    }
}

// Function to update custom date range text in the dropdown
function updateCustomDateRangeText() {
    const dateRangeSelect = document.getElementById('dateRange');
    const startDateInput = document.getElementById('period2StartDate');
    const endDateInput = document.getElementById('period2EndDate');
    
    if (!dateRangeSelect || !startDateInput?.value || !endDateInput?.value) return;
    
    const customOption = Array.from(dateRangeSelect.options).find(option => option.value === 'custom');
    if (customOption) {
        customOption.text = `Custom (${startDateInput.value} to ${endDateInput.value})`;
    }
}

// Function to update date range dropdown text with calculated dates
function updateDateRangeDropdownText() {
    const dateRangeSelect = document.getElementById('dateRange');
    const selectedOption = dateRangeSelect.options[dateRangeSelect.selectedIndex];
    const selectedValue = selectedOption.value;
    
    if (selectedValue === 'custom') {
        return; // Don't modify text for custom option
    }
    
    let days;
    switch(selectedValue) {
        case 'last7days': days = 7; break;
        case 'last28days': days = 28; break;
        case 'last3months': days = 90; break;
        case 'last6months': days = 180; break;
        case 'last8months': days = 240; break;
        case 'lastYear': days = 365; break;
        default: days = parseInt(selectedValue);
    }
    
    if (!isNaN(days) && days > 0) {
        const dates = getPeriodDates(0, days);
        selectedOption.text = `${selectedOption.text} (${dates.startDate} to ${dates.endDate})`;
    }
}

// Function to update comparison period display
function updateComparisonPeriodDisplay() {
    const compareDataCheckbox = document.getElementById('compareData');
    const comparisonOptions = document.getElementById('comparisonOptions');
    const comparePreviousPeriod = document.getElementById('comparePreviousPeriod');
    const compareLastYear = document.getElementById('compareLastYear');
    
    if (!compareDataCheckbox || !comparisonOptions) return;
    
    // Show/hide comparison options based on checkbox
    comparisonOptions.style.display = compareDataCheckbox.checked ? 'block' : 'none';
    
    if (compareDataCheckbox.checked) {
        const dateRangeSelect = document.getElementById('dateRange');
        const selectedValue = dateRangeSelect.value;
        let currentDates;
        
        if (selectedValue === 'custom') {
            const startDateInput = document.getElementById('period2StartDate');
            const endDateInput = document.getElementById('period2EndDate');
            if (!startDateInput?.value || !endDateInput?.value) return;
            
            currentDates = {
                startDate: startDateInput.value,
                endDate: endDateInput.value
            };
        } else {
            // ... existing predefined range code ...
        }
        
        if (currentDates) {
            let comparisonDates;
            
            if (comparePreviousPeriod.checked) {
                const duration = new Date(currentDates.endDate) - new Date(currentDates.startDate);
                const p1End = new Date(currentDates.startDate);
                p1End.setDate(p1End.getDate() - 1);
                const p1Start = new Date(p1End);
                p1Start.setTime(p1End.getTime() - duration);
                
                comparisonDates = {
                    startDate: p1Start.toISOString().split('T')[0],
                    endDate: p1End.toISOString().split('T')[0]
                };
            } else if (compareLastYear.checked) {
                const startDate = new Date(currentDates.startDate);
                const endDate = new Date(currentDates.endDate);
                startDate.setFullYear(startDate.getFullYear() - 1);
                endDate.setFullYear(endDate.getFullYear() - 1);
                
                comparisonDates = {
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0]
                };
            }
            
            // ... rest of the existing comparison display code ...
        }
    }
}

// Add event listeners for comparison controls
document.addEventListener('DOMContentLoaded', () => {
    const compareDataCheckbox = document.getElementById('compareData');
    const comparePreviousPeriod = document.getElementById('comparePreviousPeriod');
    const compareLastYear = document.getElementById('compareLastYear');
    
    if (compareDataCheckbox) {
        compareDataCheckbox.addEventListener('change', updateComparisonPeriodDisplay);
    }
    
    if (comparePreviousPeriod) {
        comparePreviousPeriod.addEventListener('change', updateComparisonPeriodDisplay);
    }
    
    if (compareLastYear) {
        compareLastYear.addEventListener('change', updateComparisonPeriodDisplay);
    }
    
    // Initial update
    updateComparisonPeriodDisplay();
});

// Function to validate and update custom date range
function validateCustomDateRange() {
    const startDateInput = document.getElementById('period2StartDate');
    const endDateInput = document.getElementById('period2EndDate');
    const dateRangeInfo = document.querySelector('.date-range-info');
    
    if (!startDateInput || !endDateInput || !dateRangeInfo) return;
    
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate 16 months ago
    const sixteenMonthsAgo = new Date();
    sixteenMonthsAgo.setMonth(sixteenMonthsAgo.getMonth() - 16);
    sixteenMonthsAgo.setDate(1);
    sixteenMonthsAgo.setHours(0, 0, 0, 0);
    
    let isValid = true;
    let errorMessage = '';
    
    // Validate start date
    if (startDate < sixteenMonthsAgo) {
        isValid = false;
        errorMessage = 'Start date cannot be more than 16 months ago';
        startDateInput.value = sixteenMonthsAgo.toISOString().split('T')[0];
    }
    
    // Validate end date
    if (endDate > today) {
        isValid = false;
        errorMessage = 'End date cannot be in the future';
        endDateInput.value = today.toISOString().split('T')[0];
    }
    
    // Validate date range
    if (endDate < startDate) {
        isValid = false;
        errorMessage = 'End date cannot be before start date';
        endDateInput.value = startDateInput.value;
    }
    
    // Update info message
    if (!isValid) {
        dateRangeInfo.style.color = '#d93025';
        dateRangeInfo.textContent = errorMessage;
    } else {
        dateRangeInfo.style.color = '#1976d2';
        dateRangeInfo.textContent = 'Select any date range within the last 16 months. End date cannot be in the future.';
    }
    
    return isValid;
}

// Function to update comparison filter pills based on actual data availability
function updateComparisonFiltersBasedOnData() {
    const comparisonPills = document.querySelectorAll('.comparison-filter-pill');
    const disabledText = document.querySelector('.comparison-disabled-text');
    const enabledText = document.querySelector('.comparison-enabled-text');
    
    // Check if comparison data is actually available
    const hasComparisonData = previousQueryData && previousQueryData.length > 0;
    
    comparisonPills.forEach(pill => {
        if (hasComparisonData) {
            pill.classList.remove('disabled');
            pill.style.pointerEvents = 'auto';
        } else {
            pill.classList.add('disabled');
            pill.classList.remove('active');
            pill.style.pointerEvents = 'none';
        }
    });
    
    // Update explanatory text based on data availability
    if (disabledText && enabledText) {
        if (hasComparisonData) {
            disabledText.style.display = 'none';
            enabledText.style.display = 'inline-block';
        } else {
            disabledText.style.display = 'inline-block';
            enabledText.style.display = 'none';
        }
    }
    
    console.log('Comparison filters updated. Has comparison data:', hasComparisonData, 'Previous data length:', previousQueryData?.length);
}

// Legacy function for backwards compatibility (now just calls the data-based function)
function toggleComparisonFilters(isEnabled) {
    updateComparisonFiltersBasedOnData();
}

// Function to handle comparison filter pill clicks
function handleComparisonFilterPillClick(event) {
    const pillElement = event.currentTarget;
    const filterType = pillElement.getAttribute('data-filter');
    console.log('Comparison filter clicked:', filterType, 'Disabled:', pillElement.classList.contains('disabled'));
    console.log('Current data length:', currentQueryData.length, 'Previous data length:', previousQueryData.length);
    
    // Check if the pill is disabled
    if (pillElement.classList.contains('disabled')) {
        // Show a tooltip or status message
        updateStatus('Enable comparison mode to use comparison filters', false);
        return;
    }
    
    // Handle deselection: if the pill is already active, deselect it
    if (pillElement.classList.contains('active')) {
        pillElement.classList.remove('active');
        // Find and activate the "All" filter pill to show all keywords
        const allPill = document.querySelector('.filter-pill[data-filter="all"]');
        if (allPill) {
            allPill.classList.add('active');
        }
        // Apply filters to show all keywords
        applyFiltersAndSort();
        return;
    }
    
    // Otherwise, handle the click normally (select this filter)
    handleFilterPillClick(event);
}

// Initialize comparison filters on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set initial state of comparison filters based on data availability
    updateComparisonFiltersBasedOnData();
    
    // Setup accordion toggle functionality
    setupAccordionToggle();
    
    // Setup dropdown functionality
    setupDropdownFunctionality();
});

// Function to setup accordion toggle functionality
function setupAccordionToggle() {
    const accordionToggle = document.querySelector('.data-summary-toggle');
    if (accordionToggle) {
        accordionToggle.addEventListener('click', function() {
            toggleAccordion();
        });
    }
}

// Function to toggle accordion open/closed state
function toggleAccordion() {
    const detailsSection = document.querySelector('.data-details-section');
    const arrow = document.querySelector('.data-summary-arrow');
    
    if (detailsSection && arrow) {
        // Toggle the expanded class
        const isExpanded = detailsSection.classList.toggle('expanded');
        arrow.classList.toggle('expanded', isExpanded);
        
        // Update aria attributes for accessibility
        const toggle = document.querySelector('.data-summary-toggle');
        if (toggle) {
            toggle.setAttribute('aria-expanded', isExpanded.toString());
        }
    }
}

// Function to setup dropdown functionality
function setupDropdownFunctionality() {
    // Setup export dropdown
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleDropdown('exportBtn');
        });
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            closeAllDropdowns();
        }
    });
}

// Function to toggle dropdown visibility
function toggleDropdown(buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const dropdown = button.closest('.dropdown');
    const dropdownContent = dropdown.querySelector('.dropdown-content');
    
    if (!dropdownContent) return;
    
    // Close other dropdowns first
    closeAllDropdowns();
    
    // Toggle this dropdown
    dropdownContent.classList.toggle('show');
}

// Function to close all dropdowns
function closeAllDropdowns() {
    const dropdowns = document.querySelectorAll('.dropdown-content');
    dropdowns.forEach(dropdown => {
        dropdown.classList.remove('show');
    });
}

// Event listener for rendering normal table (integration with keyword grouping)
document.addEventListener('renderNormalTable', function() {
    // Re-render the table in normal (flat) view
    displayQueryData(currentQueryData, currentMetadata);
});

// Event listener for exporting data (integration with keyword grouping)
document.addEventListener('exportData', function(event) {
    const { data, format, filename } = event.detail;
    
    // Use existing export functionality but with custom data
    if (format === 'csv') {
        exportDataAsCSV(data, filename);
    } else if (format === 'excel') {
        exportDataAsExcel(data, filename);
    }
});

// Helper function to export custom data as CSV
function exportDataAsCSV(data, filename) {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
}

// Helper function to export custom data as Excel
function exportDataAsExcel(data, filename) {
    if (!data || data.length === 0) return;
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Grouped Keywords');
    XLSX.writeFile(wb, `${filename}.xlsx`);
}
