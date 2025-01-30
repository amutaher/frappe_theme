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
        this.make();
    }

    async make() {
        this.wrapper.innerHTML = '';
        if (this.charts.length > 0) {
            const container = document.createElement('div');
            container.className = 'sva-charts-container';

            try {
                for (let chartConfig of this.charts) {
                    try {
                        const chartData = await this.fetchChartData(chartConfig.dashboard_chart);
                        if (chartData) {
                            const chart = this.createChart({
                                ...chartData,
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

        // Generate a unique ID for the chart
        const chartId = `chart-${frappe.utils.get_random(6)}`;

        chartContainer.innerHTML = `
            <div class="chart-header">
                <h3 class="chart-title" style="${textStyle}">${chartData.chart_name}</h3>
                <div class="chart-type-icon">
                    <i class="fa ${this.getChartTypeIcon(chartData.type)}"></i>
                </div>
            </div>
            <div class="chart-body" id="${chartId}" style="height: ${chartData.height}px"></div>
        `;

        chartWrapper.appendChild(chartContainer);

        // Defer chart rendering to ensure container is in DOM
        setTimeout(() => {
            const chartElement = document.getElementById(chartId);
            if (chartElement) {
                this.renderChart(chartData, chartId);
            } else {
                console.error('Chart container not found:', chartId);
            }
        }, 100);

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

    renderChart(chartData, containerId) {
        try {
            const chartElement = document.getElementById(containerId);
            if (!chartElement) {
                throw new Error(`Chart container #${containerId} not found`);
            }

            const colors = ['#7cd6fd', '#5e64ff', '#743ee2', '#ff5858', '#ffa00a'];

            const chartConfig = {
                title: chartData.chart_name,
                data: chartData.data,
                type: chartData.type.toLowerCase(),
                colors: colors,
                height: chartData.height || 280,
                axisOptions: {
                    xAxisMode: 'tick',
                    yAxisMode: 'tick',
                    xIsSeries: 1
                },
                showLegend: chartData.show_legend
            };

            new frappe.Chart(chartElement, chartConfig);
        } catch (error) {
            console.error('Error rendering chart:', error);
            const chartElement = document.getElementById(containerId);
            if (chartElement) {
                chartElement.innerHTML = `
                    <div class="chart-error-body">
                        <div class="text-danger">Error rendering chart</div>
                    </div>
                `;
            }
        }
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
                    grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
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
            `;
            document.head.appendChild(styleSheet);
        }
    }

    refresh(newCharts) {
        this.charts = newCharts;
        this.make();
    }
}
