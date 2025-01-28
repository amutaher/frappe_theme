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
                    try {
                        const cardData = await this.fetchNumberCardData(cardName);
                        if (cardData) {
                            const card = this.createCard({
                                title: cardData.label || cardData.name,
                                value: cardData.result !== undefined ? cardData.result : '--',
                                options: {
                                    color: 'blue',
                                    icon: this.getCardIcon(cardData),
                                    subtitle: cardData.document_type
                                }
                            });
                            container.appendChild(card);
                        } else {
                            container.appendChild(this.createErrorCard(cardName));
                        }
                    } catch (cardError) {
                        console.error(`Error creating card ${cardName}:`, cardError);
                        container.appendChild(this.createErrorCard(cardName));
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

    getCardIcon(cardData) {
        // Choose icon based on card type or function
        if (cardData.type === 'Report') return 'fa fa-file-text';
        if (cardData.function === 'Count') return 'fa fa-list';
        if (cardData.function === 'Sum') return 'fa fa-money';
        if (cardData.function === 'Average') return 'fa fa-line-chart';
        return 'fa fa-chart-line'; // default
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

        const currencySymbol = this.shouldShowCurrency(config.value) ? '₹' : '';

        card.innerHTML = `
            <div class="number-card-container ${options.color}" ${config.onClick ? 'style="cursor: pointer;"' : ''}>
                <div class="number-card-content">
                    <div class="number-card-header">
                        <h3 class="number-card-title">${config.title || ''}</h3>
                        ${iconHtml}
                    </div>
                    <div class="number-card-value">${currencySymbol}${this.formatValue(config.value)}</div>
                    ${options.subtitle ? `<div class="number-card-subtitle">${options.subtitle}</div>` : ''}
                    ${this.getTrendHTML(options)}
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

    shouldShowCurrency(value) {
        // Check if the value should show currency symbol
        return typeof value === 'number' && !isNaN(value);
    }

    createErrorCard(cardName) {
        const card = document.createElement('div');
        card.className = 'number-card';
        card.innerHTML = `
            <div class="number-card-container error">
                <div class="number-card-content">
                    <div class="number-card-header">
                        <h3 class="number-card-title">${cardName}</h3>
                        <div class="number-card-icon">
                            <i class="fa fa-exclamation-triangle"></i>
                        </div>
                    </div>
                    <div class="number-card-value text-danger">Error loading data</div>
                </div>
            </div>
        `;
        return card;
    }

    formatValue(value) {
        if (value === undefined || value === null) return '--';
        if (value === '--') return value;

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
        numStr = numStr.toString().replace(/,/g, '');
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
                : doc.filters_json || {};

            // Get the document type from the card
            if (!doc.document_type && doc.report_name) {
                // If it's a report type card, get the document type from the report
                const reportDoc = await frappe.db.get_value('Report', doc.report_name, ['ref_doctype']);
                if (reportDoc?.message?.ref_doctype) {
                    doc.document_type = reportDoc.message.ref_doctype;
                }
            }

            if (!doc.document_type) {
                console.error('No document type found for card:', cardName);
                return null;
            }

            const resultResponse = await frappe.call({
                method: 'frappe.desk.doctype.number_card.number_card.get_result',
                args: {
                    card: cardName,
                    doc: {
                        name: doc.name,
                        document_type: doc.document_type,
                        label: doc.label,
                        function: doc.function,
                        aggregate_function_based_on: doc.aggregate_function_based_on,
                        filters_json: doc.filters_json,
                        is_standard: doc.is_standard,
                        parent_document_type: doc.parent_document_type,
                        report_name: doc.report_name,
                        report_field: doc.report_field,
                        type: doc.type
                    },
                    filters: filters
                }
            });

            return {
                ...doc,
                result: resultResponse.message
            };
        } catch (error) {
            console.error('Error fetching number card data:', error, cardName);
            return null;
        }
    }

    addStyles() {
        if (!document.getElementById('sva-number-card-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'sva-number-card-styles';
            styleSheet.textContent = `
            .sva-cards-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                padding: 20px 0;
                width: 100%;
            }
            .number-card {
                width: 100%;
                min-width: 0; /* Prevents overflow in grid items */
            }
            .number-card-container {
                background: var(--card-bg);
                border-radius: 8px;
                padding: 16px;
                box-shadow: var(--card-shadow);
                transition: transform 0.2s, box-shadow 0.2s;
                border: 1px solid var(--border-color);
                height: 100%;
                display: flex;
                flex-direction: column;
            }
            .number-card-container:hover {
                transform: translateY(-2px);
                box-shadow: var(--shadow-md);
            }
            .number-card-container.error {
                border-color: var(--red-200);
                background: var(--red-50);
            }
            .number-card-container.error .number-card-icon {
                background: var(--red-100);
            }
            .number-card-container.error .number-card-icon i {
                color: var(--red-500);
            }
            .number-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }
            .number-card-icon {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-light-gray);
                transition: background-color 0.2s;
                flex-shrink: 0;
            }
            .number-card-icon i {
                font-size: 12px;
                color: var(--text-color);
            }
            .number-card-content {
                width: 100%;
                display: flex;
                flex-direction: column;
                flex: 1;
            }
            .number-card-title {
                margin: 0;
                font-size: 13px;
                color: var(--text-muted);
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: calc(100% - 48px);
                line-height: 1.4;
            }
            .number-card-value {
                font-size: 20px;
                font-weight: 600;
                color: var(--text-color);
                margin: 4px 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1.2;
            }
            .number-card-subtitle {
                font-size: 11px;
                color: var(--text-muted);
                margin-top: auto;
                padding-top: 8px;
            }
            .text-danger {
                color: var(--red-500) !important;
                font-size: 14px !important;
            }
            .number-card-trend {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 4px;
                margin-top: 8px;
            }
            .trend-up {
                color: var(--green-600);
                background: var(--green-100);
            }
            .trend-down {
                color: var(--red-600);
                background: var(--red-100);
            }
            .no-data {
                grid-column: 1 / -1;
                text-align: center;
                color: var(--text-muted);
                padding: 40px;
                background: var(--card-bg);
                border-radius: 8px;
                border: 1px solid var(--border-color);
            }
            
            /* Responsive adjustments */
            @media (max-width: 1200px) {
                .sva-cards-container {
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                }
            }
            @media (max-width: 768px) {
                .sva-cards-container {
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                }
                .number-card-value {
                    font-size: 24px;
                }
            }
            @media (max-width: 480px) {
                .sva-cards-container {
                    grid-template-columns: 1fr;
                }
            }
        `;
            document.head.appendChild(styleSheet);
        }
    }
    showNoDataState() {
        this.wrapper.innerHTML = `
            <div class="no-data">
                <i class="fa fa-info-circle fa-2x mb-2"></i>
                <div>No cards available</div>
            </div>
        `;
    }

    showErrorState() {
        this.wrapper.innerHTML = `
            <div class="no-data">
                <i class="fa fa-exclamation-circle fa-2x mb-2 text-danger"></i>
                <div class="text-danger">Error loading cards</div>
            </div>
        `;
    }

    refresh(newCards) {
        this.numberCards = newCards;
        this.make();
    }
}