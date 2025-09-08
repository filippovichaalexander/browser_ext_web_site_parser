# Google Search Console Extension Architecture

This document provides an overview of the extension's architecture, detailing the key files, functions, and their dependencies to facilitate future maintenance and enhancements.

## Overview

This Chrome extension retrieves and analyzes keyword data from Google Search Console (GSC) with a **modern, enterprise-grade user interface**. It allows users to:
- Authenticate with Google
- Select site properties
- Fetch keyword data for specified time periods
- Filter and sort the data using advanced filtering capabilities
- Compare data across different time periods
- View performance metrics and visualizations at both page and keyword levels
- Analyze CTR performance by position with visual charts
- Export data in various formats
- Save and load custom filter/sort views
- Toggle between page-level and keyword-level metrics views
- Visualize CTR vs Position trends with interactive charts
- Analyze keyword distribution patterns across position ranges with bar charts
- Visualize clicks vs impressions relationship for top 100 keywords sorted by clicks

## 🎨 Modern Design System

### **Design Philosophy**
The extension implements a **premium, modern interface** that rivals enterprise SaaS applications while maintaining the familiar Google Search Console workflow. The design system is built on:

- **Glassmorphism**: Blurred backgrounds with transparency effects
- **Modern Typography**: System font stack with improved readability
- **Consistent Spacing**: 4px/8px base unit system (8px, 12px, 16px, 24px)
- **Smooth Animations**: Cubic-bezier transitions with hover effects
- **Accessibility**: Focus indicators and proper contrast ratios
- **Google Material Design**: Inspired color palette and interaction patterns

### **Visual Hierarchy**
| Design Element | Implementation | Purpose |
|----------------|----------------|---------|
| **Gradient Background** | `linear-gradient(135deg, #f8f9fa 0%, #e8f0fe 100%)` | Subtle depth and modern aesthetic |
| **Typography Scale** | 14px base, 1.5 line-height, system fonts | Improved readability and consistency |
| **Shadow System** | Layered shadows: 2px, 4px, 8px, 16px, 24px | Visual depth and component hierarchy |
| **Border Radius** | 8px, 12px, 16px, 20px, 24px | Modern, rounded appearance |
| **Color System** | CSS custom properties with brand-aligned gradients | Consistent theming and maintainability |

## File Structure

```
Chrome-gsc-extention-api/
├── popup.html             # Main extension UI with modern design system
├── popup.js               # Main application logic (includes Metrics view functionality)
├── manifest.json          # Extension configuration
├── css/
│   ├── critical.css       # Critical CSS with modern base styles
│   ├── header.css         # Header component styles with glassmorphism
│   ├── header-reference.md # Header styling documentation
│   └── main.css           # Extended styles (deferred loading)
├── js/
│   ├── authUtils.js       # Authentication utilities
│   ├── clicksVsImpressionsChart.js # Clicks vs Impressions chart functionality
│   ├── clipboardUtils.js  # Clipboard copy utilities
│   ├── ctrPositionChart.js # CTR by Position chart functionality
│   ├── keywordDistributionChart.js # Keyword Distribution by Position chart functionality
│   ├── dataFetchUtils.js  # Data fetching utilities
│   ├── dateUtils.js       # Date handling utilities
│   ├── downloadUtils.js   # Download utilities
│   ├── exportUtils.js     # Data export utilities
│   ├── filterUtils.js     # Data filtering utilities
│   ├── sitePropertiesUtils.js # Site properties management
│   ├── sortUtils.js       # Data sorting utilities
│   ├── statusUtils.js     # Status message utilities
│   ├── storageUtils.js    # Chrome storage utilities
│   ├── uiUtils.js         # UI helper utilities
├── xlsx.full.min.js       # Excel library for exports
├── MODERN_UI_UPDATES.md   # Documentation of modern UI improvements
```

## Module Dependencies

### popup.js Dependencies

The main application file imports these modules:
```javascript
import { getPeriodDates, getApiDateRange } from './js/dateUtils.js';
import { 
  getAuthToken, removeAuthToken, updateAuthUI, 
  handleSignInClick, handleSignOutClick,
  currentAuthToken, isSignedIn, setAuthToken
} from './js/authUtils.js';
import {
  fetchSiteProperties, populateSitePropertiesDropdown,
  selectCustomProperty, handleSitePropertyChange,
  siteProperties, selectedSiteProperty, setSelectedSiteProperty
} from './js/sitePropertiesUtils.js';
import {
  fetchGscDataForPeriod, handleFetchDataClick
} from './js/dataFetchUtils.js';
import { triggerDownload } from './js/downloadUtils.js';
import { sortData, sortDataAdvanced } from './js/sortUtils.js';
import { updateStatus } from './js/statusUtils.js';
import { copyToClipboard } from './js/clipboardUtils.js';
import { exportData } from './js/exportUtils.js';
import { 
  applyFiltersAndSort, handleSearchInput, 
  handleFilterPillClick 
} from './js/filterUtils.js';
import { 
  refreshDataDisplay, createPaginationControls, 
  updateTableHeaders 
} from './js/uiUtils.js';
import { 
  saveToStorage, loadFromStorage, 
  clearStorage, checkStorageData 
} from './js/storageUtils.js';
```

## 🎯 Modern Component System

### **Button Components**
Modern button design with enhanced interactions:
```css
button {
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  letter-spacing: 0.025em;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background-image: linear-gradient(135deg, #6c757d, #495057);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}
```

| Button Type | Gradient | Purpose |
|-------------|----------|---------|
| **Primary** | `linear-gradient(135deg, #4285f4, #1a73e8)` | Main actions (Fetch Data) |
| **Success** | `linear-gradient(135deg, #34a853, #2e7d32)` | Positive actions (Export, Copy) |
| **Danger** | `linear-gradient(135deg, #ea4335, #d32f2f)` | Destructive actions (Clear Data) |

### **Input Field System**
Enhanced input fields with focus states:
```css
input, select {
  padding: 12px 16px;
  border: 2px solid #e8eaed;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.9);
  transition: all 0.2s ease;
}

input:focus {
  border-color: #4285f4;
  box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
  background: white;
}
```

### **Glassmorphism Cards**
Modern card design with transparency and blur effects:
```css
.metric-card, .dashboard-board, .chart-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}
```

### **Modern Search Interface**
Pill-shaped search with embedded icon:
```css
#searchKeywords {
  border-radius: 24px;
  padding: 12px 20px 12px 44px;
  background-image: url('data:image/svg+xml;utf8,...'); /* Search icon */
  background-position: 16px center;
}
```

## Core Functionality

### Metrics View

The extension provides two levels of metrics view for comprehensive performance analysis:

| View Type | Description | Key Features |
|-----------|-------------|-------------|
| Page Level | Aggregated metrics for page-level data | Shows total clicks, impressions, average CTR, and average position for the entire page or domain |
| Keyword Level | Detailed metrics for individual keywords | Displays keyword-specific metrics and performance indicators, allowing for granular analysis |

Users can toggle between these views using the UI tabs in the Performance Dashboard section, providing flexibility in how they analyze their SEO performance data. The implementation includes:

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `toggleView(mode)` | Switches between 'page' and 'keyword' view modes | DOM elements with 'toggle-button' class |
| `updateMetricsSummary(data)` | Updates the metrics display based on the current view mode | Requires query data, uses calculateMetricsFromData() |
| `calculateMetricsFromData(data)` | Calculates aggregate metrics from raw keyword data | None |
| `displayMetrics(clicks, impressions, ctr, position)` | Formats and displays metrics in the UI | DOM elements with IDs: totalClicks, totalImpressions, avgCTR, avgPosition |
| `addComparisonMetrics(...)` | Adds comparison metrics when comparison mode is enabled | Requires both current and previous period data |

The metrics view is designed to load efficiently and provides immediate insights through a clean, card-based UI in the dashboard section. The view automatically updates when new data is fetched or when filters are applied.

### CTR by Position Chart

A data visualization feature that displays the relationship between position (x-axis) and CTR percentage (y-axis), providing valuable insights for SEO optimization:

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `initCTRPositionChart({ canvas, data, forceInit })` | Initializes the CTR position chart with configuration options | Chart.js library, DOM element with ID: 'ctrPositionChart' |
| `processDataForCTRChart(gscData)` | Processes raw GSC data into format suitable for the chart, aggregating CTR values by position and rounding to one decimal place | None |
| `updateCTRPositionChart(data)` | Updates the chart with new data without re-initializing | Requires existing chart instance |
| `destroyCTRPositionChart()` | Destroys the chart instance and cleans up resources | None |
| `isInitialized()` | Checks if the chart has been initialized | None |
| `updateCTRChartWithFilteredData()` | Updates the CTR chart to display only data from currently filtered table results | Requires filteredAndSortedData array |

Key features of the CTR Position Chart:

- **Position Aggregation**: Automatically groups and averages CTR data by position
- **Interactive Tooltips**: Shows exact CTR percentage for each position on hover
- **Responsive Design**: Adapts to container size changes
- **Performance Optimization**: Lazy-loaded to improve popup initialization speed
- **Data Visualization**: Clear visual pattern of how CTR decreases as position increases
- **Dynamic Filtering**: Chart updates automatically to reflect only data visible in the filtered table view
- **Search Integration**: Updates in real-time when users search for specific keywords
- **Dynamic Y-Axis**: Automatically scales to the highest CTR value for improved readability

The chart is implemented using Chart.js and is designed to work seamlessly with the GSC API data. It appears in the Performance Dashboard section after data is fetched and provides a visual complement to the numerical metrics.

### Keyword Distribution by Position Chart

A bar chart visualization that shows the distribution of keywords across different position ranges, providing insights into keyword ranking patterns:

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `initKeywordDistributionChart({ canvas, data, forceInit })` | Initializes the keyword distribution chart with configuration options | Chart.js library, DOM element with ID: 'keywordDistributionChart' |
| `processDataForKeywordDistributionChart(gscData)` | Processes raw GSC data into format suitable for the chart, grouping keywords into position ranges: 1-3, 4-10, 11-20, 21-50, 51-100 | None |
| `updateKeywordDistributionChart(data)` | Updates the chart with new data without re-initializing | Requires existing chart instance |
| `destroyKeywordDistributionChart()` | Destroys the chart instance and cleans up resources | None |
| `isInitialized()` | Checks if the chart has been initialized | None |

Key features of the Keyword Distribution Chart:

- **Position Range Grouping**: Automatically groups keywords into predefined position ranges (1-3, 4-10, 11-20, 21-50, 51-100)
- **Interactive Tooltips**: Shows exact keyword count and percentage for each position range on hover
- **Responsive Design**: Adapts to container size changes
- **Performance Optimization**: Lazy-loaded to improve popup initialization speed
- **Data Visualization**: Clear visual representation of how keywords are distributed across different ranking positions
- **Dynamic Filtering**: Chart updates automatically to reflect only data visible in the filtered table view
- **Search Integration**: Updates in real-time when users search for specific keywords
- **Percentage Calculation**: Displays both absolute counts and percentages for better context

The chart is implemented using Chart.js as a bar chart and is designed to work seamlessly with the GSC API data. It appears alongside the CTR Position Chart in the Performance Dashboard section after data is fetched.

## Multi-Chart Visualization System

The extension now features a comprehensive three-chart visualization system that provides complementary insights into search performance:

### Chart Layout and Integration
- **Tabbed Interface**: Charts are organized into two main tabs: "Position Insights" (CTR by Position + Keyword Distribution side-by-side) and "Keyword Analysis" (Clicks vs Impressions scatter plot)
- **Side-by-Side Display**: Position Insights tab displays two charts in a responsive two-column layout within the Performance Dashboard
- **Synchronized Updates**: All charts update simultaneously when data is filtered, searched, or refreshed
- **Consistent Styling**: Unified design language with matching headers, tooltips, and visual elements across all three charts
- **Responsive Design**: Charts automatically adjust to container size and maintain aspect ratios

### Data Flow Architecture
```
GSC Data → displayQueryData() → {
  ├── CTR Position Chart (processDataForCTRChart)
  ├── Keyword Distribution Chart (processDataForKeywordDistributionChart)
  └── Clicks vs Impressions Chart (processDataForClicksVsImpressionsChart)
}
↓
User Filters/Search → updateCTRChartWithFilteredData() → {
  ├── Update CTR Chart with filtered data
  ├── Update Distribution Chart with filtered data
  └── Update Clicks vs Impressions Chart with filtered data
}
```

### Chart Interaction Patterns
- **Independent Processing**: Each chart processes the same data source but with different aggregation methods
- **Shared State Management**: Both charts respond to the same filter and search state
- **Error Handling**: Graceful fallback if one chart fails to initialize
- **Performance Optimization**: Charts use efficient update patterns to minimize re-rendering

### Data Processing Differences

| Chart Type | Data Aggregation Method | Output Format | Key Insights |
|------------|-------------------------|---------------|--------------|
| CTR Position Chart | Groups by position (1-20), averages CTR values | Line chart with position vs CTR percentage | Shows how CTR decreases with position, identifies optimization opportunities |
| Keyword Distribution Chart | Groups keywords into position ranges (1-3, 4-10, 11-20, 21-50, 51-100) | Bar chart with range vs keyword count/percentage | Shows ranking distribution pattern, identifies content strategy gaps |
| Clicks vs Impressions Chart | Selects top 100 keywords sorted by clicks, deduplicates and handles overlaps | Scatter plot with impressions vs clicks | Shows keyword performance efficiency, identifies high-traffic keywords and optimization potential |

### Chart Styling and UX Consistency
- **Unified Color Scheme**: Both charts use consistent color palettes for brand coherence
- **Responsive Tooltips**: Interactive hover states with detailed information
- **Loading States**: Synchronized loading indicators during data fetch operations
- **Empty State Handling**: Graceful display when no data is available for visualization

## Chart Modules

### CTR Position Chart (ctrPositionChart.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `initCTRPositionChart({ canvas, data, forceInit })` | Initializes the CTR position chart with Chart.js configuration | Chart.js library, canvas element |
| `processDataForCTRChart(gscData)` | Processes GSC data into line chart format, aggregating CTR by position | None |
| `updateCTRPositionChart(data)` | Updates existing chart with new data | Existing chart instance |
| `destroyCTRPositionChart()` | Destroys chart and cleans up resources | None |
| `isInitialized()` | Returns chart initialization status | None |

**Global Export**: `window.CTRPositionChart`

### Keyword Distribution Chart (keywordDistributionChart.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `initKeywordDistributionChart({ canvas, data, forceInit })` | Initializes the keyword distribution chart with Chart.js configuration | Chart.js library, canvas element |
| `processDataForKeywordDistributionChart(gscData)` | Processes GSC data into bar chart format, grouping keywords by position ranges | None |
| `updateKeywordDistributionChart(data)` | Updates existing chart with new data | Existing chart instance |
| `destroyKeywordDistributionChart()` | Destroys chart and cleans up resources | None |
| `isInitialized()` | Returns chart initialization status | None |

**Global Export**: `window.KeywordDistributionChart`

### Clicks vs Impressions Chart (clicksVsImpressionsChart.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `initClicksVsImpressionsChart({ canvas, data, forceInit })` | Initializes the clicks vs impressions scatter chart with Chart.js configuration | Chart.js library, canvas element |
| `processDataForClicksVsImpressionsChart(gscData)` | Processes GSC data into scatter plot format, taking top 100 keywords sorted by clicks with deduplication and overlap handling | None |
| `updateClicksVsImpressionsChart(data)` | Updates existing chart with new data | Existing chart instance |
| `destroyClicksVsImpressionsChart()` | Destroys chart and cleans up resources | None |
| `isClicksVsImpressionsChartInitialized_()` | Returns chart initialization status | None |

**Global Export**: `window.ClicksVsImpressionsChart`

Key features of the Clicks vs Impressions Chart:

- **Top 100 Keywords**: Shows the top 100 keywords sorted by clicks (highest to lowest)
- **Scatter Plot Visualization**: Displays impressions on x-axis and clicks on y-axis to reveal performance patterns
- **Duplicate Handling**: Uses Map-based deduplication to merge duplicate keywords, keeping the version with highest clicks
- **Overlap Prevention**: Applies small random offsets to prevent overlapping data points when keywords have similar metrics
- **Interactive Tooltips**: Enhanced tooltips showing keyword, impressions, clicks, CTR, and position with duplicate prevention
- **Responsive Design**: Adapts to container size changes and maintains proper aspect ratios
- **Performance Focus**: Prioritizes keywords that actually drive traffic (clicks) rather than just visibility (impressions)
- **Dynamic Filtering**: Chart updates automatically to reflect only data visible in the filtered table view
- **International Support**: Handles international text including Persian/Arabic characters correctly
- **Error Handling**: Robust data validation and error recovery for missing or invalid data

### Chart Variable Management
- **Isolated State**: Each chart module maintains its own state variables to prevent conflicts
- **Unique Identifiers**: Chart initialization flags use unique names (`isChartInitialized` vs `isKeywordDistChartInitialized`)
- **Independent Lifecycle**: Charts can be initialized, updated, and destroyed independently
- **Resource Management**: Proper cleanup prevents memory leaks when charts are recreated

### Recent Bug Fixes and Code Optimizations

#### Variable Naming Conflict Resolution
Fixed a critical bug where both chart modules were using the same variable name `isChartInitialized`, causing the CTR Position Chart to fail initialization:

1. **Renamed Variables**: Changed keyword distribution chart variables to use unique identifiers
2. **Isolated State**: Each chart now maintains completely separate state management
3. **Improved Debugging**: Better console logging to identify chart-specific issues
4. **Error Prevention**: Eliminated cross-chart interference during initialization

#### Domain Property Selection and Checkbox State Preservation

A bug was fixed where clicking "Fetch GSC Data" would inappropriately change the property to domain level and enable the Domain-wide data checkbox. The following changes were implemented in `dataFetchUtils.js` and `sitePropertiesUtils.js`:

1. Store original site property and checkbox state at the beginning of fetch operation.
2. Preserve these values throughout the fetch process.
3. Properly restore original values after fetch completes.
4. Only auto-select properties when none was initially selected.
5. Modified property selection to not automatically check Domain-wide checkbox for domain properties, preserving user preference.

#### DOMContentLoaded Event Listener Consolidation

Multiple duplicate DOMContentLoaded event listeners were consolidated into a single, optimized initialization system in `popup.js`:

1. **Performance Optimization**: Split initialization into critical and non-critical components using `requestIdleCallback` for better performance.
2. **Duplicate Removal**: Eliminated 4 duplicate DOMContentLoaded listeners that were causing redundant initialization.
3. **Consolidated Functions**: Created dedicated setup functions:
   - `setupCustomUrlAndSitePropertyDropdown()` - Handles URL input and site property dropdown setup
   - `setupToggleButtons()` - Manages view toggle button event listeners
   - `setupColumnResizingObserver()` - Sets up table column resizing functionality
4. **Improved Error Handling**: Added timeout protection and better error recovery during initialization.
5. **Code Maintainability**: Reduced code duplication and improved organization of initialization logic.

### Authentication (authUtils.js)

| Function | Description | Dependencies |
|----------|-------------|--------------|
| `getAuthToken(interactive)` | Retrieves the OAuth token (interactive mode optional) | Chrome identity API |
| `setAuthToken(token)` | Sets the current auth token | None |
| `removeAuthToken()` | Removes the current auth token | Chrome identity API |
| `updateAuthUI(isSignedIn, displayQueryDataFn)` | Updates UI based on auth state | DOM elements with IDs: 'authStatus', 'authSignIn', 'authSignOut' |
| `handleSignInClick(updateStatusFn)` | Handles sign-in button click | getAuthToken, updateAuthUI |
| `handleSignOutClick(updateStatusFn, displayQueryDataFn)` | Handles sign-out button click | removeAuthToken, updateAuthUI |
| `isSignedIn()` | Returns current sign-in state | None |
| `currentAuthToken()` | Returns the current auth token | None |

### Site Properties (sitePropertiesUtils.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `fetchSiteProperties(token, isSignedIn, updateStatus, handleSignOut, displayQueryData, forceRefresh)` | Fetches available GSC properties with caching support | Google Search Console API, Chrome storage |
| `cacheSiteProperties(properties)` | Caches site properties with timestamp | Chrome storage |
| `getCachedSiteProperties()` | Retrieves cached site properties if not expired | Chrome storage |
| `populateSitePropertiesDropdown(properties, updateStatus)` | Populates dropdown with site properties | DOM element with ID: 'sitePropertyInput' |
| `selectCustomProperty(value, updateStatus)` | Selects a site property, preserving user preference for Domain-wide checkbox | DOM elements: 'sitePropertyInput', 'sitePropertyDropdown' |
| `handleSitePropertyChange(event, updateStatus)` | Handles property selection changes, preserving user preference for Domain-wide checkbox | Chrome storage |
| `setSelectedSiteProperty(property)` | Sets the selected property, preserving selection during changes | Chrome storage |

### Data Fetching (dataFetchUtils.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `fetchGscDataForPeriod(options)` | Fetches keyword data from GSC API with comprehensive error handling and logging | Google Search Console API |
| `handleFetchDataClick(options)` | Handles fetch button click with improved error handling and timeouts, refreshes site properties in background, preserves original property selection and checkbox state | fetchGscDataForPeriod, getApiDateRange, fetchSiteProperties |

### Download Utilities (downloadUtils.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `triggerDownload(blob, filename)` | Triggers a file download from a blob | Browser APIs |

### Sort Utilities (sortUtils.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `sortDataAdvanced(data, sortKeys)` | Sorts data by multiple columns | None |
| `sortData(data, key, direction)` | Legacy single-column sort | None |

### Status Utilities (statusUtils.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `updateStatus(message, isError, type)` | Updates status message in UI | DOM element with ID: 'status' |

### Export Utilities (exportUtils.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `exportData(options)` | Exports data in CSV or Excel format | triggerDownload (from downloadUtils.js), updateStatus (from statusUtils.js), xlsx.js library |

### Clipboard Utilities (clipboardUtils.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `copyToClipboard(options)` | Copies data to clipboard in tab-delimited format | updateStatus (from statusUtils.js), Navigator Clipboard API |

### Filter Utilities (filterUtils.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `applyFiltersAndSort(options)` | Applies all filters and sorts to data | sortDataAdvanced (from sortUtils.js), updateStatus (from statusUtils.js), DOM elements |
| `handleSearchInput(event, onSearch, options)` | Handles search input events | Chrome storage |
| `handleFilterPillClick(event, onFilterChange)` | Handles filter pill click events | DOM elements |

### Storage Utilities (storageUtils.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `saveToStorage(key, data)` | Saves data to Chrome storage | Chrome storage API |
| `loadFromStorage(key, callback)` | Loads data from Chrome storage | Chrome storage API |
| `clearStorage(keys, callback)` | Clears specified keys from storage | Chrome storage API |
| `checkStorageData(key, timeout, callback)` | Checks storage with timeout | Chrome storage API |

### UI Utilities (uiUtils.js)

| Function | Description | Dependencies |
|----------|-------------|---------------|
| `refreshDataDisplay(options)` | Refreshes the data display in the UI | DOM elements |
| `createPaginationControls(container, totalItems, totalPages, startIndex, endIndex, options)` | Creates pagination controls | DOM elements |
| `updateTableHeaders(options)` | Updates table headers with sort indicators | DOM elements |

### Main Application (popup.js)

#### Core Display Functions
| Function | Description | Dependencies |
|----------|-------------|---------------|
| `displayQueryData(data, prevData, domain, url, isDomainData, metadata, prevMetadata)` | Displays fetched query data and initializes all three charts: CTR position, keyword distribution, and clicks vs impressions | refreshDataDisplay, window.CTRPositionChart.init, window.CTRPositionChart.processData, window.KeywordDistributionChart.init, window.KeywordDistributionChart.processData, window.ClicksVsImpressionsChart.init, window.ClicksVsImpressionsChart.processData |
| `displayMetadata()` | Displays metadata for current results | DOM elements with ID prefixes: 'metadata-' |
| `toggleView(mode)` | Toggles between page and keyword level views | Multiple DOM elements |
| `updateMetricsSummary(data)` | Updates summary metrics in UI | DOM elements with IDs: 'totalClicks', 'totalImpressions', etc. |
| `calculateMetricsFromData(data)` | Helper function to calculate metrics from keyword data | None |
| `displayMetrics(totalClicks, totalImpressions, avgCTR, avgPosition)` | Formats and displays metrics in the UI | DOM elements for metrics display |
| `addComparisonMetrics(totalClicks, totalImpressions, avgCTR, avgPosition)` | Adds comparison metrics to the UI | DOM elements for comparison display |

#### Initialization Functions
| Function | Description | Dependencies |
|----------|-------------|---------------|
| `initializeCriticalComponents()` | Initializes critical UI components immediately on DOMContentLoaded | updateAuthUI, setupMinimalEventListeners |
| `initializeNonCriticalComponents()` | Deferred initialization of non-critical components using requestIdleCallback | Multiple setup functions, loadInitialDataAndPreferences |
| `setupMinimalEventListeners()` | Sets up essential event listeners for auth and fetch buttons | DOM elements: authSignIn, authSignOut, fetchData |
| `setupCustomUrlAndSitePropertyDropdown()` | Consolidated setup for URL input and site property dropdown functionality | Chrome tabs API, DOM elements |
| `setupToggleButtons()` | Sets up event listeners for view toggle buttons | DOM elements with class: 'toggle-button' |
| `setupColumnResizingObserver()` | Sets up mutation observer for table column resizing | MutationObserver API, setupColumnResizing |

#### Data Processing Functions
| Function | Description | Dependencies |
|----------|-------------|---------------|
| `applyFiltersAndSort()` | Wrapper function that applies filters and sorts | applyFiltersAndSortUtil (from filterUtils.js) |
| `refreshDataDisplay()` | Wrapper function for refreshing data display | refreshDataDisplayUtil (from uiUtils.js) |
| `createPaginationControls(container, totalItems, totalPages, startIndex, endIndex)` | Wrapper function for creating pagination | createPaginationControlsUtil (from uiUtils.js) |
| `updateTableHeaders()` | Wrapper function for updating table headers | updateTableHeadersUtil (from uiUtils.js) |
| `updateCTRChartWithFilteredData()` | Updates all three charts (CTR position, keyword distribution, and clicks vs impressions) to display only data from currently filtered table results | window.CTRPositionChart, window.KeywordDistributionChart, window.ClicksVsImpressionsChart, filteredAndSortedData |

#### Event Handlers
| Function | Description | Dependencies |
|----------|-------------|---------------|
| `handleSortClick(event)` | Handles column header clicks for sorting | applyFiltersAndSort |
| `handleSearchInput(event)` | Wrapper function for keyword search input | handleSearchInputUtil (from filterUtils.js) |
| `handleExport(format)` | Wrapper function that calls the exported exportData function | exportData (from exportUtils.js) |
| `handleCopyToClipboard()` | Wrapper function that calls the exported copyToClipboard function | copyToClipboard (from clipboardUtils.js) |
| `handleClearStoredData()` | Wrapper function that calls the exported clearStoredData function | clearStoredData (from storageUtils.js) |

#### Storage and Preferences
| Function | Description | Dependencies |
|----------|-------------|---------------|
| `loadInitialDataAndPreferences()` | Loads saved preferences and data with timeout handling and improved error recovery | Multiple dependencies, Chrome storage |
| `loadSavedViews()` | Loads saved filter/sort views | Chrome storage, populateSavedViewsDropdown |
| `saveSavedViews()` | Saves filter/sort views | Chrome storage |
| `populateSavedViewsDropdown()` | Populates dropdown with saved views | DOM element with ID: 'saved-views-dropdown' |

#### Saved Views Management
| Function | Description | Dependencies |
|----------|-------------|---------------|
| `handleSaveViewClick()` | Handles saving a view | saveSavedViews, populateSavedViewsDropdown |
| `handleLoadViewClick()` | Handles loading a saved view | applyFiltersAndSort, renderFilterRulesList |
| `handleDeleteViewClick()` | Handles deleting a saved view | saveSavedViews, populateSavedViewsDropdown |
| `updateViewActionButtons()` | Updates view action button states | DOM elements with IDs: 'load-view-btn', 'delete-view-btn' |

#### Advanced Filtering
| Function | Description | Dependencies |
|----------|-------------|---------------|
| `renderFilterRule(rule, index)` | Renders a single filter rule UI | None |
| `renderFilterRulesList()` | Renders all filter rules | renderFilterRule |
| `handleFilterRuleChange(event, index)` | Handles filter rule changes | applyFiltersAndSort |
| `handleAddFilterRule()` | Adds a new filter rule | renderFilterRulesList, applyFiltersAndSort |
| `handleRemoveFilterRule(event, index)` | Removes a filter rule | renderFilterRulesList, applyFiltersAndSort |
| `handleFilterLogicChange(event)` | Updates filter logic (AND/OR) | applyFiltersAndSort |
| `handleQueryRegexInput(event)` | Updates query regex filter | applyFiltersAndSort |
| `handleFilterPillClick(event)` | Handles filter pill clicks | refreshDataDisplay, updateCTRChartWithFilteredData (updates all three charts) |

#### Utility Functions
| Function | Description | Dependencies |
|----------|-------------|---------------|
| `updateMultiSortInfo()` | Updates multi-sort info display | DOM element with ID: 'current-sort-display' |
| `checkLastYearComparisonAvailability()` | Checks if "Last Year" comparison is available | getPeriodDates |
| `setupColumnResizing()` | Sets up table column resizing (moved to uiUtils.js) | DOM elements: 'table', 'th' |
| `saveColumnWidths()` | Saves column widths (moved to uiUtils.js) | Chrome storage |

## 🎨 Modern CSS Architecture

### **Critical CSS Strategy**
The extension uses optimized CSS loading:
- **Inline Critical CSS**: Essential styles for initial render performance
- **Deferred Non-Critical**: Advanced styles loaded after page load
- **Component-Specific**: Modular CSS for maintainability

### **CSS Structure**
```
css/
├── critical.css       # Critical styles (12KB) - modern base system
├── header.css         # Header component with glassmorphism
├── main.css          # Extended styles (deferred)
└── header-reference.md # Styling documentation
```

### **Modern Design Tokens**
```css
:root {
  /* Spacing System */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 24px;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.15);
  
  /* Typography */
  --font-system: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'SF Pro Display', sans-serif;
  --font-size-base: 14px;
  --line-height-base: 1.5;
}
```

## HTML Structure Dependencies

### Main UI Components

| Component | Description | JavaScript Dependencies | Modern Styling |
|-----------|-------------|-------------------------|----------------|
| **Enhanced Header** | Gradient header with glassmorphism | authUtils.js functions | `linear-gradient(135deg, #4285f4, #34a853)` |
| **Site Property Dropdown** | Custom searchable dropdown | sitePropertiesUtils.js functions | Glassmorphism with backdrop-filter |
| **Date Range Selector** | Modern select with focus states | dateUtils.js functions | Enhanced padding and blue focus ring |
| **Action Buttons** | Modern gradient buttons with hover effects | Multiple functions | Lift animations and enhanced shadows |
| **Performance Dashboard** | Glassmorphism dashboard with metrics cards | updateMetricsSummary, chart initialization | Blurred background with transparency |
| **CTR Position Chart** | Interactive chart with modern container | window.CTRPositionChart module | Rounded container with hover lift |
| **Keyword Distribution Chart** | Modern bar chart visualization | window.KeywordDistributionChart module | Glassmorphism card styling |
| **Clicks vs Impressions Chart** | Scatter plot with enhanced styling | window.ClicksVsImpressionsChart module | Modern chart container with blur effects |
| **Data Table** | Borderless table with glassmorphism | refreshDataDisplay and related functions | Transparent background with subtle hover |
| **Filter Pills** | Modern pill-shaped filters | handleFilterPillClick | Blue-tinted backgrounds with gradient active states |
| **Advanced Filters** | Enhanced filtering interface | renderFilterRulesList and related functions | Improved spacing and modern inputs |
| **Search Field** | Pill-shaped search with icon | handleSearchInput | Embedded SVG icon with blue focus states |

### Key HTML Element IDs

| Element ID | Purpose | JavaScript Dependencies | Modern Styling Features |
|------------|---------|-------------------------|------------------------|
| `authSignIn`/`authSignOut` | Authentication buttons | handleSignInClick, handleSignOutClick | Gradient backgrounds, hover lift effects |
| `sitePropertyInput` | Site property selection | selectCustomProperty | Custom dropdown with glassmorphism |
| `dateRange` | Date range selection | getApiDateRange | Enhanced focus states with blue ring |
| `fetchApiData` | Fetch data button | handleFetchDataClick | Primary blue gradient with split-button design |
| `keywordLimit` | Keyword limit input | Used in handleFetchDataClick | Modern input with 2px borders and focus states |
| `queryData` | Container for data table | refreshDataDisplay | Glassmorphism container with backdrop-filter |
| `searchKeywords` | Keyword search input | handleSearchInput | Pill-shaped with embedded SVG search icon |
| `exportCSV`/`exportExcel` | Export buttons | exportData | Success gradient (green) with hover animations |
| `status` | Status message area | updateStatus | Modernized typography with better spacing |
| `totalClicks`/`totalImpressions` | Metric display elements | updateMetricsSummary | Glassmorphism cards with gradient accents |
| `metricsViewTabs` | Tab controls for metrics views | toggleView | Tab design with active state indicators |
| `ctrPositionChart` | Canvas for CTR chart | window.CTRPositionChart.init | Glassmorphism container with hover lift |
| `keywordDistributionChart` | Canvas for distribution chart | window.KeywordDistributionChart.init | Modern chart container with blur effects |
| `clicksVsImpressionsChart` | Canvas for scatter plot | window.ClicksVsImpressionsChart.init | Enhanced chart styling with animations |
| `saved-views-dropdown` | Saved views selection | populateSavedViewsDropdown | Modern select with consistent styling |
| `load-view-btn`/`delete-view-btn` | View management buttons | updateViewActionButtons | Secondary button styling with proper states |

## State Management

The extension manages several types of state:

1. **Authentication State**:
   - Managed by authUtils.js
   - Stored in: currentAuthToken variable
   - Includes timeout handling for auth operations

2. **Site Properties State**:
   - Managed by sitePropertiesUtils.js
   - Stored in: siteProperties and selectedSiteProperty variables
   - Includes error handling for API failures
   - Caching support with 24-hour expiration

3. **Query Data State**:
   - Stored in: currentQueryData, previousQueryData, filteredAndSortedData
   - Supports comparison between time periods
   - Persisted in Chrome storage
   - Includes detailed error handling for API operations

4. **Filter and Sort State**:
   - Stored in: filterRules, filterLogic, queryRegex, currentSortKeys
   - Advanced multi-column sorting capabilities
   - Complex filtering with AND/OR logic
   - Regex-based filtering support
   - Can be saved/loaded as views

5. **UI State**:
   - Includes expanded/collapsed sections, pagination, column widths
   - Toggle between page and keyword level views
   - Collapsible sections for better organization
   - Responsive design elements
   - Some aspects saved to Chrome storage

## Event Flow

1. **Initialization** (Optimized Performance):
   - DOMContentLoaded → `initializeCriticalComponents()` (immediate) → `initializeNonCriticalComponents()` (deferred via requestIdleCallback)
   - Critical: Auth UI setup, minimal event listeners
   - Non-critical: Full UI setup, data loading, preferences restoration
   - Includes timeout protection (15 seconds) and improved error handling

2. **Data Fetching**:
   - User clicks "Fetch" → handleFetchDataClick → fetchGscDataForPeriod → displayQueryData
   - Updates UI with results and initializes all three charts: CTR Position, Keyword Distribution, and Clicks vs Impressions

3. **Data Filtering/Sorting**:
   - User interacts with filters/sorts → relevant handler → applyFiltersAndSort → refreshDataDisplay
   - Updates table display and all three charts with filtered data via updateCTRChartWithFilteredData

4. **Chart Synchronization**:
   - Filter applied → updateCTRChartWithFilteredData() → {
     - processDataForCTRChart(filteredData) → Update CTR chart
     - processDataForKeywordDistributionChart(filteredData) → Update Distribution chart
     - processDataForClicksVsImpressionsChart(filteredData) → Update Clicks vs Impressions chart
   }

5. **Analytics Tab Navigation**:
   - User switches between "Position Insights" and "Keyword Analysis" tabs → switchDashboardTab() → show/hide respective chart containers
   - Position Insights: Shows CTR by Position and Keyword Distribution charts side-by-side
   - Keyword Analysis: Shows Clicks vs Impressions scatter plot chart

6. **View Toggling**:
   - User clicks view toggle → toggleView() → updateMetricsSummary() → display updates
   - Switches between page-level and keyword-level metrics

## 🚀 Performance & Modern Enhancements

### **Frontend Performance**
1. **Optimized CSS Loading**:
   - **Critical CSS Inline**: Essential styles (12KB) inlined for instant rendering
   - **Deferred Non-Critical**: Advanced styles loaded after page interaction
   - **Selective Loading**: Component-specific CSS for better caching
   - **Modern Properties**: CSS custom properties for efficient theming

2. **Optimized Initialization**:
   - Split initialization into critical and non-critical components
   - Uses `requestIdleCallback` for deferred non-critical initialization
   - Consolidated duplicate DOMContentLoaded listeners (reduced from 4 to 1)
   - Initialization timeout (15 seconds) prevents UI from getting stuck
   - Improved error recovery and user feedback

3. **Modern Animations & Interactions**:
   - **Hardware Acceleration**: `transform` and `opacity` for smooth animations
   - **Cubic-Bezier Easing**: Professional timing functions
   - **Debounced Interactions**: Efficient event handling
   - **Intersection Observer**: Lazy loading for charts and heavy components

### **Backend Performance**
4. **Timeouts and Error Handling**:
   - API request timeouts (10 seconds) for auth token and site properties requests
   - Detailed error handling and user feedback
   - Console logging for debugging
   - Graceful degradation when components fail to initialize

5. **Site Properties Caching**:
   - Site properties are cached in chrome.storage.local to reduce API calls
   - 24-hour cache expiration to ensure data freshness
   - Automatic background refresh when fetching GSC data
   - Fallback to API when cache is unavailable or expired
   - Smooth integration with existing UI and functionality

### **User Experience**
6. **Pagination & Data Handling**:
   - Data is paginated to improve UI performance with large result sets
   - Adjustable rows per page (25, 50, 100, 250, 500)
   - Efficient DOM updates when navigating pages
   - Virtual scrolling preparation for future enhancements

7. **Modern Visual Feedback**:
   - **Loading States**: Skeleton loading for metric cards
   - **Progress Indicators**: Smooth progress animations
   - **Micro-Interactions**: Hover states and focus feedback
   - **Error Boundaries**: Graceful error handling with user feedback

### **Code Quality & Maintainability**
8. **Code Organization**:
   - Eliminated duplicate code and redundant function calls
   - Consolidated event listener setup into dedicated functions
   - Improved separation of concerns between initialization phases
   - Reduced memory footprint by removing duplicate listeners
   - Modern ES6+ patterns and best practices

## 🛠️ Development Guidelines

### **Adding New Components**

#### Adding a New Filter Type
1. **HTML Structure**: Add UI element in popup.html with modern styling classes
2. **JavaScript Handler**: Add handler in popup.js or appropriate utility module
3. **Styling**: Apply modern design system (glassmorphism, gradients, transitions)
4. **Filter Logic**: Update applyFiltersAndSort to include the filter logic
5. **Persistence**: Consider adding to saved views functionality if persistent

#### Adding a New Export Format
1. **Button Design**: Add modern gradient button in popup.html
2. **Event Handling**: Add event listener with proper error handling
3. **Export Logic**: Extend exportData function in exportUtils.js
4. **User Feedback**: Include loading states and success/error messages

### **Modern UI Development**

#### Design System Implementation
```css
/* Use the established design tokens */
.new-component {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.new-component:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}
```

#### Component Checklist
- ✅ **Glassmorphism**: Use backdrop-filter and transparency
- ✅ **Responsive Design**: Adapt to different screen sizes
- ✅ **Accessibility**: Include focus indicators and ARIA labels
- ✅ **Animations**: Smooth transitions with cubic-bezier timing
- ✅ **Typography**: Use system font stack and consistent sizing

### **Performance Optimization**

#### Modifying Initialization Behavior
1. **Critical Components**: Add to `initializeCriticalComponents()` (< 16ms render)
2. **Non-Critical Components**: Add to `initializeNonCriticalComponents()` (deferred)
3. **Setup Functions**: Create dedicated setup function with error handling
4. **Performance Budget**: Consider impact on initial render time
5. **Lazy Loading**: Use Intersection Observer for heavy components

#### Modern CSS Best Practices
1. **Critical CSS**: Keep inline styles under 14KB for performance
2. **CSS Custom Properties**: Use for theming and maintainability
3. **Hardware Acceleration**: Prefer `transform` over changing layout properties
4. **Component Isolation**: Use CSS modules or BEM methodology

### **Code Maintenance Best Practices**

#### Architecture Standards
1. **Modular Design**: Keep functionality in appropriate utility modules
2. **Event Listeners**: Use the consolidated initialization system to avoid duplicates
3. **Error Handling**: Include timeout protection and graceful degradation
4. **Modern Patterns**: Use ES6+ features (const/let, arrow functions, async/await)
5. **Performance**: Use deferred initialization for non-critical components

#### Testing & Quality Assurance
1. **Visual Testing**: Verify components across different screen sizes
2. **Performance Testing**: Check rendering performance with large datasets
3. **Accessibility Testing**: Ensure keyboard navigation and screen reader compatibility
4. **Cross-Browser Testing**: Verify modern CSS features have proper fallbacks
5. **Error Scenarios**: Test initialization under various failure conditions

#### Documentation Standards
1. **Component Documentation**: Document new styling patterns and component APIs
2. **Performance Notes**: Include any performance considerations or optimizations
3. **Design Decisions**: Document why specific styling approaches were chosen
4. **Migration Guides**: Document any breaking changes to existing components
