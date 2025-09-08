/**
 * Keyword Grouping UI Integration
 * Handles the user interface for keyword grouping functionality
 */

import { 
  groupKeywords, 
  filterGroups, 
  exportGroupedData,
  classifyIntent 
} from './keywordGroupingUtils.js';

// Global state for grouping
let currentGroupingResult = null;
let groupingEnabled = false;
let currentGroupFilters = {
  intent: null,
  minClicks: null,
  minSize: null,
  searchTerm: null
};

/**
 * Initialize grouping UI event listeners
 */
export function initializeGroupingUI() {
  const groupingToggle = document.getElementById('keyword-grouping-toggle');
  const groupingDropdown = document.getElementById('keyword-grouping-dropdown');
  const applyGroupingBtn = document.getElementById('apply-grouping');
  const clearGroupingBtn = document.getElementById('clear-grouping');
  const similaritySlider = document.getElementById('similarity-threshold');
  const similarityValue = document.getElementById('similarity-value');
  
  // Toggle dropdown visibility
  groupingToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = groupingDropdown.style.display === 'block';
    groupingDropdown.style.display = isVisible ? 'none' : 'block';
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!groupingToggle?.contains(e.target) && !groupingDropdown?.contains(e.target)) {
      groupingDropdown.style.display = 'none';
    }
  });
  
  // Update similarity value display
  similaritySlider?.addEventListener('input', (e) => {
    if (similarityValue) {
      similarityValue.textContent = e.target.value;
    }
  });
  
  // Apply grouping
  applyGroupingBtn?.addEventListener('click', () => {
    applyKeywordGrouping();
    groupingDropdown.style.display = 'none';
  });
  
  // Clear grouping
  clearGroupingBtn?.addEventListener('click', () => {
    clearKeywordGrouping();
    groupingDropdown.style.display = 'none';
  });
  
  // Add event listeners for group intent filter pills
  initializeGroupIntentFilters();
  
  console.log('Keyword grouping UI initialized');
}


/**
 * Apply keyword grouping to current data
 */
export async function applyKeywordGrouping() {
  // Get current keyword data from the global state or table
  const keywordData = getCurrentKeywordData();
  
  if (!keywordData || keywordData.length === 0) {
    updateStatus('No keyword data available for grouping');
    return;
  }
  
  updateStatus('Grouping keywords...');
  
  // Get grouping options from UI
  const options = getGroupingOptions();
  
  try {
    // Perform grouping
    currentGroupingResult = groupKeywords(keywordData, options);
    groupingEnabled = true;
    
    // Update UI
    renderGroupedView(currentGroupingResult);
    updateGroupingStats(currentGroupingResult);
    addGroupingViewToggle();
    updateGroupingButton(true);
    
    updateStatus(`Created ${currentGroupingResult.totalGroups} groups from ${currentGroupingResult.totalKeywords} keywords`);
    
    // Track analytics (if available)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'keyword_grouping_applied', {
        'groups_created': currentGroupingResult.totalGroups,
        'keywords_grouped': currentGroupingResult.groupedKeywords,
        'similarity_threshold': options.similarityThreshold
      });
    }
    
  } catch (error) {
    console.error('Error applying keyword grouping:', error);
    updateStatus('Error grouping keywords');
  }
}

/**
 * Clear keyword grouping and return to normal view
 */
export function clearKeywordGrouping() {
  currentGroupingResult = null;
  groupingEnabled = false;
  currentGroupFilters = { intent: null, minClicks: null, minSize: null, searchTerm: null };
  
  // Restore normal table view
  renderNormalView();
  removeGroupingViewToggle();
  updateGroupingButton(false);
  clearGroupingStats();
  
  updateStatus('Keyword grouping cleared');
}

/**
 * Get grouping options from UI controls
 */
function getGroupingOptions() {
  const similarityThreshold = parseFloat(document.getElementById('similarity-threshold')?.value || 0.5);
  const minGroupSize = parseInt(document.getElementById('min-group-size')?.value || 2);
  const groupByIntent = document.getElementById('group-by-intent')?.checked ?? true;
  
  return {
    similarityThreshold,
    minGroupSize,
    maxGroups: 20,
    groupByIntent
  };
}

/**
 * Get current keyword data from the application state
 */
function getCurrentKeywordData() {
  // This would integrate with your existing data management
  // For now, we'll try to extract from the current table
  const tableRows = document.querySelectorAll('#queryData tbody tr');
  const keywordData = [];
  
  tableRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 5) {
      const keyword = {
        query: cells[0].textContent.trim(),
        clicks: parseInt(cells[1].textContent.trim()) || 0,
        impressions: parseInt(cells[2].textContent.trim()) || 0,
        ctr: parseFloat(cells[3].textContent.replace('%', '')) || 0,
        position: parseFloat(cells[4].textContent.trim()) || 0
      };
      keywordData.push(keyword);
    }
  });
  
  return keywordData;
}

/**
 * Render grouped view of keywords
 */
function renderGroupedView(groupingResult) {
  const queryDataContainer = document.getElementById('queryData');
  if (!queryDataContainer) return;
  
  let html = '<div class="grouped-keywords-container">';
  
  // Add view toggle
  html += `
    <div class="grouping-view-toggle" style="display: none;" id="grouping-view-toggle">
      <button class="active" data-view="grouped">Grouped View</button>
      <button data-view="flat">Flat View</button>
    </div>
  `;
  
  // Render groups
  groupingResult.groups.forEach((group, index) => {
    html += renderGroup(group, index);
  });
  
  // Render ungrouped keywords if any
  if (groupingResult.ungrouped.length > 0) {
    html += `
      <div class="ungrouped-section">
        <div class="ungrouped-header">
          📝 Ungrouped Keywords (${groupingResult.ungrouped.length})
        </div>
        ${renderKeywordsTable(groupingResult.ungrouped, 'ungrouped')}
      </div>
    `;
  }
  
  html += '</div>';
  queryDataContainer.innerHTML = html;
  
  // Add event listeners for group toggling
  addGroupEventListeners();
}

/**
 * Render a single keyword group
 */
function renderGroup(group, index) {
  return `
    <div class="keyword-group" data-group-id="${group.id}">
      <div class="keyword-group-header" data-group-index="${index}">
        <div class="group-header-left">
          <span class="group-toggle-icon">▶</span>
          <div class="group-topic">${group.topic}</div>
        </div>
        <div class="group-header-right">
          <div class="group-metrics">
            <div class="group-metric">
              <div class="group-metric-value">${group.metrics.totalClicks}</div>
              <div class="group-metric-label">Clicks</div>
            </div>
            <div class="group-metric">
              <div class="group-metric-value">${group.metrics.totalImpressions.toLocaleString()}</div>
              <div class="group-metric-label">Impr</div>
            </div>
            <div class="group-metric">
              <div class="group-metric-value">${group.metrics.avgCTR}%</div>
              <div class="group-metric-label">CTR</div>
            </div>
            <div class="group-metric">
              <div class="group-metric-value">${group.metrics.avgPosition}</div>
              <div class="group-metric-label">Pos</div>
            </div>
          </div>
          <div class="group-size-badge">${group.size} keywords</div>
        </div>
      </div>
      <div class="keyword-group-content" data-group-content="${index}">
        ${renderKeywordsTable(group.keywords, `group-${index}`)}
      </div>
    </div>
  `;
}

/**
 * Render keywords table for a group or ungrouped section
 */
function renderKeywordsTable(keywords, tableId) {
  let html = `
    <table class="group-keywords-table" id="table-${tableId}">
      <thead>
        <tr>
          <th>Keyword</th>
          <th>Clicks</th>
          <th>Impressions</th>
          <th>CTR</th>
          <th>Position</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  keywords.forEach(keyword => {
    html += `
      <tr>
        <td>
          <div class="keyword-cell">
            <span>${keyword.query}</span>
            <div class="action-icons">
              <span class="action-icon copy-icon" title="Copy keyword" onclick="copyKeyword('${keyword.query.replace(/'/g, "\\'")}')">
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M16 1H4C2.9 1 2 1.9 2 3v14h2V3h12V1zm3 4H8C6.9 5 6 5.9 6 7v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
              </span>
            </div>
          </div>
        </td>
        <td>${keyword.clicks || 0}</td>
        <td>${(keyword.impressions || 0).toLocaleString()}</td>
        <td>${(keyword.ctr || 0).toFixed(2)}%</td>
        <td>${(keyword.position || 0).toFixed(1)}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  return html;
}

/**
 * Add event listeners for group interactions
 */
function addGroupEventListeners() {
  // Group header click to toggle expansion
  document.querySelectorAll('.keyword-group-header').forEach(header => {
    header.addEventListener('click', () => {
      const groupIndex = header.dataset.groupIndex;
      const content = document.querySelector(`[data-group-content="${groupIndex}"]`);
      const icon = header.querySelector('.group-toggle-icon');
      
      if (content && icon) {
        const isExpanded = content.classList.contains('expanded');
        
        if (isExpanded) {
          content.classList.remove('expanded');
          icon.classList.remove('expanded');
          header.classList.remove('expanded');
        } else {
          content.classList.add('expanded');
          icon.classList.add('expanded');
          header.classList.add('expanded');
        }
      }
    });
  });
}

/**
 * Add grouping view toggle buttons
 */
function addGroupingViewToggle() {
  const toggle = document.getElementById('grouping-view-toggle');
  if (toggle) {
    toggle.style.display = 'flex';
    
    // Add event listeners for view switching
    toggle.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        
        // Update active state
        toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Switch view
        if (view === 'flat') {
          renderNormalView();
        } else {
          renderGroupedView(currentGroupingResult);
        }
      });
    });
  }
}

/**
 * Remove grouping view toggle
 */
function removeGroupingViewToggle() {
  const toggle = document.getElementById('grouping-view-toggle');
  if (toggle) {
    toggle.style.display = 'none';
  }
}

/**
 * Render normal (flat) view of keywords
 */
function renderNormalView() {
  // This would call your existing table rendering function
  // For now, we'll trigger a re-render of the current data
  const event = new CustomEvent('renderNormalTable');
  document.dispatchEvent(event);
}

/**
 * Update grouping statistics display
 */
function updateGroupingStats(groupingResult) {
  const statsContainer = document.getElementById('grouping-stats');
  if (!statsContainer) return;
  
  const html = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <div><strong>${groupingResult.totalGroups}</strong> groups created</div>
      <div><strong>${groupingResult.groupedKeywords}</strong> keywords grouped</div>
      <div><strong>${groupingResult.ungrouped.length}</strong> ungrouped</div>
      <div><strong>${Math.round((groupingResult.groupedKeywords / groupingResult.totalKeywords) * 100)}%</strong> grouped</div>
    </div>
  `;
  
  statsContainer.innerHTML = html;
  statsContainer.style.display = 'block';
}

/**
 * Clear grouping statistics
 */
function clearGroupingStats() {
  const statsContainer = document.getElementById('grouping-stats');
  if (statsContainer) {
    statsContainer.style.display = 'none';
    statsContainer.innerHTML = '';
  }
}

/**
 * Initialize group intent filter pills
 */
function initializeGroupIntentFilters() {
  const groupIntentFilters = document.getElementById('group-intent-filters');
  if (!groupIntentFilters) return;
  
  // Add event listeners to group filter pills
  groupIntentFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('group-filter-pill')) {
      e.preventDefault();
      e.stopPropagation();
      
      const intent = e.target.dataset.intent;
      
      // Update active state
      groupIntentFilters.querySelectorAll('.group-filter-pill').forEach(pill => {
        pill.classList.remove('active');
      });
      e.target.classList.add('active');
      
      // Apply filter
      filterGroupsByIntent(intent);
    }
  });
}

/**
 * Show/hide group intent filters based on grouping state
 */
function toggleGroupIntentFilters(show) {
  const groupIntentFilters = document.getElementById('group-intent-filters');
  if (groupIntentFilters) {
    groupIntentFilters.style.display = show ? 'flex' : 'none';
  }
}

/**
 * Update grouping button state
 */
function updateGroupingButton(isActive) {
  const button = document.getElementById('keyword-grouping-toggle');
  if (button) {
    if (isActive) {
      button.innerHTML = '🔗 Smart Groups ✓';
      button.style.background = 'linear-gradient(to right bottom, #4caf50, #2e7d32)';
      toggleGroupIntentFilters(true);
    } else {
      button.innerHTML = '🔗 Smart Groups ▼';
      button.style.background = 'linear-gradient(to right bottom, #9c27b0, #7b1fa2)';
      toggleGroupIntentFilters(false);
    }
  }
}

/**
 * Update status message (integration with existing status system)
 */
function updateStatus(message) {
  const statusElement = document.getElementById('status');
  if (statusElement) {
    statusElement.textContent = message;
  }
  console.log('Grouping status:', message);
}

/**
 * Copy keyword function (for action icons)
 */
window.copyKeyword = function(keyword) {
  navigator.clipboard.writeText(keyword).then(() => {
    updateStatus(`Copied: ${keyword}`);
  }).catch(err => {
    console.error('Failed to copy keyword:', err);
  });
};

/**
 * Filter groups by intent or other criteria
 */
export function filterGroupsByIntent(intent) {
  if (!currentGroupingResult) return;
  
  currentGroupFilters.intent = intent === 'all' ? null : intent;
  
  const filteredGroups = filterGroups(currentGroupingResult.groups, currentGroupFilters);
  
  // Re-render with filtered groups
  const filteredResult = {
    ...currentGroupingResult,
    groups: filteredGroups
  };
  
  renderGroupedView(filteredResult);
}

/**
 * Export grouped data in various formats
 */
export function exportGroupedKeywords(format = 'csv') {
  if (!currentGroupingResult) {
    updateStatus('No grouped data to export');
    return;
  }
  
  const data = exportGroupedData(currentGroupingResult, format);
  
  // Use existing export functionality
  const event = new CustomEvent('exportData', {
    detail: { data, format, filename: `grouped-keywords-${Date.now()}` }
  });
  document.dispatchEvent(event);
  
  updateStatus(`Exported ${data.length} keywords with grouping data`);
}


/**
 * Get current grouping state (for integration with other features)
 */
export function getCurrentGroupingState() {
  return {
    enabled: groupingEnabled,
    result: currentGroupingResult,
    filters: currentGroupFilters
  };
}

// Export state and functions for integration
export {
  currentGroupingResult,
  groupingEnabled,
  currentGroupFilters
};