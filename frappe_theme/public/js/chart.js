class SVADashboardChart {
    /**
     * Constructor for initializing the dashboard chart with provided options.
     *
     * @param {Object} params - Configuration parameters for the dashboard chart
     * @param {HTMLElement} params.wrapper - The wrapper element to contain the chart
     * @param {Array} params.charts - Array of chart configurations
     * @param {Object} params.frm - Frappe form object
     */
    constructor({
        wrapper,
        frm,
        charts = []
    }) {
        this.wrapper = wrapper;
        this.frm = frm;
        this.charts = charts;
    }

    async make() {
        // Clear existing content and charts
        if (this.wrapper) {
            this.wrapper.innerHTML = '';
            // Clear any existing chart instances
            if (this.wrapper._chartInstances) {
                this.wrapper._chartInstances.forEach(chart => {
                    if (chart && typeof chart.destroy === 'function') {
                        chart.destroy();
                    }
                });
            }
            this.wrapper._chartInstances = [];
        }

        if (this.charts.length > 0) {
            const container = document.createElement('div');
            container.className = 'sva-charts-container';

            try {
                // Filter out invisible charts
                const visibleCharts = this.charts.filter(chart => chart.is_visible);

                let index = 0;
                for (let chartConfig of visibleCharts) {
                    try {
                        const chartData = await this.fetchChartData(chartConfig.dashboard_chart);
                        if (chartData) {
                            const chart = this.createChart({
                                ...chartData,
                                index: index,
                                chart_name: chartConfig.chart_label,
                                background_color: chartConfig.background_color,
                                text_color: chartConfig.text_color,
                                border_color: chartConfig.border_color,
                                height: chartConfig.chart_height || 300,
                                show_legend: chartConfig.show_legend
                            });
                            container.appendChild(chart);
                        } else {
                            container.appendChild(this.createErrorChart(chartConfig.chart_label));
                        }
                        index++;
                    } catch (chartError) {
                        console.error(`Error creating chart ${chartConfig.dashboard_chart}:`, chartError);
                        container.appendChild(this.createErrorChart(chartConfig.chart_label));
                    }
                }
                this.wrapper.appendChild(container);
            } catch (error) {
                console.error('Error creating dashboard charts:', error);
                this.showErrorState();
            }
        } else {
            this.showNoDataState();
        }

        this.addStyles();
    }

    createChart(chartData) {
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'dashboard-chart';

        const containerStyle = chartData.background_color ?
            `background-color: ${chartData.background_color};` : '';
        const textStyle = chartData.text_color ?
            `color: ${chartData.text_color};` : '';
        const borderStyle = chartData.border_color ?
            `border-color: ${chartData.border_color};` : '';

        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.style = `${containerStyle}${borderStyle}`;

        chartContainer.innerHTML = `
            <div class="chart-header">
                <h3 class="chart-title" style="${textStyle}">${chartData.chart_name}</h3>
                <div class="chart-actions">
                    <div class="chart-type-icon">
                        <i class="fa ${this.getChartTypeIcon(chartData.type)}"></i>
                    </div>
                    <div class="chart-menu">
                        <button class="btn btn-xs btn-default chart-menu-btn">
                            <i class="fa fa-ellipsis-v"></i>
                        </button>
                        <div class="chart-menu-options">
                            <div class="chart-menu-option refresh-chart" data-chart="${chartData.index}">
                                <i class="fa fa-refresh"></i> Refresh Chart
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="chart-body" id="chart-${chartData.index}-custom" style="height: ${chartData.height}px"></div>
        `;

        // Add click handler for menu button
        const menuBtn = chartContainer.querySelector('.chart-menu-btn');
        const menuOptions = chartContainer.querySelector('.chart-menu-options');
        const refreshOption = chartContainer.querySelector('.refresh-chart');

        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuOptions.classList.toggle('show');
        });

        // Add click handler for refresh option
        refreshOption.addEventListener('click', async (e) => {
            e.stopPropagation();
            menuOptions.classList.remove('show');

            // Show loading state
            const chartBody = chartContainer.querySelector('.chart-body');
            const originalContent = chartBody.innerHTML;
            chartBody.innerHTML = `
                <div class="chart-loading">
                    <i class="fa fa-refresh fa-spin"></i>
                    <span>Refreshing...</span>
                </div>
            `;

            try {
                // Fetch new data and re-render
                const chartConfig = this.charts[chartData.index];
                const newChartData = await this.fetchChartData(chartConfig.dashboard_chart);
                if (newChartData) {
                    chartBody.innerHTML = '';
                    this.renderChart({
                        ...newChartData,
                        index: chartData.index,
                        chart_name: chartConfig.chart_label,
                        height: chartConfig.chart_height || 300,
                        show_legend: chartConfig.show_legend
                    }, chartBody);
                } else {
                    throw new Error('Failed to fetch chart data');
                }
            } catch (error) {
                console.error('Error refreshing chart:', error);
                chartBody.innerHTML = this.getErrorTemplate('Error refreshing chart');
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', () => {
            menuOptions.classList.remove('show');
        });

        chartWrapper.appendChild(chartContainer);

        // Render chart
        requestAnimationFrame(() => {
            const chartElement = chartContainer.querySelector(`#chart-${chartData.index}-custom`);
            if (chartElement) {
                this.renderChart(chartData, chartElement);
            } else {
                console.error('Chart container not found:', `chart-${chartData.index}-custom`);
            }
        });

        return chartWrapper;
    }

    getChartTypeIcon(chartType) {
        const icons = {
            'Line': 'fa-line-chart',
            'Bar': 'fa-bar-chart',
            'Percentage': 'fa-pie-chart',
            'Pie': 'fa-pie-chart',
            'Donut': 'fa-circle-o-notch'
        };
        return icons[chartType] || 'fa-chart-line';
    }

    async fetchChartData(chartName) {
        try {
            // First, get the chart document
            const chartDoc = await frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Dashboard Chart',
                    name: chartName
                }
            });

            if (!chartDoc || !chartDoc.message) {
                throw new Error('No chart document found');
            }

            const doc = chartDoc.message;

            // Prepare filters
            const filters = this.prepareFilters(doc);

            // Get the actual chart data
            let chartData;
            if (doc.chart_type === 'Report') {
                chartData = await frappe.call({
                    method: 'frappe.desk.query_report.run',
                    args: {
                        report_name: doc.report_name,
                        filters: filters,
                        ignore_prepared_report: true
                    }
                });

                // Process report data
                const result = chartData.message?.result || [];
                const xField = doc.x_field;
                const yField = doc.y_axis?.[0]?.y_field;

                if (result.length > 0 && xField && yField) {
                    return {
                        ...doc,
                        chart_name: doc.chart_name,
                        type: doc.type,
                        data: {
                            labels: result.map(row => row[xField]),
                            datasets: [{
                                name: doc.y_axis?.[0]?.y_field || 'Value',
                                values: result.map(row => row[yField])
                            }]
                        }
                    };
                }
            } else {
                chartData = await frappe.call({
                    method: 'frappe.desk.doctype.dashboard_chart.dashboard_chart.get',
                    args: {
                        chart_name: chartName,
                        filters: filters,
                        refresh: 1
                    }
                });

                return {
                    ...doc,
                    ...(chartData.message || {}),
                    chart_name: doc.chart_name,
                    type: doc.type,
                    data: chartData.message?.data || {}
                };
            }

        } catch (error) {
            console.error('Error fetching chart data:', error, chartName);
            return null;
        }
    }

    prepareFilters(doc) {
        let filters = {};

        // Parse JSON filters if they exist
        if (doc.filters_json) {
            try {
                filters = typeof doc.filters_json === 'string'
                    ? JSON.parse(doc.filters_json)
                    : doc.filters_json;
            } catch (e) {
                console.error('Error parsing filters_json:', e);
            }
        }

        // Add dynamic filters based on the current form
        if (this.frm && this.frm.docname) {
            if (doc.document_type) {
                filters[doc.document_type] = this.frm.docname;
            }

            // Add any additional dynamic filters here
            if (doc.dynamic_filters_json) {
                try {
                    const dynamicFilters = typeof doc.dynamic_filters_json === 'string'
                        ? JSON.parse(doc.dynamic_filters_json)
                        : doc.dynamic_filters_json;

                    Object.entries(dynamicFilters).forEach(([key, value]) => {
                        filters[key] = this.frm.doc[value] || value;
                    });
                } catch (e) {
                    console.error('Error parsing dynamic_filters_json:', e);
                }
            }
        }

        return filters;
    }

    renderChart(chartData, chartElement) {
        try {
            if (!chartElement) {
                throw new Error('Chart element not found');
            }

            const canvas = document.createElement('canvas');
            const colors = ['#7cd6fd', '#5e64ff', '#743ee2', '#ff5858', '#ffa00a'];

            // Validate chart data
            if (!chartData.data || !chartData.data.labels || !chartData.data.datasets) {
                throw new Error('Invalid chart data structure');
            }

            // Handle different chart types
            const chartType = this.normalizeChartType(chartData.type);
            const chartConfig = {
                type: chartType,
                data: {
                    labels: chartData.data.labels,
                    datasets: this.formatDatasetsByChartType(chartType, chartData, colors)
                },
                options: this.getChartOptions(chartType, chartData)
            };

            const ctx = canvas.getContext('2d');
            const chartInstance = new Chart(ctx, chartConfig);

            // Store chart instance for cleanup
            if (!this.wrapper._chartInstances) {
                this.wrapper._chartInstances = [];
            }
            this.wrapper._chartInstances.push(chartInstance);

            chartElement.appendChild(canvas);

        } catch (error) {
            console.error('Error rendering chart:', error);
            chartElement.innerHTML = this.getErrorTemplate('Error rendering chart');
        }
    }

    normalizeChartType(type) {
        const typeMap = {
            'Line': 'line',
            'Bar': 'bar',
            'Percentage': 'pie',
            'Pie': 'pie',
            'Donut': 'doughnut'
        };
        return typeMap[type] || 'line';
    }

    formatDatasetsByChartType(chartType, chartData, colors) {
        const baseDataset = {
            label: chartData.chart_name,
            data: chartData.data.datasets[0].values,
        };

        switch (chartType) {
            case 'pie':
            case 'doughnut':
                return [{
                    ...baseDataset,
                    backgroundColor: colors,
                    borderWidth: 1
                }];
            case 'bar':
                return [{
                    ...baseDataset,
                    backgroundColor: colors[0],
                    borderColor: colors[0],
                    borderWidth: 1
                }];
            case 'line':
                return [{
                    ...baseDataset,
                    borderColor: colors[0],
                    backgroundColor: 'rgba(124, 214, 253, 0.1)',
                    borderWidth: 2,
                    fill: true
                }];
            default:
                return [baseDataset];
        }
    }

    getChartOptions(chartType, chartData) {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            legend: {
                display: chartData.show_legend
            }
        };

        if (chartType === 'pie' || chartType === 'doughnut') {
            return {
                ...baseOptions,
                cutoutPercentage: chartType === 'doughnut' ? 50 : 0
            };
        }

        return {
            ...baseOptions,
            scales: {
                xAxes: [{
                    ticks: {
                        autoSkip: true,
                        maxRotation: 45,
                        minRotation: 45
                    }
                }],
                yAxes: [{
                    ticks: {
                        beginAtZero: true
                    }
                }]
            }
        };
    }

    getErrorTemplate(message) {
        return `
            <div class="chart-error-body">
                <div class="text-danger">
                    <i class="fa fa-exclamation-circle mr-2"></i>
                    ${frappe.utils.xss_sanitize(message)}
                </div>
            </div>
        `;
    }

    createErrorChart(chartName) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'dashboard-chart';
        errorDiv.innerHTML = `
            <div class="chart-container error">
                <div class="chart-header">
                    <h3 class="chart-title">${chartName}</h3>
                    <div class="chart-type-icon">
                        <i class="fa fa-exclamation-triangle"></i>
                    </div>
                </div>
                <div class="chart-error-body">
                    <div class="text-danger">Error loading chart data</div>
                </div>
            </div>
        `;
        return errorDiv;
    }

    showNoDataState() {
        this.wrapper.innerHTML = `
            <div class="no-data">
                <i class="fa fa-info-circle fa-2x mb-2"></i>
                <div>No charts available</div>
            </div>
        `;
    }

    showErrorState() {
        this.wrapper.innerHTML = `
            <div class="no-data">
                <i class="fa fa-exclamation-circle fa-2x mb-2 text-danger"></i>
                <div class="text-danger">Error loading charts</div>
            </div>
        `;
    }

    addStyles() {
        if (!document.getElementById('sva-dashboard-chart-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'sva-dashboard-chart-styles';
            styleSheet.textContent = `
                .sva-charts-container {
                    display: grid;
                    grid-template-columns: ${this.charts.length === 1 ? '1fr' : 'repeat(2, 1fr)'};
                    gap: 20px;
                    padding: 20px 0;
                    width: 100%;
                }
                .dashboard-chart {
                    width: 100%;
                    min-width: 0;
                }
                .chart-container {
                    background: var(--card-bg);
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: var(--card-shadow);
                    border: 1px solid var(--border-color);
                    height: 100%;
                }
                .chart-container.error {
                    border-color: var(--red-200);
                    background: var(--red-50);
                }
                .chart-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }
                .chart-title {
                    margin: 0;
                    font-size: 14px;
                    color: var(--text-color);
                    font-weight: 500;
                }
                .chart-type-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-light-gray);
                }
                .chart-type-icon i {
                    font-size: 12px;
                    color: var(--text-color);
                }
                .chart-body {
                    min-height: 280px;
                }
                .chart-error-body {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 280px;
                    font-size: 14px;
                }
                
                @media (max-width: 768px) {
                    .sva-charts-container {
                        grid-template-columns: 1fr;
                    }
                }

                .chart-actions {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .chart-menu {
                    position: relative;
                }
                .chart-menu-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                }
                .chart-menu-btn:hover {
                    color: var(--text-color);
                }
                .chart-menu-options {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 4px;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                    box-shadow: var(--shadow-sm);
                    min-width: 140px;
                    display: none;
                    z-index: 100;
                }
                .chart-menu-options.show {
                    display: block;
                }
                .chart-menu-option {
                    padding: 8px 12px;
                    cursor: pointer;
                    color: var(--text-color);
                    font-size: var(--text-sm);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .chart-menu-option:hover {
                    background-color: var(--control-bg);
                }
                .chart-menu-option i {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                .chart-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    gap: 8px;
                    color: var(--text-muted);
                }
                .chart-loading i {
                    font-size: 16px;
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }

    refresh(newCharts) {
        this.charts = newCharts;
        this.make();
    }
}
