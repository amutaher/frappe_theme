class SVANumberCard {
    /**
     * Constructor for initializing the number card with provided options.
     *
     * @param {Object} params - Configuration parameters for the number card
     * @param {HTMLElement} params.wrapper - The wrapper element to contain the card
     * @param {Array} params.numberCards - Array of card configurations
     * @param {Object} params.frm - Frappe form object
     */
    constructor({
        wrapper,
        frm,
        numberCards = []
    }) {
        this.wrapper = wrapper;
        this.frm = frm;
        this.numberCards = numberCards;
        this.make();
    }

    async make() {
        this.wrapper.innerHTML = '';
        if (this.numberCards.length > 0) {
            const container = document.createElement('div');
            container.className = 'sva-cards-container';

            try {
                for (let cardName of this.numberCards) {
                    const cardData = await this.fetchNumberCardData(cardName);
                    if (cardData) {
                        const card = this.createCard({
                            title: cardData.label || cardData.name,
                            value: cardData.result,
                            options: {
                                color: 'blue',
                                icon: 'fa fa-chart-line',
                                subtitle: cardData.document_type
                            }
                        });
                        container.appendChild(card);
                    }
                }
                this.wrapper.appendChild(container);
            } catch (error) {
                console.error('Error creating number cards:', error);
                this.showErrorState();
            }
        } else {
            this.showNoDataState();
        }

        this.addStyles();
    }

    createCard(config) {
        const card = document.createElement('div');
        card.className = 'number-card';

        const options = Object.assign({
            color: 'blue',
            icon: '',
            subtitle: '',
            showTrend: false,
            trendValue: 0,
            trendType: 'up'
        }, config.options);

        const iconHtml = options.icon ? `
            <div class="number-card-icon">
                <i class="${options.icon}"></i>
            </div>
        ` : '';

        const currencySymbol = options.icon ? '' : '₹';

        card.innerHTML = `
            <div class="number-card-container ${options.color}" ${config.onClick ? 'style="cursor: pointer;"' : ''}>
                <div class="number-card-content">
                    <div class="number-card-header">
                        <h3 class="number-card-title">${config.title || ''}</h3>
                        ${iconHtml}
                    </div>
                    <div class="number-card-value">${currencySymbol}${this.formatValue(config.value)}</div>
                </div>
            </div>
        `;

        if (config.onClick) {
            card.querySelector('.number-card-container').addEventListener('click', () => {
                config.onClick(this.frm);
            });
        }

        return card;
    }

    formatValue(value) {
        if (value === undefined || value === null) return '0';

        if (typeof value === 'number') {
            // Convert to absolute value for comparison
            const absValue = Math.abs(value);

            // Format according to Indian number system
            const formatIndianNumber = (num) => {
                const numStr = num.toString();
                if (numStr.includes('.')) {
                    const [intPart, decPart] = numStr.split('.');
                    return this.formatIndianInteger(intPart) + '.' + decPart;
                }
                return this.formatIndianInteger(numStr);
            };

            // Add appropriate suffix based on magnitude
            if (absValue >= 10000000) { // ≥ 1 Cr
                const crValue = (value / 10000000).toFixed(2);
                return formatIndianNumber(crValue) + ' Cr';
            } else if (absValue >= 100000) { // ≥ 1 L
                const lValue = (value / 100000).toFixed(2);
                return formatIndianNumber(lValue) + ' L';
            } else if (absValue >= 1000) { // ≥ 1 K
                const kValue = (value / 1000).toFixed(2);
                return formatIndianNumber(kValue) + ' K';
            }

            return formatIndianNumber(value);
        }
        return value;
    }

    formatIndianInteger(numStr) {
        numStr = numStr.replace(/,/g, '');
        const lastThree = numStr.substring(numStr.length - 3);
        const otherNumbers = numStr.substring(0, numStr.length - 3);
        if (otherNumbers !== '') {
            return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
        }
        return lastThree;
    }

    getTrendHTML(options) {
        if (!options.showTrend) return '';

        const trendIcon = options.trendType === 'up' ? 'fa fa-arrow-up' : 'fa fa-arrow-down';
        const trendClass = options.trendType === 'up' ? 'trend-up' : 'trend-down';

        return `
            <div class="number-card-trend ${trendClass}">
                <i class="${trendIcon}"></i>
                ${options.trendValue}%
            </div>
        `;
    }

    addStyles() {
        if (!document.getElementById('sva-number-card-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'sva-number-card-styles';
            styleSheet.textContent = `
                .sva-cards-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                    padding: 8px 0;
                    width: 100%;
                }
                .number-card {
                    width: 350px;
                    flex: 0 0 350px;
                    max-width: 100%;
                }
                @media (max-width: 768px) {
                    .number-card {
                        flex: 1 1 350px;
                    }
                }
                @media (max-width: 480px) {
                    .number-card {
                        flex: 1 1 100%;
                        width: 100%;
                    }
                }
                .number-card-container {
                    background: var(--card-bg);
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: var(--card-shadow);
                    transition: transform 0.2s;
                    border: 1px solid var(--border-color);
                    height: 100%;
                }
                .number-card-container:hover {
                    transform: translateY(-2px);
                }
                .number-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .number-card-icon {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-light-gray);
                }
                .number-card-icon i {
                    font-size: 12px;
                    color: var(--text-color);
                }
                .number-card-content {
                    width: 100%;
                }
                .number-card-title {
                    margin: 0;
                    font-size: 13px;
                    color: var(--text-muted);
                    font-weight: 500;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .number-card-value {
                    font-size: 20px;
                    font-weight: 600;
                    color: var(--text-color);
                    margin: 4px 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .no-data {
                    width: 100%;
                    text-align: center;
                    color: var(--text-muted);
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }

    showNoDataState() {
        this.wrapper.innerHTML = `
            <div class="number-card no-data">
                <div class="number-card-container">
                    <div class="number-card-content">
                        <h3 class="number-card-title">No data available</h3>
                    </div>
                </div>
            </div>
        `;
    }

    showErrorState() {
        this.wrapper.innerHTML = `
            <div class="number-card no-data">
                <div class="number-card-container">
                    <div class="number-card-content">
                        <h3 class="number-card-title">Error loading data</h3>
                    </div>
                </div>
            </div>
        `;
    }

    async fetchNumberCardData(cardName) {
        try {
            const docResponse = await frappe.call({
                method: 'frappe.desk.form.load.getdoc',
                args: {
                    doctype: "Number Card",
                    name: cardName
                }
            });

            if (!docResponse.docs || !docResponse.docs[0]) {
                throw new Error('No document found');
            }

            const doc = docResponse.docs[0];
            const filters = typeof doc.filters_json === 'string'
                ? JSON.parse(doc.filters_json)
                : doc.filters_json;

            const resultResponse = await frappe.call({
                method: 'frappe.desk.doctype.number_card.number_card.get_result',
                args: {
                    doc: doc,
                    filters: filters,
                }
            });

            return {
                ...doc,
                result: resultResponse.message
            };
        } catch (error) {
            console.error('Error fetching number card data:', error);
            return null;
        }
    }

    refresh(newCards) {
        this.numberCards = newCards;
        this.make();
    }
}