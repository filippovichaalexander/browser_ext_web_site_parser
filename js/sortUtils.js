/**
 * Utility functions for sorting data in the GSC extension
 */

/**
 * Multi-column sort function that sorts data based on multiple keys
 * @param {Array} data - The array of data objects to sort
 * @param {Array} sortKeys - Array of objects with key and direction properties
 * @returns {Array} - The sorted array
 */
export function sortDataAdvanced(data, sortKeys) {
    if (!sortKeys || sortKeys.length === 0) return data; // No sorting needed

    return [...data].sort((a, b) => {
        for (const { key, direction } of sortKeys) {
            let valA = a[key], valB = b[key];
            const mult = direction === 'asc' ? 1 : -1;

            if (key === 'query') {
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
                const comparison = valA.localeCompare(valB);
                if (comparison !== 0) return comparison * mult;
            } else {
                // Handle numeric comparison (clicks, impressions, ctr, position)
                valA = parseFloat(valA);
                valB = parseFloat(valB);

                // Treat NaN/null consistently (e.g., push to bottom/top)
                const aNaN = isNaN(valA) || valA === null;
                const bNaN = isNaN(valB) || valB === null;

                if (aNaN && bNaN) continue; // If both are NaN/null, check next sort key
                if (aNaN) return 1; // Push NaN/null to the end regardless of direction (common practice)
                if (bNaN) return -1;

                if (valA < valB) return -1 * mult;
                if (valA > valB) return 1 * mult;
                // If values are equal, continue to the next sort key
            }
        }
        return 0; // Items are equal according to all sort keys
    });
}

/**
 * Legacy single-column sort function
 * @param {Array} data - The array of data objects to sort
 * @param {string} key - The key to sort by
 * @param {string} direction - Sort direction ('asc' or 'desc')
 * @returns {Array} - The sorted array
 */
export function sortData(data, key, direction) {
    const mult = direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
        let valA = a[key], valB = b[key];
        if (key === 'query') { 
            valA = String(valA || '').toLowerCase(); 
            valB = String(valB || '').toLowerCase(); 
            return valA.localeCompare(valB) * mult; 
        }
        valA = parseFloat(valA); 
        valB = parseFloat(valB);
        if (key === 'position') { 
            if (isNaN(valA)) valA = 9999; 
            if (isNaN(valB)) valB = 9999; 
        }
        const aNaN = isNaN(valA), bNaN = isNaN(valB);
        if (aNaN && bNaN) return 0; 
        if (aNaN) return 1; 
        if (bNaN) return -1;
        if (valA < valB) return -1 * mult; 
        if (valA > valB) return 1 * mult; 
        return 0;
    });
}
