/**
 * Utility functions for data export in the GSC extension
 */

import { triggerDownload } from './downloadUtils.js';
import { updateStatus } from './statusUtils.js';
import { getCurrentGroupingState } from './keywordGroupingUI.js';
import { exportGroupedData } from './keywordGroupingUtils.js';

/**
 * Exports the filtered and sorted data to CSV or Excel format
 * When keyword grouping is active, includes group information in the export
 * @param {Object} options - Export options
 * @param {string} options.format - Export format ('csv' or 'excel')
 * @param {Array} options.filteredAndSortedData - The filtered and sorted data to export
 * @param {string} options.currentDomain - The current domain
 * @param {Object} options.currentMetadata - Metadata for the current data
 * @param {number} options.currentQueryDataLength - Length of the unfiltered data array
 */
export function exportData({ 
    format, 
    filteredAndSortedData, 
    currentDomain, 
    currentMetadata,
    currentQueryDataLength
}) {
    // Check if keyword grouping is active
    const groupingState = getCurrentGroupingState();
    
    if (groupingState.enabled && groupingState.result) {
        return exportGroupedKeywords({ 
            format, 
            groupingResult: groupingState.result,
            currentDomain, 
            currentMetadata
        });
    }
    
    if (!filteredAndSortedData?.length) {
        alert("No visible data to export.");
        return;
    }

    // --- Prepare filename parts ---
    const date = new Date().toISOString().split('T')[0];
    // Determine scope from metadata - domain properties or missing pageUrl = domain-wide
    const isDomainWide = !currentMetadata?.pageUrl || currentMetadata?.siteUrl?.startsWith('sc-domain:');
    const scope = isDomainWide ? 'domain' : 'page';
    const filter = '_filtered'; // Use generic filter indicator for now
    let domain = 'gsc';
    if (currentDomain) domain = currentDomain.replace(/[^\w.-]/g, '_');
    else if (currentMetadata?.siteUrl) domain = currentMetadata.siteUrl.replace(/^sc-domain:/, '').replace(/[^\w.-]/g, '_');
    const baseFilename = `${domain}_${scope}_keywords_${date}${filter}`;

    // --- Prepare data for export ---
    // Header row
    const headers = ['Query', 'Clicks', 'Impressions', 'CTR (%)', 'Position'];
    // Data rows (map your filtered data)
    const dataRows = filteredAndSortedData.map(i => {
        const q = String(i.query || '');
        const c = i.clicks ?? null; // Use null for SheetJS to handle blanks better
        const m = i.impressions ?? null;
        // Store CTR and Position as numbers for Excel formatting
        const r = i.ctr !== null && i.ctr !== undefined ? parseFloat(i.ctr) : null;
        const p = i.position !== null && i.position !== undefined ? parseFloat(i.position) : null;
        return [q, c, m, r, p];
    });

    // Combine headers and data rows
    const exportDataArray = [headers, ...dataRows];

    // --- Generate File based on format ---
    if (format === 'excel') {
        try {
            // 1. Create a new Workbook
            const wb = XLSX.utils.book_new();

            // 2. Convert the array of arrays into a Worksheet
            const ws = XLSX.utils.aoa_to_sheet(exportDataArray);

            // 3. (Optional but recommended) Set column types/formats
            // Define column formats - 's' for string, 'n' for number
            // Match the order of your headers array
            ws['!cols'] = [
                { wch: 50 }, // Query (Set width)
                { wch: 12, z: '#,##0' }, // Clicks (width + integer format)
                { wch: 15, z: '#,##0' }, // Impressions (width + integer format)
                { wch: 12, z: '0.00%' }, // CTR (width + percentage format)
                { wch: 12, z: '0.00' }  // Position (width + decimal format)
            ];

            // Set cell types explicitly if needed (often aoa_to_sheet detects well)
            // Example for CTR and Position columns (assuming dataRows starts at index 1)
            for (let R = 1; R < exportDataArray.length; ++R) {
                 const ctrCellRef = XLSX.utils.encode_cell({c: 3, r: R}); // Column D
                 if(ws[ctrCellRef] && ws[ctrCellRef].v !== null) ws[ctrCellRef].t = 'n'; // Force number type

                 const posCellRef = XLSX.utils.encode_cell({c: 4, r: R}); // Column E
                 if(ws[posCellRef] && ws[posCellRef].v !== null) ws[posCellRef].t = 'n'; // Force number type
            }

            // 4. Add the Worksheet to the Workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Keywords'); // Name the sheet "Keywords"

            // 5. Generate the XLSX file data (as an ArrayBuffer)
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

            // 6. Create a Blob
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // 7. Trigger Download
            const filename = `${baseFilename}.xlsx`;
            triggerDownload(blob, filename);
            updateStatus('Visible data exported as Excel.', false);

        } catch (error) {
            console.error("Error generating Excel file:", error);
            alert("Error creating Excel file. Check console for details.");
            updateStatus('Excel export failed.', true);
        }

    } else { // --- CSV Export (Your original logic, slightly cleaned) ---
        const bom = '\uFEFF'; // Always good practice for CSV UTF-8
        const csvContent = bom + exportDataArray.map(row => {
             return row.map(cell => {
                 let cellStr = cell === null || cell === undefined ? '' : String(cell);
                 // Basic CSV quoting: quote if it contains comma, double quote, or newline
                 if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                     cellStr = `"${cellStr.replace(/"/g, '""')}"`; // Escape double quotes
                 }
                 return cellStr;
             }).join(','); // Join cells with commas
         }).join('\n'); // Join rows with newlines

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const filename = `${baseFilename}.csv`;
        triggerDownload(blob, filename);
        updateStatus('Visible data exported as CSV.', false);
    }

    // Clear status message after a delay
    setTimeout(() => {
        if (currentMetadata) {
            updateStatus(`Showing ${filteredAndSortedData.length} of ${currentQueryDataLength} keywords`);
        } else {
            updateStatus("Ready.");
        }
    }, 2500);
}

/**
 * Export grouped keywords with group information
 * @param {Object} options - Export options for grouped data
 * @param {string} options.format - Export format ('csv' or 'excel')
 * @param {Object} options.groupingResult - The grouping result containing groups and ungrouped keywords
 * @param {string} options.currentDomain - The current domain
 * @param {Object} options.currentMetadata - Metadata for the current data
 */
function exportGroupedKeywords({ format, groupingResult, currentDomain, currentMetadata }) {
    // Get formatted data with group information
    const exportData = exportGroupedData(groupingResult);
    
    if (!exportData?.length) {
        alert("No grouped data to export.");
        return;
    }

    // --- Prepare filename parts ---
    const date = new Date().toISOString().split('T')[0];
    const isDomainWide = !currentMetadata?.pageUrl || currentMetadata?.siteUrl?.startsWith('sc-domain:');
    const scope = isDomainWide ? 'domain' : 'page';
    const filter = '_grouped'; // Indicate this is grouped data
    let domain = 'gsc';
    if (currentDomain) domain = currentDomain.replace(/[^\w.-]/g, '_');
    else if (currentMetadata?.siteUrl) domain = currentMetadata.siteUrl.replace(/^sc-domain:/, '').replace(/[^\w.-]/g, '_');
    const baseFilename = `${domain}_${scope}_keywords_${date}${filter}`;

    // --- Prepare headers and data ---
    const headers = [
        'Query', 
        'Clicks', 
        'Impressions', 
        'CTR (%)', 
        'Position',
        'Group Topic',
        'Group Size',
        'Group Total Clicks',
        'Group Avg Position'
    ];
    
    const dataRows = exportData.map(item => [
        String(item.keyword || ''),
        item.clicks ?? null,
        item.impressions ?? null,
        item.ctr !== null && item.ctr !== undefined ? parseFloat(item.ctr) : null,
        item.position !== null && item.position !== undefined ? parseFloat(item.position) : null,
        String(item.group_topic || ''),
        item.group_size ?? null,
        item.group_total_clicks ?? null,
        item.group_avg_position !== null && item.group_avg_position !== undefined ? parseFloat(item.group_avg_position) : null
    ]);

    const exportDataArray = [headers, ...dataRows];

    // --- Generate File based on format ---
    if (format === 'excel') {
        try {
            // Create workbook with grouped data
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(exportDataArray);

            // Set column formats for grouped data
            ws['!cols'] = [
                { wch: 50 }, // Query
                { wch: 12, z: '#,##0' }, // Clicks
                { wch: 15, z: '#,##0' }, // Impressions
                { wch: 12, z: '0.00%' }, // CTR
                { wch: 12, z: '0.00' },  // Position
                { wch: 30 }, // Group Topic
                { wch: 12, z: '#,##0' }, // Group Size
                { wch: 18, z: '#,##0' }, // Group Total Clicks
                { wch: 18, z: '0.00' }   // Group Avg Position
            ];

            // Set cell types for numeric columns
            for (let R = 1; R < exportDataArray.length; ++R) {
                // CTR column (D)
                const ctrCellRef = XLSX.utils.encode_cell({c: 3, r: R});
                if(ws[ctrCellRef] && ws[ctrCellRef].v !== null) ws[ctrCellRef].t = 'n';

                // Position column (E)
                const posCellRef = XLSX.utils.encode_cell({c: 4, r: R});
                if(ws[posCellRef] && ws[posCellRef].v !== null) ws[posCellRef].t = 'n';

                // Group Avg Position column (I)
                const groupPosCellRef = XLSX.utils.encode_cell({c: 8, r: R});
                if(ws[groupPosCellRef] && ws[groupPosCellRef].v !== null) ws[groupPosCellRef].t = 'n';
            }

            XLSX.utils.book_append_sheet(wb, ws, 'Grouped Keywords');
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const filename = `${baseFilename}.xlsx`;
            triggerDownload(blob, filename);
            updateStatus(`Grouped data exported as Excel: ${groupingResult.totalGroups} groups, ${exportData.length} keywords`, false);

        } catch (error) {
            console.error("Error generating grouped Excel file:", error);
            alert("Error creating grouped Excel file. Check console for details.");
            updateStatus('Grouped Excel export failed.', true);
        }

    } else { // CSV Export
        const bom = '\uFEFF';
        const csvContent = bom + exportDataArray.map(row => {
            return row.map(cell => {
                let cellStr = cell === null || cell === undefined ? '' : String(cell);
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    cellStr = `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',');
        }).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const filename = `${baseFilename}.csv`;
        triggerDownload(blob, filename);
        updateStatus(`Grouped data exported as CSV: ${groupingResult.totalGroups} groups, ${exportData.length} keywords`, false);
    }

    // Clear status message after a delay
    setTimeout(() => {
        if (currentMetadata) {
            updateStatus(`Showing ${groupingResult.totalGroups} groups from ${groupingResult.totalKeywords} keywords`);
        } else {
            updateStatus("Ready.");
        }
    }, 2500);
}
