/**
 * Authentication utility functions for GSC extension
 */

// Auth state that will be imported into popup.js
export let currentAuthToken = null;
export let isSignedIn = false;

/**
 * Set the current auth token and update sign-in state
 * @param {string|null} token - The auth token or null if signed out
 */
export function setAuthToken(token) {
  currentAuthToken = token;
  isSignedIn = !!token;
}

/**
 * Get auth token from Chrome Identity API
 * @param {boolean} interactive - Whether to show interactive sign-in prompt
 * @returns {Promise<string>} Auth token
 */
export async function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: interactive }, (token) => {
      if (chrome.runtime.lastError) {
        console.error("getAuthToken Error:", chrome.runtime.lastError.message);
        if (chrome.runtime.lastError.message.includes("user interaction required") ||
            chrome.runtime.lastError.message.includes("User cancelled") ||
            chrome.runtime.lastError.message.includes("User declined")) {
             reject(new Error("Sign-in process was cancelled or declined by the user."));
        } else {
            reject(chrome.runtime.lastError);
        }
      } else if (!token) {
          reject(new Error("Failed to retrieve auth token (token is null or empty)."));
      } else {
        resolve(token);
      }
    });
  });
}

/**
 * Remove cached auth token for sign out
 * @param {string} token - Auth token to remove
 * @returns {Promise<void>}
 */
export async function removeAuthToken(token) {
    if (!token) return;
    try {
        // Properly revoke the token with Google
        const revokeResponse = await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        
        if (!revokeResponse.ok) {
            console.warn('Token revocation returned non-OK status:', revokeResponse.status);
        }
        
        await new Promise((resolve) => { // No reject needed here, just proceed
             chrome.identity.removeCachedAuthToken({ token: token }, () => {
                if (chrome.runtime.lastError) {
                    console.warn("Error removing cached token (might be expired or already removed):", chrome.runtime.lastError.message);
                }
                resolve(); // Always resolve
            });
        });
    } catch (error) {
        console.error("Error during token removal/revocation:", error);
    }
}

/**
 * Update the UI based on authentication state
 * @param {boolean} signedIn - Whether the user is signed in
 * @param {Function} [displayQueryDataFn] - Optional function to display query data
 */
export function updateAuthUI(signedIn, displayQueryDataFn) {
    // Don't directly modify isSignedIn here, it should only be modified by setAuthToken
    // This avoids the "Assignment to constant variable" error
    const signInButton = document.getElementById('authSignIn');
    const signOutButton = document.getElementById('authSignOut');
    const authStatus = document.getElementById('authStatus');
    const fetchDataButton = document.getElementById('fetchApiData');

    if (signedIn) {
        signInButton.style.display = 'none';
        signOutButton.style.display = 'inline-block';
        authStatus.textContent = 'Signed In';
        authStatus.style.color = '#ffffff'; // Ensure color is white
        authStatus.style.fontSize = '0.5em'; // Make text slightly smaller
        authStatus.style.verticalAlign = 'middle'; // Align vertically with button
        fetchDataButton.disabled = false;
    } else {
        signInButton.style.display = 'inline-block';
        signOutButton.style.display = 'none';
        authStatus.textContent = 'Not Signed In';
        authStatus.style.color = '#666';
        fetchDataButton.disabled = true;
        // Reset styles if needed when signed out
        authStatus.style.fontSize = ''; // Reset font size
        authStatus.style.verticalAlign = ''; // Reset vertical alignment
        // Reset data display when signed out if function is provided
        if (displayQueryDataFn) {
            displayQueryDataFn([], [], '', '', false, null, null);
        }
    }
}

/**
 * Handle sign in button click
 * @param {Function} updateStatusFn - Function to update status message
 * @returns {Promise<void>}
 */
export async function handleSignInClick(updateStatusFn) {
    updateStatusFn("Attempting Sign In...");
    const signInButton = document.getElementById('authSignIn');
    const signOutButton = document.getElementById('authSignOut');
    signInButton.disabled = true;
    signOutButton.disabled = true;

    try {
        const token = await getAuthToken(true);
        setAuthToken(token); // Use setAuthToken instead of direct assignment
        updateAuthUI(true);
        updateStatusFn("Sign In Successful. Ready to fetch data.");
    } catch (error) {
        updateAuthUI(false);
        updateStatusFn(`Sign In Failed: ${error.message || 'Could not get authorization.'}`, true);
        setAuthToken(null); // Use setAuthToken instead of direct assignment
    } finally {
        signInButton.disabled = isSignedIn;
        signOutButton.disabled = !isSignedIn;
    }
}

/**
 * Handle sign out button click
 * @param {Function} updateStatusFn - Function to update status message
 * @param {Function} [displayQueryDataFn] - Optional function to display query data
 * @returns {Promise<void>}
 */
export async function handleSignOutClick(updateStatusFn, displayQueryDataFn) {
    updateStatusFn("Signing Out...");
    const signInButton = document.getElementById('authSignIn');
    const signOutButton = document.getElementById('authSignOut');
    signInButton.disabled = true;
    signOutButton.disabled = true;

    if (currentAuthToken) {
        await removeAuthToken(currentAuthToken);
    }
    setAuthToken(null); // Use setAuthToken instead of direct assignment
    updateAuthUI(false, displayQueryDataFn); // This also calls displayQueryData to clear the view
    updateStatusFn("Signed Out.");
    chrome.storage.local.remove(['gscApiResult', 'gscApiResult_previous'], () => {
        console.log("Cleared stored API results on sign out.");
    });
    signInButton.disabled = false; // Re-enable Sign In
}
