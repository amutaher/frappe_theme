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
    }

    async make() {
        // Clear existing content
        if (this.wrapper) {
            this.wrapper.innerHTML = '';
        }

        // Show loading state
        // isLoading(true, this.wrapper);

        if (this.numberCards.length > 0) {
            const container = document.createElement('div');
            container.className = 'sva-cards-container';

            try {
                for (let cardConfig of this.numberCards) {
                    try {
                        const cardData = await this.fetchNumberCardData(cardConfig.number_card);
                        if (cardData) {
                            const card = this.createCard({
                                cardName: cardConfig.number_card,
                                title: cardConfig.card_label || cardData.label || cardData.name,
                                value: cardData.result !== undefined ? cardData.result : '--',
                                reportName: cardData.report_name,
                                doctype: cardData.document_type,
                                filters: cardData.filters_json ? JSON.parse(cardData.filters_json) : {},
                                info: cardConfig.info || '',
                                fieldtype: cardData.fieldtype,
                                options: {
                                    icon: cardConfig.icon_value,
                                    subtitle: cardData.document_type,
                                    backgroundColor: cardConfig.background_color,
                                    textColor: cardConfig.text_color,
                                    valueColor: cardConfig.value_color,
                                    iconColor: cardConfig.icon_color
                                }
                            });
                            container.appendChild(card);
                        } else {
                            container.appendChild(this.createErrorCard(cardConfig.card_label || cardConfig.number_card));
                        }
                    } catch (cardError) {
                        console.error(`Error creating card ${cardConfig.number_card}:`, cardError);
                        container.appendChild(this.createErrorCard(cardConfig.card_label || cardConfig.number_card));
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

        // Hide loading state
        // isLoading(false, this.wrapper);

        this.addStyles();
    }

    createCard(config) {
        const card = document.createElement('div');
        card.className = 'number-card';

        const options = Object.assign({
            icon: '',
            subtitle: '',
            backgroundColor: null,
            textColor: null,
            valueColor: null,
            iconColor: null
        }, config.options);

        const iconHtml = options.icon ? `
            <div class="number-card-icon" ${options.iconColor ? `style="background-color: ${options.iconColor}"` : ''}>
                <i class="${options.icon}"></i>
            </div>
        ` : '';

        const currencySymbol = this.shouldShowCurrency(config.value, config.fieldtype) ? '₹' : '';

        const containerStyle = [
            options.backgroundColor ? `background-color: ${options.backgroundColor}` : '',
            config.onClick ? 'cursor: pointer' : ''
        ].filter(Boolean).join(';');

        const titleStyle = options.textColor ? `color: ${options.textColor}` : '';
        const valueStyle = options.valueColor ? `color: ${options.valueColor}` : '';

        const infoIconHtml = config.info ? `
            <div class="number-card-info">
                <i class="fa fa-info-circle"></i>
                <div class="number-card-tooltip">${frappe.utils.escape_html(config.info)}</div>
            </div>
        ` : '';

        card.innerHTML = `
            <div class="number-card-container" ${containerStyle ? `style="${containerStyle}"` : ''}>
                <div class="number-card-content">
                    <div class="number-card-header">
                        <div class="number-card-title-section">
                            <h3 class="number-card-title" ${titleStyle ? `style="${titleStyle}"` : ''}>${config.title || ''}</h3>
                            ${infoIconHtml}
                        </div>
                        <div class="number-card-actions">
                            <div class="number-card-menu">
                                <button class="number-card-menu-btn">
                                    <i class="fa fa-ellipsis-h"></i>
                                </button>
                                <div class="number-card-menu-dropdown">
                                    <button class="number-card-menu-item refresh-card">
                                        <i class="fa fa-refresh"></i> Refresh
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="number-card-main">
                        <div class="number-card-value" ${valueStyle ? `style="${valueStyle}"` : ''}>${currencySymbol}${this.formatValue(config.value)}</div>
                        ${iconHtml}
                    </div>
                    ${options.subtitle ? `<div class="number-card-subtitle">${options.subtitle}</div>` : ''}
                </div>
            </div>
        `;

        // Add menu toggle functionality
        const menuBtn = card.querySelector('.number-card-menu-btn');
        const menuDropdown = card.querySelector('.number-card-menu-dropdown');
        const refreshBtn = card.querySelector('.refresh-card');

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuBtn.contains(e.target)) {
                menuDropdown.classList.remove('show');
            }
        });

        // Toggle dropdown
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuDropdown.classList.toggle('show');
        });

        // Refresh card
        refreshBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            menuDropdown.classList.remove('show');

            // Show loading state for this card
            const cardContainer = card.querySelector('.number-card-container');
            cardContainer.style.opacity = '0.5';
            cardContainer.style.pointerEvents = 'none';

            try {
                // Fetch updated data for this specific card
                const cardData = await this.fetchNumberCardData(config.cardName);
                if (cardData) {
                    // Update card value
                    const valueElement = card.querySelector('.number-card-value');
                    const currencySymbol = this.shouldShowCurrency(cardData.result) ? '₹' : '';
                    valueElement.textContent = `${currencySymbol}${this.formatValue(cardData.result)}`;
                }
            } catch (error) {
                console.error('Error refreshing card:', error);
                frappe.show_alert({
                    message: __('Error refreshing card'),
                    indicator: 'red'
                });
            } finally {
                // Reset card state
                cardContainer.style.opacity = '';
                cardContainer.style.pointerEvents = '';
            }
        });

        // Add click handler for card
        const cardContainer = card.querySelector('.number-card-container');
        cardContainer.style.cursor = 'pointer';

        cardContainer.addEventListener('click', (e) => {
            // Don't trigger click if clicking menu or its children
            if (e.target.closest('.number-card-menu')) {
                return;
            }

            if (config.reportName) {
                // For report-based cards, redirect to the report
                frappe.set_route('query-report', config.reportName);
            } else if (config.doctype) {
                // For document-based cards, redirect to list view with filters
                frappe.route_options = config.filters || {};
                frappe.set_route('List', config.doctype);
            }
        });

        // Remove hover effects

        return card;
    }

    shouldShowCurrency(value, fieldtype) {
        // Check if the value should show currency symbol
        return fieldtype === 'Currency' && typeof value === 'number' && !isNaN(value);
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

    async fetchNumberCardData(cardName) {
        try {
            const docResponse = await frappe.call({
                method: 'frappe.desk.form.load.getdoc',
                args: {
                    doctype: "Number Card",
                    name: cardName
                }
            });
            // console.log(docResponse, "docResponse");
            if (!docResponse.docs || !docResponse.docs[0]) {
                throw new Error('No document found');
            }

            const doc = docResponse.docs[0];
            // console.log(doc, "doc");
            // / Parse filters_json from the doc
            let filters_json = typeof doc.filters_json === 'string'
                ? JSON.parse(doc.filters_json)
                : doc.filters_json || [];

            let filters = Array.isArray(filters_json) ? filters_json :
                Object.entries(filters_json).map(([key, value]) => [doc.document_type, key, '=', value]);

            // Only add the name filter if we have both a document type and a docname
            if (doc.document_type && this.frm.docname) {
                let res = await frappe.db.get_list('DocField', { filters: { 'parent': doc.document_type, fieldtype: 'Link', 'options': ['IN', ['DocType', this.frm.doctype]] }, fields: ['fieldname', 'options'] });
                let cus_ref_res = await frappe.db.get_list('Custom Field', { filters: { 'dt': doc.document_type, fieldtype: 'Link', 'options': ['IN', ['DocType', this.frm.doctype]] }, fields: ['fieldname', 'options'] });
                let filds = res.concat(cus_ref_res).filter((item) => !["amended_from", "parent_grant"].includes(item.fieldname));
                if (filds.length > 0) {
                    let field = filds[0];
                    if (field.options == 'DocType') {
                        let fieldname = await frappe.db.get_list('DocField', { filters: { 'parent': doc.document_type, fieldtype: 'Dynamic Link', options: field.fieldname }, fields: ['fieldname'] });
                        let fieldname2 = await frappe.db.get_list('Custom Field', { filters: { 'dt': doc.document_type, fieldtype: 'Dynamic Link', options: field.fieldname }, fields: ['fieldname'] });
                        let fieldname3 = fieldname.concat(fieldname2);
                        if (fieldname3.length > 0) {
                            let final_field = fieldname3[0];
                            filters.push([doc.document_type, final_field.fieldname, '=', this.frm.docname]);
                        }
                    } else {
                        filters.push([this.frm.doctype, [field.fieldname], '=', this.frm.docname]);
                    }
                }
                // console.log(filters, "res");
                // filters.push([doc.document_type, 'grant', '=', this.frm.docname]);
            }

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

            let resultResponse;
            if (doc.report_name) {
                // Handle report-based cards
                const reportData = await frappe.call({
                    method: 'frappe.desk.query_report.run',
                    args: {
                        report_name: doc.report_name,
                        filters: filters
                    }
                });
                console.log(reportData, "reportData");

                if (reportData?.message?.result && doc.report_field) {
                    // Extract the value from the report data using the specified field
                    const result = reportData.message.result;
                    // Find the column definition to check if it's Currency type
                    const columnDef = reportData.message.columns?.find(col => col.fieldname === doc.report_field);
                    const isCurrency = columnDef?.fieldtype === 'Currency';

                    if (result.length > 0 && doc.report_field in result[0]) {
                        resultResponse = {
                            message: result[0][doc.report_field],
                            fieldtype: isCurrency ? 'Currency' : null
                        };
                    } else {
                        resultResponse = { message: 0, fieldtype: isCurrency ? 'Currency' : null };
                    }
                } else {
                    resultResponse = { message: 0, fieldtype: null };
                }
            } else {
                // Handle regular document-based cards
                resultResponse = await frappe.call({
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
            }
            // console.log(resultResponse, "resultResponse");

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
                gap: 15px;
                padding: 0px 0px 15px 0px;
                width: 100%;
                position: relative; /* Added for loader positioning */
                min-height: 100px; /* Minimum height for loader */
            }
            .number-card {
                width: 100%;
                min-width: 0;
            }
            .number-card-container {
                background: var(--card-bg);
                border-radius: 6px;
                padding: 6px 8px;
                box-shadow: var(--card-shadow);
                border: 1px solid var(--border-color);
                min-height: 72px;
                display: flex;
                flex-direction: column;
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
                margin-bottom: 4px;
            }
            .number-card-title-section {
                display: flex;
                align-items: flex-start;
                gap: 6px;
                flex: 1;
                min-width: 0;
            }
            .number-card-info {
                position: relative;
                display: flex;
                align-items: center;
                padding-top: 2px;
            }
            .number-card-info i {
                font-size: 14px;
                color: var(--text-color);
                cursor: help;
                opacity: 0.7;
            }
            .number-card-tooltip {
                position: absolute;
                top: -8px;
                left: 24px;
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                padding: 6px 8px;
                border-radius: 4px;
                box-shadow: var(--shadow-sm);
                font-size: 11px;
                min-width: 150px;
                max-width: 250px;
                white-space: normal;
                display: none;
                z-index: 1000;
                color: var(--text-color);
                word-wrap: break-word;
            }
            .number-card-info:hover .number-card-tooltip {
                display: block;
            }
            .number-card-main {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 4px;
            }
            .number-card-actions {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .number-card-menu {
                position: relative;
            }
            .number-card-menu-btn {
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: var(--text-muted);
                border-radius: 4px;
            }
            .number-card-menu-btn:hover {
                background: var(--bg-light-gray);
            }
            .number-card-menu-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                box-shadow: var(--shadow-sm);
                display: none;
                z-index: 100;
                min-width: 70px;
            }
            .number-card-menu-dropdown.show {
                display: block;
            }
            .number-card-menu-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 8px;
                width: 100%;
                background: none;
                border: none;
                cursor: pointer;
                color: var(--text-color);
                font-size: 12px;
                border-radius: 4px;
            }
            .number-card-menu-item:hover {
                background: var(--bg-light-gray);
            }
            .number-card-icon {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-light-gray);
                transition: background-color 0.2s;
                flex-shrink: 0;
                margin-left: 12px;
            }
            .number-card-icon i {
                font-size: 16px;
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
                font-size: 12px;
                color: var(--text-muted);
                font-weight: 500;
                line-height: 1.2;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                word-break: break-word;
            }
            .number-card-value {
                font-size: 20px;
                font-weight: 600;
                color: var(--text-color);
                margin: 2px 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1;
            }
            .number-card-subtitle {
                font-size: 10px;
                color: var(--text-muted);
                margin-top: auto;
                padding-top: 6px;
            }
            .text-danger {
                color: var(--red-500) !important;
                font-size: 14px !important;
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

            /* Adjust loader styles for cards */
            .table-loader {
                min-height: 100px !important; /* Override default min-height */
                background: var(--card-bg) !important; /* Use theme background */
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