# Google Search Console Chrome Extension

A powerful Chrome extension that connects directly to the Google Search Console API to analyze keyword data and search performance with advanced filtering, sorting, and visualization capabilities.

## 🚀 Features

### 📊 Performance Dashboard
- **Metrics View Toggle**: Switch between page-level and keyword-level metrics
- **Key Performance Indicators**: Total clicks, impressions, average CTR, and average position
- **Comparison Analytics**: Compare current data with previous periods or year-over-year

### 📈 Advanced Visualizations
- **CTR by Position Chart**: Interactive line chart showing click-through rates across search positions (1-20)
- **Keyword Distribution by Position Chart**: Bar chart displaying the distribution of keywords across position ranges (1-3, 4-10, 11-20, 21-50, 51-100)
- **Real-time Updates**: Charts automatically update when filters are applied or data is searched

### 🔍 Advanced Filtering & Analysis
- **Quick Filters**: Pre-built filters for position ranges, performance metrics, and query types
- **Advanced Filter Builder**: Create custom filters with multiple conditions using AND/OR logic
- **Regex Support**: Filter keywords using regular expressions
- **Multi-column Sorting**: Sort by multiple columns simultaneously (Shift+Click)

### 📊 Data Management
- **Multiple Export Formats**: Export data as CSV or Excel with proper formatting
- **Copy to Clipboard**: Quick copy functionality for data sharing
- **Saved Views**: Save and load custom filter/sort configurations
- **Pagination**: Handle large datasets efficiently with customizable page sizes

### 🎯 Smart Features
- **Automatic Property Detection**: Automatically selects the most appropriate GSC property for the current page
- **Domain-wide Analysis**: Option to fetch data for entire domain or specific pages
- **Comparison Modes**: Compare with previous periods or year-over-year data
- **Device & Search Type Filters**: Filter by desktop/mobile/tablet and search types

## 🛠️ Setup Instructions

### 1. Google Cloud Project Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### 2. Enable API
1. Navigate to "APIs & Services" > "Library"
2. Search for "Google Search Console API" and **Enable** it

### 3. Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "+ CREATE CREDENTIALS" > "OAuth client ID"
3. Choose "Application type" = "Chrome App"
4. Enter your Extension ID (found at `chrome://extensions` with Developer Mode enabled)
5. Click "CREATE" and copy the Client ID

### 4. Configure Extension
1. Open `manifest.json` in the extension directory
2. Find the `oauth2` section
3. Replace `"YOUR_CHROME_APP_OAUTH_CLIENT_ID.apps.googleusercontent.com"` with your actual Client ID
4. Save the file

### 5. Load Extension
1. Go to `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked" and select the extension directory
4. Or click reload (🔄) if already loaded

## 📱 Usage Guide

### Basic Usage
1. **Sign In**: Click the extension icon and sign in with Google
2. **Navigate**: Go to the webpage you want to analyze
3. **Configure**: Select date range, keyword limit, and analysis scope
4. **Fetch Data**: Click "Fetch GSC Data" to retrieve your search performance data
5. **Analyze**: Use the dashboard, charts, and filters to analyze your data

### Advanced Features
- **View Charts**: Examine CTR trends and keyword distribution patterns
- **Apply Filters**: Use quick filters or create custom filter rules
- **Sort Data**: Click column headers (Shift+Click for multi-column sorting)
- **Compare Periods**: Enable comparison mode to analyze changes over time
- **Save Views**: Save frequently used filter/sort combinations
- **Export Data**: Export filtered results as CSV or Excel files

## 📊 Chart Features

### CTR by Position Chart
- Shows average click-through rate for each search position (1-20)
- Interactive tooltips with exact CTR percentages
- Helps identify position-based performance patterns

### Keyword Distribution by Position Chart
- Displays keyword count and percentage for each position range
- Visual breakdown: 1-3 (top), 4-10 (page 1), 11-20 (page 2), 21-50, 51-100+
- Helps understand overall ranking distribution

Both charts update dynamically when you:
- Apply filters (position, performance, query type)
- Search for specific keywords
- Change data selections

## 🔧 Technical Architecture

The extension is built with a modular architecture for maintainability and performance:

- **Modular JavaScript**: Separate modules for authentication, data fetching, filtering, charts, and UI
- **Chart.js Integration**: Professional charts with responsive design
- **Chrome Storage API**: Efficient data caching and user preferences
- **Content Security Policy Compliant**: Secure implementation following Chrome extension best practices

## 📁 File Structure

```
Chrome-gsc-extention-api/
├── popup.html              # Main extension UI
├── popup.js                # Main application logic
├── manifest.json           # Extension configuration
├── js/
│   ├── authUtils.js        # Authentication utilities
│   ├── ctrPositionChart.js # CTR by Position chart
│   ├── keywordDistributionChart.js # Keyword Distribution chart
│   ├── dataFetchUtils.js   # Data fetching utilities
│   ├── filterUtils.js      # Data filtering utilities
│   ├── exportUtils.js      # Data export utilities
│   └── [other modules]     # Additional utility modules
├── css/                    # Stylesheets
├── images/                 # Extension icons
└── architecture.md         # Detailed technical documentation
```

## 🎯 Key Requirements

- **Google Search Console Access**: Must have verified properties in GSC
- **Chrome Browser**: Extension designed specifically for Chrome
- **Valid Domain**: Must have domain verification in GSC for the sites you want to analyze

## 📈 Data Insights

The extension helps you understand:
- **Performance Trends**: How your pages perform across different positions
- **Keyword Distribution**: Where most of your keywords rank
- **CTR Optimization**: Identify positions with improvement potential
- **Ranking Changes**: Compare performance across time periods
- **Content Opportunities**: Find low-CTR, high-impression keywords

## 🔒 Privacy & Security

### Enhanced Security Features
- **Manifest V3**: Uses the latest Chrome extension security model
- **Minimal Permissions**: Requests only specific, necessary API access
- **Input Validation**: Validates all data inputs and API responses
- **Secure Token Handling**: Proper OAuth token validation and revocation

### Data Protection
- **Read-only Access**: Extension only reads GSC data, never modifies it
- **Local Processing**: Data analysis happens locally in your browser
- **Secure Authentication**: Uses Google's OAuth 2.0 for secure access
- **No Data Storage**: Extension doesn't store your data on external servers
- **Zero Tracking**: No analytics, tracking, or third-party services

### Enhanced Safe Browsing Compatibility
The extension is designed to work safely with Chrome's Enhanced Safe Browsing:
- ✅ Uses minimal, specific permissions
- ✅ All code is transparent and documented
- ✅ Only communicates with official Google APIs
- ✅ Comprehensive security documentation available

📋 **Review our full security documentation**: [SECURITY.md](./SECURITY.md)  
📋 **Read our privacy policy**: [PRIVACY_POLICY.md](./PRIVACY_POLICY.md)

## 🐛 Troubleshooting

**Common Issues:**
- **No Data**: Ensure you have verified properties in GSC for the target domain
- **Authentication Errors**: Check that OAuth credentials are correctly configured
- **Missing Charts**: Ensure Chart.js library is loaded and no script conflicts exist

**Data Limitations:**
- GSC data is typically delayed by 1-3 days
- Maximum 25,000 keywords per request
- 16-month historical data limit

## 📄 License

This project is provided as-is for educational and analytical purposes. Ensure compliance with Google's Terms of Service when using the Search Console API.

---

**Note**: This extension requires proper Google Cloud Project setup and Search Console access. See the detailed setup instructions above for configuration steps.
 
