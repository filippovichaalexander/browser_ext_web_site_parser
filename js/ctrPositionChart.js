/**
 * CTR Position Chart Module
 * Handles the creation and updating of the CTR vs Position chart
 * Optimized for on-demand loading to improve popup performance
 */

// Chart instance reference
let ctrPositionChart = null;
let isChartInitialized = false;

/**
 * Initializes the CTR position chart
 * @param {Object} options - Chart configuration options
 * @param {HTMLElement} options.canvas - The canvas element to render the chart
 * @param {Object} [options.data] - Initial chart data
 * @param {boolean} [options.forceInit=false] - Whether to force initialization even if chart is already initialized
 * @returns {Object} Chart.js instance
 */
function initCTRPositionChart({ canvas, data = {}, forceInit = false }) {
    // If chart is already initialized and not forcing re-init, return existing instance
    if (isChartInitialized && ctrPositionChart && !forceInit) {
        // Always update the chart with the latest data
        ctrPositionChart.data = data;
        ctrPositionChart.update();
        return ctrPositionChart;
    }
    
    if (!canvas) {
        console.error('Canvas element is required to initialize CTR position chart');
        return null;
    }

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (ctrPositionChart) {
        ctrPositionChart.destroy();
        ctrPositionChart = null;
    }
    
    // Use the chart data directly from processDataForCTRChart
    // No need to modify the structure as we've already formatted it correctly
    const chartData = data;

    // Determine the highest CTR value in the dataset for dynamic scaling
    const maxCTR = Math.ceil(
        Math.max(
            ...chartData.datasets[0].data.map(point =>
                (point && typeof point === 'object' ? point.y : point) || 0
            ),
            0
        )
    );
    
    ctrPositionChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
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
                            return `Position ${tooltipItems[0].label}`; // Use the label (position) as the title
                        },
                        label: function(context) {
                            if (context.parsed.y === null) return 'No data';
                            return `CTR: ${context.parsed.y.toFixed(1)}%`;
                        }
                    }
                }
            },
            parsing: {
                xAxisKey: 'x',
                yAxisKey: 'y'
            },
            scales: {
                x: {
                    type: 'category',
                    title: {
                        display: true,
                        text: 'Position'
                    },
                    min: 0,
                    max: 19,
                    offset: true,
                    ticks: {
                        callback: function(value) {
                            // Add 1 to value since our data is 0-indexed but we want to display positions starting from 1
                            return Number(value) + 1;
                        }
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'CTR (%)',
                        font: {
                            weight: 'bold'
                        }
                    },
                    min: 0,
                    max: maxCTR,
                    ticks: {
                        callback: value => `${value}%`
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                }
            },
            elements: {
                line: {
                    tension: 0.3,
                    borderWidth: 2
                }
            }
        }
    });

    isChartInitialized = true;
    return ctrPositionChart;
}

/**
 * Updates the CTR position chart with new data
 * @param {Object} data - Chart data in the format { labels: [], datasets: [{ data: [] }] }
 */
function updateCTRPositionChart(data) {
    if (!ctrPositionChart) {
        console.error('CTR Position Chart is not initialized');
        return;
    }

    ctrPositionChart.data = data;
    ctrPositionChart.update();
}

/**
 * Processes GSC data to prepare it for the CTR position chart
 * @param {Array} gscData - Raw GSC data
 * @returns {Object} Formatted chart data
 */
function processDataForCTRChart(gscData) {
    if (!gscData || gscData.length === 0) {
        // Return empty data structure if no GSC data is provided
        return {
            labels: Array.from({ length: 20 }, (_, i) => i + 1), // Labels from 1 to 20
            datasets: [{
                label: 'CTR by Position',
                data: Array(20).fill(null), // Fill with nulls if no data
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        };
    }

    const positionMap = new Map();
    
    gscData.forEach(item => {
        // Ensure we're parsing the position and CTR correctly
        const pos = Math.round(parseFloat(item.position));
        // CTR might be provided as a decimal (0.1234) or as a percentage string ('12.34%')
        let ctr;
        if (typeof item.ctr === 'string' && item.ctr.includes('%')) {
            // If CTR is provided as a percentage string, parse it directly
            ctr = parseFloat(item.ctr.replace('%', ''));
        } else {
            // Otherwise assume it's a decimal and convert to percentage
            ctr = parseFloat(item.ctr) * 100;
        }

        // Only consider positions from 1 to 20
        if (pos >= 1 && pos <= 20) {
            if (!positionMap.has(pos)) {
                positionMap.set(pos, { totalCTR: 0, count: 0, queries: [] });
            }
            const current = positionMap.get(pos);
            current.totalCTR += ctr;
            current.count += 1;
            // Store query for debugging
            current.queries.push({ query: item.query || 'Unknown', position: item.position, ctr: ctr });
        }
    });

    const labels = [];
    const data = [];
    
    // Create a properly organized data array that aligns with the x-axis
    const dataArray = new Array(20).fill(null); // Initialize with nulls for all positions
    
    // Ensure labels and data cover positions 1 to 20
    for (let i = 1; i <= 20; i++) {
        labels.push(i.toString());
        if (positionMap.has(i)) {
            const entry = positionMap.get(i);
            // Calculate the average without rounding to preserve precision
            const avgCTR = entry.totalCTR / entry.count;
            // For display, round to 1 decimal place instead of whole number
            const roundedAvg = Math.round(avgCTR * 10) / 10;
            
            // Store directly in the correct position in the array (i-1 since array is 0-indexed)
            dataArray[i-1] = roundedAvg;
        }
    }
    
    // Use the properly aligned data array
    let chartData = dataArray;

    // Create a properly formatted dataset with explicit position values
    const formattedData = [];
    for (let i = 0; i < chartData.length; i++) {
        if (chartData[i] !== null) {
            formattedData.push({
                x: i + 1, // Position (starting at 1)
                y: chartData[i] // CTR value
            });
        }
    }

    return {
        labels: labels,
        datasets: [{
            label: 'CTR by Position',
            data: formattedData,
            borderColor: '#4285F4',
            backgroundColor: 'rgba(66, 133, 244, 0.1)',
            tension: 0.3,
            fill: true
        }]
    };
}

/**
 * Destroys the CTR position chart and cleans up resources
 */
function destroyCTRPositionChart() {
    if (ctrPositionChart) {
        ctrPositionChart.destroy();
        ctrPositionChart = null;
        isChartInitialized = false;
    }
}

// Export functions to the window object for global access
window.CTRPositionChart = {
    init: initCTRPositionChart,
    update: updateCTRPositionChart,
    processData: processDataForCTRChart,
    destroy: destroyCTRPositionChart,
    isInitialized: () => isChartInitialized
};
