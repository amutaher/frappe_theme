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
                for (let chartName of this.charts) {
                    try {
                        const chartData = await this.fetchChartData(chartName);
                        if (chartData) {
                            const chart = this.createChart(chartData);
                            container.appendChild(chart);
                        } else {
                            container.appendChild(this.createErrorChart(chartName));
                        }
                    } catch (chartError) {
                        console.error(`Error creating chart ${chartName}:`, chartError);
                        container.appendChild(this.createErrorChart(chartName));
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

        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.innerHTML = `
            <div class="chart-header">
                <h3 class="chart-title">${chartData.chart_name}</h3>
                <div class="chart-type-icon">
                    <i class="fa ${this.getChartTypeIcon(chartData.type)}"></i>
                </div>
            </div>
            <div class="chart-body" id="chart-${chartData.name}"></div>
        `;

        chartWrapper.appendChild(chartContainer);

        // Defer chart rendering to ensure container is in DOM
        setTimeout(() => {
            this.renderChart(chartData, `chart-${chartData.name}`);
        }, 0);

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
            const docResponse = await frappe.call({
                method: 'frappe.desk.form.load.getdoc',
                args: {
                    doctype: "Dashboard Chart",
                    name: chartName
                }
            });

            if (!docResponse.docs || !docResponse.docs[0]) {
                throw new Error('No chart document found');
            }

            const doc = docResponse.docs[0];
            const filters = this.prepareFilters(doc);

            const chartData = await frappe.call({
                method: 'frappe.desk.doctype.dashboard_chart.dashboard_chart.get',
                args: {
                    chart_name: chartName,
                    filters: filters,
                    refresh: 1
                }
            });

            return {
                ...doc,
                ...chartData.message
            };
        } catch (error) {
            console.error('Error fetching chart data:', error);
            return null;
        }
    }

    prepareFilters(doc) {
        let filters = {};
        if (doc.filters_json) {
            filters = typeof doc.filters_json === 'string'
                ? JSON.parse(doc.filters_json)
                : doc.filters_json;
        }

        if (doc.document_type && this.frm.docname) {
            filters[doc.document_type] = this.frm.docname;
        }

        return filters;
    }

    renderChart(chartData, containerId) {
        const colors = ['#7cd6fd', '#5e64ff', '#743ee2', '#ff5858', '#ffa00a'];

        const chartConfig = {
            title: chartData.chart_name,
            data: {
                labels: chartData.labels || [],
                datasets: chartData.datasets || []
            },
            type: chartData.type.toLowerCase(),
            colors: colors,
            height: 280,
            axisOptions: {
                xAxisMode: 'tick',
                yAxisMode: 'tick',
                xIsSeries: 1
            }
        };

        new frappe.Chart(`#${containerId}`, chartConfig);
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
