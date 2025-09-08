# Header Styling Reference

## Current Implementation
The header in `popup.html` uses inline styles for optimal performance and reliability. The gradient header matches Google's brand colors and provides a modern, professional appearance.

## Color Scheme
- **Primary Gradient**: `linear-gradient(135deg, #4285f4, #34a853)`
  - Blue: `#4285f4` (Google Blue)
  - Green: `#34a853` (Google Green)

## Structure
```html
<div style="background: linear-gradient(135deg, #4285f4, #34a853); color: white; padding: 20px; margin: 0 -15px 15px -15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: flex; justify-content: space-between; align-items: center; margin-top: -15px;">
  <div>
    <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Google Search Console Keyword Data</div>
    <div style="opacity: 0.9; font-size: 14px; font-weight: normal;">Advanced insights using Google Search Console API data</div>
  </div>
  <div style="display: flex; gap: 10px; align-items: center;">
    <!-- Auth controls -->
  </div>
</div>
```

## Available CSS Classes
For consistency, the following classes are available in `css/header.css`:
- `.enhanced-header` - Main header container
- `.header-content` - Content area
- `.header-title` - Main title
- `.header-subtitle` - Subtitle
- `.header-auth-section` - Auth controls container
- `.header-auth-button` - Auth button styling

## Alternative Color Schemes
- `.header-google-blue` - Blue gradient variant
- `.header-google-green` - Green gradient variant  
- `.header-classic-blue` - Classic blue variant

## Why Inline Styles?
Inline styles are used to ensure reliable rendering across different Chrome extension contexts and avoid potential CSS loading issues. 