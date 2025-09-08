/**
 * Date utility functions for GSC extension
 */

/**
 * Calculates start and end dates for a given period offset and duration
 * @param {number} periodOffset - Number of periods to offset (0 for current period)
 * @param {number} days - Duration of the period in days
 * @returns {Object} Object containing formatted startDate and endDate strings
 * 
 * Example: getPeriodDates(0, 7) -> last 7 days
 * Example: getPeriodDates(1, 7) -> 7 days before the last 7 days
 */
export function getPeriodDates(periodOffset, days) {
    const endDate = new Date();
    // GSC data lags by ~3 days. Apply offset first, then duration offset.
    endDate.setDate(endDate.getDate() - 3 - (periodOffset * days));

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - days + 1);
    
    // Ensure we don't go beyond 16 months in the past
    const sixteenMonthsAgo = new Date();
    sixteenMonthsAgo.setMonth(sixteenMonthsAgo.getMonth() - 16);
    
    // If startDate is earlier than 16 months ago, adjust it
    if (startDate < sixteenMonthsAgo) {
        console.log('Adjusting start date to be within 16 month limit');
        startDate.setTime(sixteenMonthsAgo.getTime());
    }

    // Format YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];
    return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}

/**
 * Calculates start and end dates for the selected predefined dropdown option
 * @param {string} rangeOption - The selected range option (e.g., 'last7days', 'last28days')
 * @returns {Object|null} Object containing startDate and endDate strings, or null if invalid
 */
export function getApiDateRange(rangeOption) {
  // Handle predefined string values for date ranges
  let days;
  
  switch(rangeOption) {
    case 'last7days':
      days = 7;
      break;
    case 'last28days':
      days = 28;
      break;
    case 'last3months':
      days = 90;
      break;
    case 'last6months':
      days = 180; // Approximately 6 months
      break;
    case 'last8months':
      days = 240; // Approximately 8 months
      break;
    case 'lastYear':
      days = 365;
      break;
    default:
      // Still try to parse if it's a numeric string
      days = parseInt(rangeOption);
  }
  
  if (isNaN(days) || days <= 0) {
      console.error("Invalid range option:", rangeOption);
      return null;
  }
  // Get dates for the most recent period (offset 0)
  return getPeriodDates(0, days);
}
