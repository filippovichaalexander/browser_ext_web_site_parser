/**
 * @fileoverview Utility functions for handling UI display operations.
 */

import { updateStatus } from './statusUtils.js';

/**
 * Refreshes the data display in the UI with the filtered and sorted data
 * 
 * @param {Object} options - Options for refreshing the data display
 * @param {Array} options.filteredAndSortedData - The filtered and sorted data to display
 * @param {Array} options.previousQueryData - Previous period query data for comparison
 * @param {number} options.currentPage - Current page number
 * @param {number} options.rowsPerPage - Number of rows per page
 * @param {Function} options.updateTableHeaders - Function to update table headers
 * @param {Function} options.handleSortClick - Function to handle column header clicks for sorting
 * @param {Function} options.createPaginationControls - Function to create pagination controls
 * @returns {void}
 */
export function refreshDataDisplay({
    filteredAndSortedData,
    previousQueryData,
    currentPage,
    rowsPerPage,
    updateTableHeaders,
    handleSortClick,
    createPaginationControls
}) {
    // Keep all filtered data in filteredAndSortedData for export/copy operations
    // But only display the current page's worth of data
    const totalItems = filteredAndSortedData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
    
    // Make sure current page is valid (between 1 and totalPages)
    let validCurrentPage = currentPage;
    if (validCurrentPage < 1) validCurrentPage = 1;
    if (validCurrentPage > totalPages) validCurrentPage = totalPages;
    
    // Calculate slice indexes for current page
    const startIndex = (validCurrentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
    
    // Get data slice for the current page
    const dataToDisplay = filteredAndSortedData.slice(startIndex, endIndex);
    
    const tableContainer = document.getElementById('queryData');
    let metaDiv = tableContainer?.querySelector('.data-meta'); // Find existing metadata div
    if (!metaDiv && tableContainer) { // If missing, recreate (shouldn't happen often)
        metaDiv = document.createElement('div');
        metaDiv.className = 'data-meta';
        tableContainer.insertBefore(metaDiv, tableContainer.firstChild);
        // Note: We don't call displayMetadata() here as it's not passed in
    }
    
    // Remove previous table/no-data message *after* the metadata div
    const existingTable = tableContainer?.querySelector('table');
    if (existingTable) existingTable.remove();
    const existingNoData = tableContainer?.querySelector('.no-data');
    if (existingNoData) existingNoData.remove();
    
    // Remove existing pagination controls if any
    const existingPagination = tableContainer?.querySelector('.pagination-controls');
    if (existingPagination) existingPagination.remove();
    
    // Remove existing export note if any
    const existingExportNote = tableContainer?.querySelector('.export-copy-note');
    if (existingExportNote) existingExportNote.remove();

    // Build a map for quick lookup of previous data (if available)
    const prevDataMap = new Map();
    if (previousQueryData && previousQueryData.length > 0) {
        previousQueryData.forEach(item => {
            prevDataMap.set((item.query || '').toLowerCase(), item);
        });
    }

    if (filteredAndSortedData.length === 0) {
        const noDataMsg = document.createElement('div');
        noDataMsg.className = 'no-data';
        noDataMsg.textContent = 'No keywords match the current filter/search.';
        tableContainer?.appendChild(noDataMsg);
        if (updateTableHeaders) updateTableHeaders(); // Reset headers
        return;
    }

    // --- Create Table ---
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    
    // Create table headers with data-sort-key for sorting functionality
    thead.innerHTML = `<tr>
        <th data-sort-key="query" class="resizable-th">Query <span class="sort-arrow"></span></th>
        <th data-sort-key="clicks" class="resizable-th">Clicks <span class="sort-arrow"></span></th>
        <th data-sort-key="impressions" class="resizable-th">Impressions <span class="sort-arrow"></span></th>
        <th data-sort-key="ctr" class="resizable-th">CTR <span class="sort-arrow"></span></th>
        <th data-sort-key="position" class="resizable-th">Position <span class="sort-arrow"></span></th>
    </tr>`;
    
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableContainer?.appendChild(table); // Append table

    // Add event listeners for sorting and prepare for resizing
    if (handleSortClick) {
        thead.querySelectorAll('th').forEach(th => th.addEventListener('click', handleSortClick));
    }

    // --- Populate Table Rows ---
    const rowsHTML = dataToDisplay.map(item => {
        const prevItem = prevDataMap.get((item.query || '').toLowerCase());
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(item.query || '')}`;
        const formatDelta = (curr, prev, higherBetter) => {
            if (prev === undefined || prev === null || curr === undefined || curr === null) return '';
            let cVal = parseFloat(curr), pVal = parseFloat(prev);
            if (isNaN(cVal) || isNaN(pVal)) return '';
            const delta = cVal - pVal;
            // Use a small threshold for floating point comparisons, but allow 0 difference
            if (Math.abs(delta) < 0.00001 && delta !== 0) return `<span class="delta delta-zero">(±0)</span>`; // Show zero if very close
            if (delta === 0) return `<span class="delta delta-zero">(±0)</span>`;

            const prefix = delta > 0 ? '+' : '';
            let valStr = '';
            // Format based on metric type (implicitly handled by caller now)
            if (Math.abs(delta) >= 1 || delta === 0) { // Clicks/Impressions (whole numbers)
                valStr = Math.round(delta).toLocaleString();
            } else { // CTR/Position (decimals likely) - formatDelta is not used for these directly anymore
                valStr = delta.toFixed(2); // Fallback, though specific formatting happens below
            }

            let css = 'delta-zero';
            if (delta > 0) css = higherBetter ? 'delta-pos' : 'delta-neg';
            if (delta < 0) css = higherBetter ? 'delta-neg' : 'delta-pos';
            return `<span class="delta ${css}">(${prefix}${valStr})</span>`;
        };

        const formatPercentageDelta = (curr, prev, higherBetter) => {
            // Ensure both current and previous values are valid numbers
            if (curr === undefined || curr === null || prev === undefined || prev === null) return '';
            let cVal = parseFloat(curr);
            let pVal = parseFloat(prev);
            if (isNaN(cVal) || isNaN(pVal)) return '';

            // Handle division by zero explicitly
            if (pVal === 0) {
                // If current value is also 0, change is 0%. If current > 0, it's infinite growth (display N/A or similar)
                return cVal === 0 ? `<span class="delta delta-zero">(±0.0%)</span>` : `<span class="delta">(N/A)</span>`;
            }

            const percentChange = ((cVal - pVal) / pVal) * 100;

            // Handle very small changes close to zero
            if (Math.abs(percentChange) < 0.01) return `<span class="delta delta-zero">(±0.0%)</span>`;

            const prefix = percentChange > 0 ? '+' : '';
            const valStr = percentChange.toFixed(1) + '%'; // One decimal place

            let css = 'delta-zero';
            // Determine color based on whether higher is better
            if (percentChange > 0) css = higherBetter ? 'delta-pos' : 'delta-neg';
            if (percentChange < 0) css = higherBetter ? 'delta-neg' : 'delta-pos';

            return `<span class="delta ${css}">(${prefix}${valStr})</span>`;
        };
        // Calculate Absolute Deltas
        const clkAbsDelta = formatDelta(item.clicks, prevItem?.clicks, true);
        const impAbsDelta = formatDelta(item.impressions, prevItem?.impressions, true);
        // For CTR/Position, calculate absolute delta manually for display precision
        const ctrAbsDeltaRaw = (prevItem?.ctr !== undefined && prevItem?.ctr !== null && item.ctr !== undefined && item.ctr !== null) ? (parseFloat(item.ctr) - parseFloat(prevItem.ctr)) * 100 : null;
        const posAbsDeltaRaw = (prevItem?.position !== undefined && prevItem?.position !== null && item.position !== undefined && item.position !== null) ? parseFloat(item.position) - parseFloat(prevItem.position) : null;

        const formatAbsDeltaManual = (delta, higherBetter, decimals = 2) => {
            if (delta === null || isNaN(delta)) return '';
            if (Math.abs(delta) < 0.001 && delta !== 0) return `<span class="delta delta-zero">(±0.00)</span>`;
            if (delta === 0) return `<span class="delta delta-zero">(±0.00)</span>`;
            const prefix = delta > 0 ? '+' : '';
            const valStr = delta.toFixed(decimals);
            let css = 'delta-zero';
            if (delta > 0) css = higherBetter ? 'delta-pos' : 'delta-neg';
            if (delta < 0) css = higherBetter ? 'delta-neg' : 'delta-pos';
            return `<span class="delta ${css}">(${prefix}${valStr})</span>`;
        };
        const ctrAbsDelta = formatAbsDeltaManual(ctrAbsDeltaRaw, true, 2); // Higher CTR is better, 2 decimals for % points
        const posAbsDelta = formatAbsDeltaManual(posAbsDeltaRaw, false, 2); // Lower Position is better, 2 decimals

        // Calculate Percentage Deltas
        const clkPercDelta = formatPercentageDelta(item.clicks, prevItem?.clicks, true);
        const impPercDelta = formatPercentageDelta(item.impressions, prevItem?.impressions, true);
        const ctrPercDelta = formatPercentageDelta(item.ctr, prevItem?.ctr, true); // Higher CTR is better
        const posPercDelta = formatPercentageDelta(item.position, prevItem?.position, false); // Lower Position is better

        // Format Display Values
        const dClk = item.clicks !== null && item.clicks !== undefined ? item.clicks.toLocaleString() : '-';
        const dImp = item.impressions !== null && item.impressions !== undefined ? item.impressions.toLocaleString() : '-';
        const dCtr = item.ctr !== null && item.ctr !== undefined ? (parseFloat(item.ctr) * 100).toFixed(2) + '%' : '-';
        const dPos = item.position !== null && item.position !== undefined ? parseFloat(item.position).toFixed(2) : '-';

        // Construct Row HTML with both absolute and percentage deltas (Ensure percentage is included)
        return `<tr>
                    <td>
                        <div class="keyword-cell">
                            <a href="${googleSearchUrl}" target="_blank" title="Search on Google">${item.query || ''}</a>
                            ${item.isLostKeyword ? '<span class="lost-badge">LOST</span>' : prevItem ? '' : previousQueryData && previousQueryData.length > 0 ? '<span class="new-badge">NEW</span>' : ''}
                            <div class="action-icons">
                                <span class="action-icon copy-icon" title="Copy Keyword" data-keyword="${item.query || ''}">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#4285F4">
                                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                    </svg>
                                </span>
                                <span class="action-icon search-icon" title="Search on Google" data-keyword="${item.query || ''}">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#DB4437">
                                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                                    </svg>
                                </span>
                                <span class="action-icon gsc-icon" title="Analyze in Search Console" data-keyword="${item.query || ''}">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#34A853">
                                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-2h2V7h-4v2h2v8z"/>
                                    </svg>
                                </span>
                                <span class="action-icon trends-icon" title="View in Google Trends" data-keyword="${item.query || ''}">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#FBBC05">
                                        <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
                                    </svg>
                                </span>
                            </div>
                        </div>
                    </td>
                    <td style="text-align: right;">${dClk} ${prevItem ? `<br>${clkAbsDelta || ''} ${clkPercDelta || ''}` : ''}</td>
                    <td style="text-align: right;">${dImp} ${prevItem ? `<br>${impAbsDelta || ''} ${impPercDelta || ''}` : ''}</td>
                    <td style="text-align: right;">${dCtr} ${prevItem ? `<br>${ctrAbsDelta || ''} ${ctrPercDelta || ''}` : ''}</td>
                    <td style="text-align: right;">${dPos} ${prevItem ? `<br>${posAbsDelta || ''} ${posPercDelta || ''}` : ''}</td>
                </tr>`;
    }).join('');
    tbody.innerHTML = rowsHTML;
    
    if (updateTableHeaders) updateTableHeaders(); // Update sort indicators
    
    // Create pagination controls
    if (filteredAndSortedData.length > 0 && createPaginationControls) {
        createPaginationControls(tableContainer, totalItems, totalPages, startIndex, endIndex);
    }
}

/**
 * Creates and appends pagination controls to the container
 * 
 * @param {HTMLElement} container - The container to append pagination controls to
 * @param {number} totalItems - Total number of items
 * @param {number} totalPages - Total number of pages
 * @param {number} startIndex - Start index of current page
 * @param {number} endIndex - End index of current page
 * @param {Object} options - Additional options
 * @param {number} options.currentPage - Current page number
 * @param {number} options.rowsPerPage - Number of rows per page
 * @param {Function} options.onPageChange - Callback when page changes
 * @param {Function} options.onRowsPerPageChange - Callback when rows per page changes
 */
export function createPaginationControls(
    container, 
    totalItems, 
    totalPages, 
    startIndex, 
    endIndex, 
    { currentPage, rowsPerPage, onPageChange, onRowsPerPageChange }
) {
    if (!container) return;
    
    // Create pagination controls container
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-controls';
    
    // Information about current range
    const rangeInfo = document.createElement('div');
    rangeInfo.className = 'pagination-info';
    rangeInfo.style.fontSize = '13px';
    rangeInfo.style.color = '#666';
    rangeInfo.textContent = `Showing ${startIndex + 1}–${endIndex} of ${totalItems} keywords`;
    
    // Navigation buttons container
    const navButtons = document.createElement('div');
    navButtons.className = 'pagination-nav';
    
    // First page button
    const firstBtn = document.createElement('button');
    firstBtn.innerHTML = '&laquo;';
    firstBtn.title = 'First Page';
    firstBtn.disabled = currentPage === 1;
    firstBtn.addEventListener('click', () => {
        if (currentPage !== 1 && onPageChange) {
            onPageChange(1);
        }
    });
    
    // Previous page button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '&lsaquo;';
    prevBtn.title = 'Previous Page';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1 && onPageChange) {
            onPageChange(currentPage - 1);
        }
    });
    
    // Page indicator
    const pageIndicator = document.createElement('span');
    pageIndicator.style.padding = '5px 10px';
    pageIndicator.style.background = 'white';
    pageIndicator.style.border = '1px solid #ddd';
    pageIndicator.style.borderRadius = '4px';
    pageIndicator.style.minWidth = '60px';
    pageIndicator.style.textAlign = 'center';
    pageIndicator.textContent = `${currentPage} / ${totalPages}`;
    
    // Next page button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '&rsaquo;';
    nextBtn.title = 'Next Page';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages && onPageChange) {
            onPageChange(currentPage + 1);
        }
    });
    
    // Last page button
    const lastBtn = document.createElement('button');
    lastBtn.innerHTML = '&raquo;';
    lastBtn.title = 'Last Page';
    lastBtn.disabled = currentPage === totalPages;
    lastBtn.addEventListener('click', () => {
        if (currentPage !== totalPages && onPageChange) {
            onPageChange(totalPages);
        }
    });
    
    // Rows per page selector
    const rowsPerPageContainer = document.createElement('div');
    rowsPerPageContainer.style.display = 'flex';
    rowsPerPageContainer.style.alignItems = 'center';
    rowsPerPageContainer.style.gap = '5px';
    
    const rowsLabel = document.createElement('label');
    rowsLabel.textContent = 'Rows per page:';
    rowsLabel.style.fontSize = '13px';
    rowsLabel.style.color = '#666';
    
    const rowsSelect = document.createElement('select');
    rowsSelect.style.padding = '5px';
    rowsSelect.style.border = '1px solid #ddd';
    rowsSelect.style.borderRadius = '4px';
    rowsSelect.style.background = 'white';
    
    // Row options
    [25, 50, 100, 250, 500].forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        option.selected = rowsPerPage === value;
        rowsSelect.appendChild(option);
    });
    
    rowsSelect.addEventListener('change', () => {
        const newRowsPerPage = parseInt(rowsSelect.value);
        if (newRowsPerPage !== rowsPerPage && onRowsPerPageChange) {
            onRowsPerPageChange(newRowsPerPage);
        }
    });
    
    // Add export/copy note
    const exportNote = document.createElement('div');
    exportNote.className = 'export-copy-note';
    exportNote.textContent = 'Note: Export/Copy includes all filtered data, not just the current page';
    
    // Append all elements
    rowsPerPageContainer.appendChild(rowsLabel);
    rowsPerPageContainer.appendChild(rowsSelect);
    
    navButtons.appendChild(firstBtn);
    navButtons.appendChild(prevBtn);
    navButtons.appendChild(pageIndicator);
    navButtons.appendChild(nextBtn);
    navButtons.appendChild(lastBtn);
    
    paginationDiv.appendChild(rangeInfo);
    paginationDiv.appendChild(rowsPerPageContainer);
    paginationDiv.appendChild(navButtons);
    
    // Add the pagination controls to the container
    container.appendChild(paginationDiv);
    container.appendChild(exportNote);
}

/**
 * Updates the table headers with sort indicators
 * 
 * @param {Object} options - Options for updating table headers
 * @param {Array} options.currentSortKeys - Array of current sort keys and directions
 */
export function updateTableHeaders({ currentSortKeys }) {
    document.querySelectorAll('#queryData thead th').forEach((th, index) => {
        th.classList.remove('sort-asc', 'sort-desc', 'sort-multi');
        th.querySelector('.sort-arrow').textContent = ''; // Clear any previous number
        const key = th.dataset.sortKey;
        if (!key) return;

        const sortIndex = currentSortKeys.findIndex(sk => sk.key === key);

        if (sortIndex !== -1) {
            const { direction } = currentSortKeys[sortIndex];
            th.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
            if (currentSortKeys.length > 1) {
                th.classList.add('sort-multi');
                // Add a number indicator for sort order
                th.querySelector('.sort-arrow').textContent = ` ${sortIndex + 1}`;
            }
        }
    });
}

/**
 * Sets up column resizing functionality for table headers
 * This allows users to resize columns in the data table by dragging
 */
export function setupColumnResizing() {
  const table = document.querySelector('table');
  if (!table) return; // No table found yet
  
  // Get all table headers
  const headers = table.querySelectorAll('th');
  
  // Load saved column widths from storage
  chrome.storage.local.get(['columnWidths'], function(result) {
    const savedWidths = result.columnWidths || {};
    
    // Add resizer elements to each header and apply saved widths
    headers.forEach((header, index) => {
      // Add class for styling
      header.classList.add('resizable-th');
      
      // Create resizer element
      const resizer = document.createElement('div');
      resizer.classList.add('column-resizer');
      
      // Prevent existing resizers from being duplicated
      if (header.querySelector('.column-resizer')) {
          header.querySelector('.column-resizer').remove();
      }
      header.appendChild(resizer);
      
      // Apply saved width if available
      if (savedWidths[index]) {
        header.style.width = savedWidths[index];
        // Also apply to all cells in this column
        const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
        cells.forEach(cell => {
          cell.style.width = savedWidths[index];
        });
      }
      
      // Add resize event listeners
      resizer.addEventListener('mousedown', function(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent mousedown from triggering anything else
        
        window.isResizing = true; // Set the global flag
        
        resizer.classList.add('resizing');
        
        // Calculate initial positions
        const startX = e.pageX;
        const startWidth = header.offsetWidth;
        
        // Handle mouse movement for resizing
        function onMouseMove(e) {
          // Calculate new width
          const newWidth = startWidth + (e.pageX - startX);
          if (newWidth > 50) { // Minimum width constraint
            // Apply new width to header
            header.style.width = `${newWidth}px`;
            
            // Apply to all cells in this column
            const cells = table.querySelectorAll(`td:nth-child(${index + 1})`);
            cells.forEach(cell => {
              cell.style.width = `${newWidth}px`;
            });
          }
        }
        
        // Handle mouse up to stop resizing
        function onMouseUp(e) {
          // This is the fix: stop the event from propagating further.
          // This prevents the 'click' event from being fired on the column header after resizing.
          e.stopPropagation();

          resizer.classList.remove('resizing');
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          
          // Save the new column widths
          saveColumnWidths();
          
          // Use a short timeout to reset the flag. This ensures that the 'click' event
          // which fires after 'mouseup' can be properly ignored by the sort handler.
          setTimeout(() => {
            window.isResizing = false;
          }, 100);
        }
        
        // Add temporary event listeners for drag operation
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
  });
}

/**
 * Save current column widths to chrome storage
 */
export function saveColumnWidths() {
  const headers = document.querySelectorAll('th');
  const widths = {};
  
  headers.forEach((header, index) => {
    widths[index] = header.style.width || '';
  });
  
  chrome.storage.local.set({ columnWidths: widths }, function() {
    console.log('Column widths saved');
  });
}

/**
 * Initializes collapsible sections in the UI
 * Handles the expanding/collapsing of options sections and preserves user preferences
 */
export function initCollapsibleSections() {
  // Fetch options section
  const fetchOptionsToggle = document.getElementById('fetch-options-toggle');
  const fetchOptionsContent = document.getElementById('fetch-options-content');
  
  // Analysis options section
  const analysisOptionsToggle = document.getElementById('analysis-options-toggle');
  const analysisOptionsContent = document.getElementById('analysis-options-content');
  
  // Initial state (collapsed by default)
  let fetchOptionsExpanded = false;
  let analysisOptionsExpanded = false;
  
  // Add event listener to analysis options toggle button
  if (analysisOptionsToggle && analysisOptionsContent) {
    analysisOptionsToggle.addEventListener('click', () => {
      analysisOptionsExpanded = !analysisOptionsExpanded;
      
      if (analysisOptionsExpanded) {
        analysisOptionsContent.classList.add('expanded');
        analysisOptionsToggle.textContent = 'Advanced Analysis Options ▲';
      } else {
        analysisOptionsContent.classList.remove('expanded');
        analysisOptionsToggle.textContent = 'Advanced Analysis Options ▼';
      }
      
      // Save preference to local storage
      chrome.storage.local.set({ 'analysisOptionsExpanded': analysisOptionsExpanded });
    });
  }
  
  // Load user preferences for sections visibility
  chrome.storage.local.get(['fetchOptionsExpanded', 'analysisOptionsExpanded'], (result) => {
    // Handle fetch options section
    if (result.fetchOptionsExpanded && fetchOptionsContent) {
      fetchOptionsExpanded = result.fetchOptionsExpanded;
      if (fetchOptionsExpanded) {
        fetchOptionsContent.classList.add('expanded');
        if (fetchOptionsToggle) fetchOptionsToggle.textContent = 'Advanced Fetch Options ▲';
      }
    }
    
    // Handle analysis options section
    if (result.analysisOptionsExpanded && analysisOptionsContent) {
      analysisOptionsExpanded = result.analysisOptionsExpanded;
      if (analysisOptionsExpanded) {
        analysisOptionsContent.classList.add('expanded');
        if (analysisOptionsToggle) analysisOptionsToggle.textContent = 'Advanced Analysis Options ▲';
      }
    }
  });
}
