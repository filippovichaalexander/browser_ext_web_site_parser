/**
 * Utility functions for handling status messages in the GSC extension
 */

/**
 * Updates the status message in the UI
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether the message is an error
 * @param {string} type - Message type: 'normal', 'warning', etc.
 */
export function updateStatus(message, isError = false, type = 'normal') {
    const statusElement = document.getElementById('status');
    if (statusElement) { 
        statusElement.textContent = message; 
        
        // Determine color based on message type
        if (isError === true) {
            statusElement.style.color = '#ea4335'; // Red for errors
        } else if (type === 'warning') {
            statusElement.style.color = '#f29900'; // Orange for warnings
        } else {
            statusElement.style.color = '#666'; // Default gray
        }
        
        // Clear status after 10 seconds for messages
        setTimeout(() => {
            statusElement.textContent = '';
        }, 10000);
    } else {
        console.warn("Status element not found.");
    }
    
    // Only clear regex error border if this is a non-error status update 
    // and the message doesn't contain "regex" (to avoid clearing during regex-related status updates)
    const regexInput = document.getElementById('query-regex-filter');
    if (regexInput && regexInput.style.borderColor === 'red' && !isError && 
        !message.toLowerCase().includes('regex') && !message.toLowerCase().includes('pattern')) {
       regexInput.style.borderColor = '';
       regexInput.title = '';
    }
}
