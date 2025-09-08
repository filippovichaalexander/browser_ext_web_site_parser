/**
 * Clicks vs Impressions Chart Module
 * Handles the creation and updating of the clicks vs impressions scatter chart
 * Shows top 100 keywords plotted with impressions on x-axis and clicks on y-axis
 */

// Chart instance reference
let clicksVsImpressionsChart = null;
let isClicksVsImpressionsChartInitialized = false;

/**
 * Initializes the clicks vs impressions chart
 * @param {Object} options - Chart configuration options
 * @param {HTMLElement} options.canvas - The canvas element to render the chart
 * @param {Object} [options.data] - Initial chart data
 * @param {boolean} [options.forceInit=false] - Whether to force initialization even if chart is already initialized
 * @returns {Object} Chart.js instance
 */
function initClicksVsImpressionsChart({ canvas, data = {}, forceInit = false }) {
    // If chart is already initialized and not forcing re-init, return existing instance
    if (isClicksVsImpressionsChartInitialized && clicksVsImpressionsChart && !forceInit) {
        updateClicksVsImpressionsChart(data);
        return clicksVsImpressionsChart;
    }

    // Destroy existing chart if it exists
    if (clicksVsImpressionsChart) {
        clicksVsImpressionsChart.destroy();
        clicksVsImpressionsChart = null;
        isClicksVsImpressionsChartInitialized = false;
    }

    if (!canvas) {
        console.error('Canvas element not provided for Clicks vs Impressions chart');
        return null;
    }

    // Get canvas context
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context from canvas');
        return null;
    }

    // Chart configuration
    const config = {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Keywords',
                data: data.scatterData || [],
                backgroundColor: 'rgba(66, 133, 244, 0.6)',
                borderColor: 'rgba(66, 133, 244, 1)',
                borderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8,
                pointHoverBackgroundColor: 'rgba(66, 133, 244, 0.8)',
                pointHoverBorderColor: 'rgba(66, 133, 244, 1)',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: true,
                mode: 'nearest'
            },
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#202124',
                    bodyColor: '#5f6368',
                    borderColor: '#dadce0',
                    borderWidth: 1,
                    titleFont: {
                        size: 13,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 12
                    },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    filter: function(tooltipItem) {
                        // Only show tooltip for the first item to prevent duplicates
                        return tooltipItem.dataIndex !== undefined;
                    },
                    callbacks: {
                        title: function(context) {
                            if (context && context.length > 0) {
                                const point = context[0];
                                return point.raw.query || 'Unknown Query';
                            }
                            return 'Unknown Query';
                        },
                        label: function(context) {
                            const point = context.raw;
                            const impressions = Math.round(point.x || 0);
                            const clicks = Math.round(point.y || 0);
                            
                            // Format CTR as percentage with 2 decimal places
                            let ctrFormatted = 'N/A';
                            if (point.ctr !== undefined && point.ctr !== null) {
                                let ctrValue = 0;
                                if (typeof point.ctr === 'string') {
                                    // Remove % symbol if present and parse
                                    const cleanCtr = point.ctr.replace('%', '').trim();
                                    ctrValue = parseFloat(cleanCtr) || 0;
                                } else {
                                    ctrValue = parseFloat(point.ctr) || 0;
                                }
                                
                                // If CTR appears to be in decimal format (0.0978), convert to percentage
                                if (ctrValue > 0 && ctrValue < 1) {
                                    ctrValue = ctrValue * 100;
                                }
                                
                                ctrFormatted = `${ctrValue.toFixed(2)}%`;
                            }
                            
                            // Format position with 2 decimal places
                            let positionFormatted = 'N/A';
                            if (point.position !== undefined && point.position !== null && point.position !== 'N/A') {
                                const positionValue = parseFloat(point.position);
                                if (!isNaN(positionValue)) {
                                    positionFormatted = positionValue.toFixed(2);
                                }
                            }
                            
                            return [
                                `Impressions: ${impressions.toLocaleString()}`,
                                `Clicks: ${clicks.toLocaleString()}`,
                                `CTR: ${ctrFormatted}`,
                                `Position: ${positionFormatted}`
                            ];
                        },
                        afterLabel: function() {
                            return null; // Prevent additional labels
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Impressions',
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        color: '#5f6368'
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        color: '#5f6368',
                        callback: function(value) {
                            return value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value;
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: false
                    }
                },
                y: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Clicks',
                        font: {
                            size: 12,
                            weight: 'bold'
                        },
                        color: '#5f6368'
                    },
                    min: 0,
                    ticks: {
                        font: {
                            size: 11
                        },
                        color: '#5f6368',
                        callback: function(value) {
                            return value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value;
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)',
                        drawBorder: false
                    }
                }
            }
        }
    };

    // Create the chart
    try {
        clicksVsImpressionsChart = new Chart(ctx, config);
        isClicksVsImpressionsChartInitialized = true;
        return clicksVsImpressionsChart;
    } catch (error) {
        console.error('Error creating Clicks vs Impressions chart:', error);
        return null;
    }
}

/**
 * Processes GSC data for the clicks vs impressions chart
 * Takes top 100 keywords by clicks and creates scatter plot data
 * @param {Array} gscData - Array of GSC data objects
 * @returns {Object} Processed data for Chart.js
 */
function processDataForClicksVsImpressionsChart(gscData) {
    if (!gscData || !Array.isArray(gscData) || gscData.length === 0) {
        return { scatterData: [] };
    }

    // Create a Map to handle potential duplicate keywords and merge their data
    const keywordMap = new Map();
    
    gscData.forEach(item => {
        const key = (item.query || '').toLowerCase();
        if (!key) return;

        const existing = keywordMap.get(key);
        if (existing) {
            // Merge data for duplicate keywords
            existing.clicks += parseInt(item.clicks || 0);
            existing.impressions += parseInt(item.impressions || 0);
            // Recalculate CTR based on merged clicks and impressions
            existing.ctr = existing.clicks / existing.impressions;
            // Use the better (lower) position
            existing.position = Math.min(existing.position, parseFloat(item.position || 0));
        } else {
            keywordMap.set(key, {
                query: item.query,
                clicks: parseInt(item.clicks || 0),
                impressions: parseInt(item.impressions || 0),
                ctr: parseFloat(item.ctr || 0),
                position: parseFloat(item.position || 0)
            });
        }
    });

    // Convert map to array and sort by clicks
    const sortedData = Array.from(keywordMap.values())
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 100); // Take top 100 keywords

    // Format data for scatter plot
    const scatterData = sortedData.map(item => ({
        x: item.impressions,
        y: item.clicks,
        query: item.query,
        ctr: item.ctr,
        position: item.position
    }));

    return { scatterData };
}

/**
 * Updates the clicks vs impressions chart with new data
 * @param {Object} data - Chart data
 */
function updateClicksVsImpressionsChart(data) {
    if (!clicksVsImpressionsChart) {
        console.error('Clicks vs Impressions chart is not initialized');
        return;
    }

    clicksVsImpressionsChart.data.datasets[0].data = data.scatterData || [];
    clicksVsImpressionsChart.update();
}

/**
 * Destroys the clicks vs impressions chart and cleans up resources
 */
function destroyClicksVsImpressionsChart() {
    if (clicksVsImpressionsChart) {
        clicksVsImpressionsChart.destroy();
        clicksVsImpressionsChart = null;
        isClicksVsImpressionsChartInitialized = false;
    }
}

// Export functions to the window object for global access
window.ClicksVsImpressionsChart = {
    init: initClicksVsImpressionsChart,
    update: updateClicksVsImpressionsChart,
    processData: processDataForClicksVsImpressionsChart,
    destroy: destroyClicksVsImpressionsChart,
    isInitialized: () => isClicksVsImpressionsChartInitialized
}; 