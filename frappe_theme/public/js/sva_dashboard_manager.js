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

        // Create containers for cards and charts
        this.cardsWrapper = document.createElement('div');
        this.cardsWrapper.className = 'sva-dashboard-cards';
        this.chartsWrapper = document.createElement('div');
        this.chartsWrapper.className = 'sva-dashboard-charts';

        // Initialize card and chart instances
        this.cardInstance = new SVANumberCard({
            wrapper: this.cardsWrapper,
            frm,
            numberCards
        });

        this.chartInstance = new SVADashboardChart({
            wrapper: this.chartsWrapper,
            frm,
            charts
        });

        this.make();
    }

    async make() {
        // Clear existing content
        this.wrapper.innerHTML = '';

        // Create refresh button container
        const refreshContainer = document.createElement('div');
        refreshContainer.className = 'refresh-button-container';
        const refreshButton = document.createElement('button');
        refreshButton.className = 'btn btn-default btn-sm refresh-dashboard-btn';
        refreshButton.innerHTML = '<i class="fa fa-refresh"></i> Refresh Dashboard';
        refreshButton.onclick = () => this.refreshAll();
        refreshContainer.appendChild(refreshButton);

        // Append all elements
        this.wrapper.appendChild(refreshContainer);
        this.wrapper.appendChild(this.cardsWrapper);
        this.wrapper.appendChild(this.chartsWrapper);

        // Render both components
        await Promise.all([
            this.cardInstance.make(),
            this.chartInstance.make()
        ]);

        this.addStyles();
    }

    async refreshAll() {
        const refreshButton = this.wrapper.querySelector('.refresh-dashboard-btn');
        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.innerHTML = '<i class="fa fa-refresh fa-spin"></i> Refreshing...';
        }

        try {
            // Show loading state
            isLoading(true, this.wrapper);

            // Refresh both components
            await Promise.all([
                this.cardInstance.make(),
                this.chartInstance.make()
            ]);
        } catch (error) {
            console.error('Error refreshing dashboard:', error);
        } finally {
            // Hide loading state
            isLoading(false, this.wrapper);

            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.innerHTML = '<i class="fa fa-refresh"></i> Refresh Dashboard';
            }
        }
    }

    addStyles() {
        if (!document.getElementById('sva-dashboard-manager-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'sva-dashboard-manager-styles';
            styleSheet.textContent = `
                .refresh-button-container {
                    display: flex;
                    justify-content: flex-end;
                    padding: 15px;
                    background: var(--card-bg);
                    border-bottom: 1px solid var(--border-color);
                    position: sticky;
                    top: 0;
                    z-index: 100;
                }
                .refresh-dashboard-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                }
                .refresh-dashboard-btn i {
                    font-size: 12px;
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
        this.make();
    }
}