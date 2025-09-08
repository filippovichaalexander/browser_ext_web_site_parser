/**
 * Keyword Distribution by Position Chart Module
 * Handles the creation and updating of the keyword distribution chart
 * Shows number of keywords in each position range
 */

// Chart instance reference
let keywordDistributionChart = null;
let isKeywordDistChartInitialized = false;

/**
 * Initializes the keyword distribution chart
 * @param {Object} options - Chart configuration options
 * @param {HTMLElement} options.canvas - The canvas element to render the chart
 * @param {Object} [options.data] - Initial chart data
 * @param {boolean} [options.forceInit=false] - Whether to force initialization even if chart is already initialized
 * @returns {Object} Chart.js instance
 */
function initKeywordDistributionChart({ canvas, data = {}, forceInit = false }) {
    // If chart is already initialized and not forcing re-init, return existing instance
    if (isKeywordDistChartInitialized && keywordDistributionChart && !forceInit) {
        keywordDistributionChart.data = data;
        keywordDistributionChart.update();
        return keywordDistributionChart;
    }
    
    if (!canvas) {
        console.error('Canvas element is required to initialize keyword distribution chart');
        return null;
    }

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (keywordDistributionChart) {
        keywordDistributionChart.destroy();
        keywordDistributionChart = null;
    }
    
    keywordDistributionChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(tooltipItems) {
                            return `Position ${tooltipItems[0].label}`;
                        },
                        label: function(context) {
                            const count = context.parsed.y;
                            const percentage = data.datasets[0].percentages[context.dataIndex];
                            return `${count} keywords (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Position Range'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Keywords'
                    },
                    beginAtZero: true,
                    ticks: {
                        precision: 0 // Ensure integer values on y-axis
                    }
                }
            }
        }
    });

    isKeywordDistChartInitialized = true;
    return keywordDistributionChart;
}

/**
 * Updates the keyword distribution chart with new data
 * @param {Object} data - Chart data in the format { labels: [], datasets: [{ data: [] }] }
 */
function updateKeywordDistributionChart(data) {
    if (!keywordDistributionChart) {
        console.error('Keyword Distribution Chart is not initialized');
        return;
    }

    keywordDistributionChart.data = data;
    keywordDistributionChart.update();
}

/**
 * Processes GSC data to prepare it for the keyword distribution chart
 * @param {Array} gscData - Raw GSC data
 * @returns {Object} Formatted chart data
 */
function processDataForKeywordDistributionChart(gscData) {
    if (!gscData || gscData.length === 0) {
        // Return empty data structure if no GSC data is provided
        return {
            labels: ['1-3', '4-10', '11-20', '21-50', '51-100'],
            datasets: [{
                label: 'Keywords',
                data: [0, 0, 0, 0, 0],
                backgroundColor: 'rgba(66, 133, 244, 0.7)',
                borderColor: 'rgba(66, 133, 244, 1)',
                borderWidth: 1,
                percentages: [0, 0, 0, 0, 0]
            }]
        };
    }

    const positionRanges = {
        '1-3': 0,
        '4-10': 0,
        '11-20': 0,
        '21-50': 0,
        '51-100': 0
    };
    
    gscData.forEach(item => {
        const position = Math.round(parseFloat(item.position));
        
        if (position >= 1 && position <= 3) {
            positionRanges['1-3']++;
        } else if (position >= 4 && position <= 10) {
            positionRanges['4-10']++;
        } else if (position >= 11 && position <= 20) {
            positionRanges['11-20']++;
        } else if (position >= 21 && position <= 50) {
            positionRanges['21-50']++;
        } else if (position >= 51 && position <= 100) {
            positionRanges['51-100']++;
        }
    });

    const labels = Object.keys(positionRanges);
    const data = Object.values(positionRanges);
    const totalKeywords = gscData.length;
    
    // Calculate percentages for each range
    const percentages = data.map(count => 
        totalKeywords > 0 ? ((count / totalKeywords) * 100).toFixed(1) : '0.0'
    );

    return {
        labels: labels,
        datasets: [{
            label: 'Keywords',
            data: data,
            backgroundColor: 'rgba(66, 133, 244, 0.7)',
            borderColor: 'rgba(66, 133, 244, 1)',
            borderWidth: 1,
            percentages: percentages // Store percentages for tooltip
        }]
    };
}

/**
 * Destroys the keyword distribution chart and cleans up resources
 */
function destroyKeywordDistributionChart() {
    if (keywordDistributionChart) {
        keywordDistributionChart.destroy();
        keywordDistributionChart = null;
        isKeywordDistChartInitialized = false;
    }
}

// Export functions to the window object for global access
window.KeywordDistributionChart = {
    init: initKeywordDistributionChart,
    update: updateKeywordDistributionChart,
    processData: processDataForKeywordDistributionChart,
    destroy: destroyKeywordDistributionChart,
    isInitialized: () => isKeywordDistChartInitialized
}; 