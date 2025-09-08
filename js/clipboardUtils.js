/**
 * @fileoverview Utility functions for handling clipboard operations.
 */

import { updateStatus } from './statusUtils.js';
import { getCurrentGroupingState } from './keywordGroupingUI.js';

/**
 * Copies the current filtered and sorted data to the clipboard in a tab-delimited format.
 * When keyword grouping is active, includes group information in the output.
 * 
 * @param {Object} options - Options for copying data
 * @param {Array} options.filteredAndSortedData - The filtered and sorted data to copy
 * @param {Array} options.currentQueryData - The current query data
 * @param {Object} options.currentMetadata - The current metadata
 * @returns {Promise<void>} A promise that resolves when the copy operation is complete
 */
export function copyToClipboard({ 
    filteredAndSortedData, 
    currentQueryData, 
    currentMetadata 
}) {
    if (!filteredAndSortedData?.length) return Promise.resolve();
    
    // Check if keyword grouping is active
    const groupingState = getCurrentGroupingState();
    
    if (groupingState.enabled && groupingState.result) {
        return copyGroupedDataToClipboard(groupingState.result, currentQueryData, currentMetadata);
    } else {
        return copyNormalDataToClipboard(filteredAndSortedData, currentQueryData, currentMetadata);
    }
}

/**
 * Copy normal (non-grouped) data to clipboard
 */
function copyNormalDataToClipboard(filteredAndSortedData, currentQueryData, currentMetadata) {
    const headers = 'Query\tClicks\tImpressions\tCTR (%)\tPosition\n';
    const text = headers + filteredAndSortedData.map(i => {
        const c = i.clicks !== null && i.clicks !== undefined ? i.clicks.toLocaleString() : '-';
        const m = i.impressions !== null && i.impressions !== undefined ? i.impressions.toLocaleString() : '-';
        const r = i.ctr !== null && i.ctr !== undefined ? (parseFloat(i.ctr) * 100).toFixed(2) + '%' : '-';
        const p = i.position !== null && i.position !== undefined ? parseFloat(i.position).toFixed(2) : '-';
        return [i.query || '', c, m, r, p].join('\t');
    }).join('\n');
    
    return navigator.clipboard.writeText(text)
        .then(() => {
            updateStatus('Visible data copied!');
            setTimeout(() => { 
                if (currentMetadata) 
                    updateStatus(`Showing ${filteredAndSortedData.length} of ${currentQueryData.length} keywords`); 
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            updateStatus('Failed to copy!', true);
            setTimeout(() => { 
                if (currentMetadata) 
                    updateStatus(`Showing ${filteredAndSortedData.length} of ${currentQueryData.length} keywords`); 
            }, 2000);
        });
}

/**
 * Copy grouped data to clipboard with group information
 */
function copyGroupedDataToClipboard(groupingResult, currentQueryData, currentMetadata) {
    const headers = 'Query\tClicks\tImpressions\tCTR (%)\tPosition\tGroup Topic\tGroup Size\tGroup Total Clicks\tGroup Avg Position\n';
    let text = headers;
    
    // Add grouped keywords
    groupingResult.groups.forEach(group => {
        // Add group header separator
        text += `\n--- ${group.topic} ---\n`;
        
        group.keywords.forEach(keyword => {
            const c = keyword.clicks !== null && keyword.clicks !== undefined ? keyword.clicks.toLocaleString() : '-';
            const m = keyword.impressions !== null && keyword.impressions !== undefined ? keyword.impressions.toLocaleString() : '-';
            const r = keyword.ctr !== null && keyword.ctr !== undefined ? (parseFloat(keyword.ctr) * 100).toFixed(2) + '%' : '-';
            const p = keyword.position !== null && keyword.position !== undefined ? parseFloat(keyword.position).toFixed(2) : '-';
            
            const row = [
                keyword.query || '',
                c,
                m,
                r,
                p,
                group.topic,
                group.size.toString(),
                group.metrics.totalClicks.toLocaleString(),
                group.metrics.avgPosition.toFixed(2)
            ].join('\t');
            
            text += row + '\n';
        });
    });
    
    // Add ungrouped keywords if any
    if (groupingResult.ungrouped.length > 0) {
        text += '\n--- Ungrouped Keywords ---\n';
        
        groupingResult.ungrouped.forEach(keyword => {
            const c = keyword.clicks !== null && keyword.clicks !== undefined ? keyword.clicks.toLocaleString() : '-';
            const m = keyword.impressions !== null && keyword.impressions !== undefined ? keyword.impressions.toLocaleString() : '-';
            const r = keyword.ctr !== null && keyword.ctr !== undefined ? (parseFloat(keyword.ctr) * 100).toFixed(2) + '%' : '-';
            const p = keyword.position !== null && keyword.position !== undefined ? parseFloat(keyword.position).toFixed(2) : '-';
            
            const row = [
                keyword.query || '',
                c,
                m,
                r,
                p,
                'Ungrouped',
                '1',
                (keyword.clicks || 0).toLocaleString(),
                (keyword.position || 0).toFixed(2)
            ].join('\t');
            
            text += row + '\n';
        });
    }
    
    return navigator.clipboard.writeText(text)
        .then(() => {
            const totalKeywords = groupingResult.groups.reduce((sum, group) => sum + group.size, 0) + groupingResult.ungrouped.length;
            updateStatus(`Grouped data copied! ${groupingResult.totalGroups} groups, ${totalKeywords} keywords`);
            setTimeout(() => { 
                if (currentMetadata) 
                    updateStatus(`Showing ${groupingResult.totalGroups} groups from ${groupingResult.totalKeywords} keywords`); 
            }, 2000);
        })
        .catch(err => {
            console.error('Failed to copy grouped data: ', err);
            updateStatus('Failed to copy grouped data!', true);
            setTimeout(() => { 
                if (currentMetadata) 
                    updateStatus(`Showing ${groupingResult.totalGroups} groups from ${groupingResult.totalKeywords} keywords`); 
            }, 2000);
        });
}
