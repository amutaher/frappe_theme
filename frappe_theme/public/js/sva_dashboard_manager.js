class SVADashboardManager {
    constructor({
        wrapper,
        frm,
        numberCards = [],
        charts = []
    }) {
        this.wrapper = wrapper;
        this.frm = frm;
        this.numberCards = numberCards;
        this.charts = charts;
        this.filters = {};

        // Create containers for cards and charts
        this.cardsWrapper = document.createElement('div');
        this.cardsWrapper.className = 'sva-dashboard-cards';
        this.chartsWrapper = document.createElement('div');
        this.chartsWrapper.className = 'sva-dashboard-charts';

        // Initialize card and chart instances
        if(numberCards?.length || charts?.length){
            if(numberCards?.length){
                this.cardInstance = new SVANumberCard({
                    wrapper: this.cardsWrapper,
                    frm,
                    numberCards,
                    filters: this.filters
                });
            }
            if (charts?.length){
                this.chartInstance = new SVADashboardChart({
                    wrapper: this.chartsWrapper,
                    frm,
                    charts,
                    filters: this.filters
                });
            }
            this.init();
        }
    }

    async init() {
        try {
            await this.make();
            await this.renderDashboard();
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    }

    async getFilterFields() {
        let fields = [];
        try {
            // Get meta for the current doctype
            const meta = frappe.get_meta(this.frm.doctype);

            // Add standard date fields
            fields.push({
                fieldname: 'creation',
                fieldtype: 'Date',
                label: __('Creation Date'),
                parent: this.frm.doctype
            });

            fields.push({
                fieldname: 'modified',
                fieldtype: 'Date',
                label: __('Modified Date'),
                parent: this.frm.doctype
            });

            // Add fields from charts and cards
            const allFields = new Set();

            // Add fields from charts
            for (const chart of this.charts) {
                if (chart.dashboard_chart) {
                    const chartDoc = await frappe.db.get_doc('Dashboard Chart', chart.dashboard_chart);
                    if (chartDoc.filters_json) {
                        try {
                            const chartFilters = JSON.parse(chartDoc.filters_json);
                            Object.keys(chartFilters).forEach(fieldname => {
                                allFields.add(fieldname);
                            });
                        } catch (e) {
                            console.error('Error parsing chart filters:', e);
                        }
                    }
                }
            }

            // Add fields from number cards
            for (const card of this.numberCards) {
                if (card.number_card) {
                    const cardDoc = await frappe.db.get_doc('Number Card', card.number_card);
                    if (cardDoc.filters_json) {
                        try {
                            const cardFilters = JSON.parse(cardDoc.filters_json);
                            Object.keys(cardFilters).forEach(fieldname => {
                                allFields.add(fieldname);
                            });
                        } catch (e) {
                            console.error('Error parsing card filters:', e);
                        }
                    }
                }
            }

            // Add collected fields to the filter fields array
            for (const fieldname of allFields) {
                const field = meta.fields.find(f => f.fieldname === fieldname);
                if (field) {
                    fields.push({
                        fieldname: field.fieldname,
                        fieldtype: field.fieldtype,
                        label: __(field.label),
                        parent: this.frm.doctype,
                        options: field.options
                    });
                }
            }

        } catch (error) {
            console.error('Error getting filter fields:', error);
        }
        return fields;
    }

    async make() {
        this.wrapper.innerHTML = '';

        // Create header container
        // const headerContainer = document.createElement('div');
        // headerContainer.className = 'dashboard-header';

        // Create right-side container for buttons
        // const actionContainer = document.createElement('div');
        // actionContainer.className = 'dashboard-actions';

        // Initialize common filter
        // const filterFields = await this.getFilterFields();
        // this.commonFilter = new CommonFilter({
        //     parent: actionContainer,
        //     doctype: this.frm.doctype,
        //     filterFields: filterFields,
        //     onFilterChange: (filters) => {
        //         this.filters = filters;
        //         this.renderDashboard();
        //     }
        // });

        // Add refresh button
        // const refreshButton = document.createElement('button');
        // refreshButton.className = 'btn btn-default btn-sm refresh-dashboard-btn';
        // refreshButton.innerHTML = '<i class="fa fa-refresh"></i> Refresh';
        // refreshButton.onclick = () => this.refreshAll();
        // actionContainer.appendChild(refreshButton);

        // headerContainer.appendChild(actionContainer);

        // Append all elements
        // this.wrapper.appendChild(headerContainer);
        this.wrapper.appendChild(this.cardsWrapper);
        this.wrapper.appendChild(this.chartsWrapper);

        this.addStyles();
    }

    async renderDashboard() {
        try {
            let prmsArr = [];
            // Update filters for both instances
            if (this.cardInstance) {
                this.cardInstance.filters = this.filters;
                prmsArr.push(this.cardInstance.make());
            }
            if (this.chartInstance) {
                this.chartInstance.filters = this.filters;
                prmsArr.push(this.chartInstance.make());
            }
            // Render both components
            await Promise.all(prmsArr);
        } catch (error) {
            console.error('Error rendering dashboard:', error);
        }
    }

    async refreshAll() {
        const refreshButton = this.wrapper.querySelector('.refresh-dashboard-btn');
        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.innerHTML = '<i class="fa fa-refresh fa-spin"></i> Refreshing...';
        }

        try {
            isLoading(true, this.wrapper);
            await this.renderDashboard();
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
        } finally {
            isLoading(false, this.wrapper);
            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.innerHTML = '<i class="fa fa-refresh"></i> Refresh';
            }
        }
    }

    addStyles() {
        if (!document.getElementById('sva-dashboard-manager-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'sva-dashboard-manager-styles';
            styleSheet.textContent = `
                .dashboard-header {
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    padding: 10px 15px;
                    background: var(--fg-color);
                    border-bottom: 1px solid var(--border-color);
                    position: sticky;
                    top: 0;
                }
                .dashboard-actions {
                    display: flex;
                    justify-content: end;
                    gap: 10px;
                    align-items: center;
                }
                .refresh-dashboard-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    height: 28px;
                    padding: 6px 10px;
                    font-size: var(--text-sm);
                }
                .refresh-dashboard-btn i {
                    font-size: 12px;
                }
                .sva-dashboard-cards,
                .sva-dashboard-charts {
                    padding: 0px;
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }

    refresh(newCards, newCharts) {
        this.numberCards = newCards || this.numberCards;
        this.charts = newCharts || this.charts;
        this.cardInstance.numberCards = this.numberCards;
        this.chartInstance.charts = this.charts;
        this.renderDashboard();
    }
}