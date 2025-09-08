/**
 * @fileoverview Utility functions for Chrome storage operations.
 */

import { updateStatus } from './statusUtils.js';

/**
 * Clears all stored GSC API data from Chrome's local storage
 * 
 * @param {Object} options - Options for clearing stored data
 * @param {Function} options.displayQueryData - Function to refresh the data display
 * @param {Function} options.onSuccess - Callback function to execute on successful clear operation
 * @returns {Promise<void>} A promise that resolves when the storage has been cleared
 */
export function clearStoredData({ displayQueryData, onSuccess }) {
    return new Promise((resolve, reject) => {
        if (confirm('Are you sure you want to clear ALL stored GSC API data? This will NOT sign you out or clear preferences.')) {
            chrome.storage.local.remove(['gscApiResult', 'gscApiResult_previous'], () => {
                if (chrome.runtime.lastError) { 
                    updateStatus('Error clearing data.', true);
                    console.error("Error clearing storage:", chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    // Call the onSuccess callback to update state variables in the main app
                    if (onSuccess) onSuccess();
                    
                    // Refresh the display with empty data
                    if (displayQueryData) {
                        displayQueryData([], [], '', '', false, null, null);
                    }
                    
                    updateStatus('Stored API data cleared.');
                    console.log('Cleared stored API data.');
                    resolve();
                }
            });
        } else {
            // User cancelled the operation
            resolve();
        }
    });
}
