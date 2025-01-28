frappe.ui.form.on('Number Card Mapper', {
    refresh: function (frm) {

        // Add refresh button with immediate refresh
        frm.add_custom_button(__('Refresh Cards'), function () {
            frm.reload_doc();
            frm.trigger('update_card_sequence');
        }, __("Actions"));

        // Add preview button
        frm.add_custom_button(__('Preview Cards'), function () {
            preview_cards(frm);
        }, __("Actions"));
        frm.trigger('doctype_field');

        // Initialize sequence on refresh
        frm.trigger('update_card_sequence');
    },

    update_card_sequence: function (frm) {
        if (frm.doc.cards && frm.doc.cards.length) {
            frm.doc.cards.forEach((card, idx) => {
                frappe.model.set_value(card.doctype, card.name, 'sequence', idx + 1);
                if (card.number_card && !card.card_label) {
                    update_card_label(frm, card);
                }
            });
            frm.refresh_field('cards');
        }
    },
    doctype_field: async function (frm) {
        if (!frm.doc.doctype_field) {
            await frm.set_value('wrapper_field', '');
            return;
        }

        try {
            const response = await frappe.call({
                method: "frappe_theme.api.get_html_fields",
                args: {
                    doctype: frm.doc.doctype_field,
                },
            });

            if (response.message) {
                let fields = response.message;
                await frm.set_df_property('wrapper_field', 'options', fields);
                if (fields.length === 0) {
                    frappe.show_alert({
                        message: __('No HTML fields found in the selected DocType'),
                        indicator: 'orange',
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching HTML fields:", error);
        }
    }
    ,
    validate: function (frm) {
        frm.trigger('update_card_sequence');
    }
});

// Child table handling
frappe.ui.form.on('Number Card Mapper Child', {
    cards_add: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.sequence = (frm.doc.cards || []).length + 1;
        row.is_visible = 1;
        frm.refresh_field('cards');
    },

    cards_move: function (frm) {
        frm.trigger('update_card_sequence');
    },

    cards_remove: function (frm) {
        frm.trigger('update_card_sequence');
    },

    number_card: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.number_card) {
            update_card_label(frm, row);
        }
    }
});

// Helper function to update card label
function update_card_label(frm, row) {
    frappe.db.get_value('Number Card', row.number_card,
        ['label', 'document_type', 'filters_json', 'function', 'aggregate_function_based_on'])
        .then(r => {
            if (r.message) {
                frappe.model.set_value(row.doctype, row.name, {
                    'card_label': r.message.label
                });
            }
        });
}

function preview_cards(frm) {
    if (!frm.doc.cards || !frm.doc.cards.length) {
        frappe.msgprint(__('No cards added to preview'));
        return;
    }

    let d = new frappe.ui.Dialog({
        title: __('Card Preview'),
        fields: [{
            fieldtype: 'HTML',
            fieldname: 'preview_area'
        }],
        size: 'large',
        primary_action_label: __('Refresh Values'),
        primary_action: () => {
            refresh_card_values(d, frm);
        }
    });

    d.show();
    d.get_field('preview_area').$wrapper.html(`
        <div class="text-muted text-center p-4">
            <div class="loading-spinner"></div>
            <div>Loading preview...</div>
        </div>
    `);

    // Add SVA Card styles if not already added
    if (!document.getElementById('sva-preview-card-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'sva-preview-card-styles';
        styleSheet.textContent = `
            .sva-cards-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 20px;
                padding: 20px;
                width: 100%;
            }
            .preview-card {
                width: 100%;
                min-width: 0;
            }
            .preview-card-container {
                background: var(--card-bg);
                border-radius: 8px;
                padding: 16px;
                box-shadow: var(--card-shadow);
                transition: transform 0.2s;
                border: 1px solid var(--border-color);
                height: 100%;
            }
            .preview-card-container:hover {
                transform: translateY(-2px);
            }
            .preview-card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            .preview-card-icon {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--bg-light-gray);
            }
            .preview-card-icon i {
                font-size: 12px;
                color: var(--text-color);
            }
            .preview-card-content {
                width: 100%;
            }
            .preview-card-title {
                margin: 0;
                font-size: 13px;
                color: var(--text-muted);
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .preview-card-value {
                font-size: 20px;
                font-weight: 600;
                color: var(--text-color);
                margin: 4px 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .preview-card-subtitle {
                font-size: 12px;
                color: var(--text-muted);
                margin-top: 4px;
            }
            .preview-card.error .preview-card-container {
                border-color: var(--red-200);
                background: var(--red-50);
            }
            .preview-card.error .preview-card-icon {
                background: var(--red-100);
            }
            .preview-card.error .preview-card-icon i {
                color: var(--red-500);
            }
        `;
        document.head.appendChild(styleSheet);
    }

    // First get all card details and prepare them
    Promise.all(frm.doc.cards.map(async card => {
        try {
            if (!card.number_card) return null;

            const cardDoc = await frappe.db.get_doc('Number Card', card.number_card);

            // If it's a Report type card, get document_type from report
            if (cardDoc.type === 'Report' && cardDoc.report_name) {
                const reportDoc = await frappe.db.get_value('Report', cardDoc.report_name, ['ref_doctype']);
                if (reportDoc?.message?.ref_doctype) {
                    cardDoc.document_type = reportDoc.message.ref_doctype;
                }
            }

            return {
                ...cardDoc,
                is_visible: card.is_visible,
                card_label: card.card_label || cardDoc.label
            };
        } catch (error) {
            console.error(`Error fetching card ${card.number_card}:`, error);
            return null;
        }
    })).then(async cards => {
        // Filter out null values and non-visible cards
        const validCards = cards.filter(card => card && card.is_visible);

        if (validCards.length === 0) {
            d.get_field('preview_area').$wrapper.html(`
                <div class="text-muted text-center p-4">
                    No visible cards to display
                </div>
            `);
            return;
        }

        // Now get the results for each card
        const cardsWithResults = await Promise.all(validCards.map(async card => {
            try {
                const result = await frappe.call({
                    method: 'frappe.desk.doctype.number_card.number_card.get_result',
                    args: {
                        card: card.name,
                        doc: {
                            ...card,
                            filters_json: card.filters_json || '{}'
                        },
                        filters: card.filters_json ? JSON.parse(card.filters_json) : {}
                    }
                });

                return {
                    ...card,
                    value: result.message
                };
            } catch (error) {
                console.error(`Error getting result for card ${card.name}:`, error);
                return {
                    ...card,
                    error: true
                };
            }
        }));

        // Generate HTML for all cards
        let html = `<div class="sva-cards-container">`;

        cardsWithResults.forEach(card => {
            const currencySymbol = typeof card.value === 'number' ? '₹' : '';
            if (card.error) {
                html += `
                    <div class="preview-card error">
                        <div class="preview-card-container">
                            <div class="preview-card-content">
                                <div class="preview-card-header">
                                    <h3 class="preview-card-title">${card.card_label}</h3>
                                    <div class="preview-card-icon">
                                        <i class="fa fa-exclamation-triangle"></i>
                                    </div>
                                </div>
                                <div class="preview-card-value text-danger">Error loading data</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="preview-card">
                        <div class="preview-card-container">
                            <div class="preview-card-content">
                                <div class="preview-card-header">
                                    <h3 class="preview-card-title">${card.card_label}</h3>
                                    <div class="preview-card-icon">
                                        <i class="${card.type === 'Report' ? 'fa fa-file-text' : 'fa fa-chart-line'}"></i>
                                    </div>
                                </div>
                                <div class="preview-card-value">${currencySymbol}${formatValue(card.value)}</div>
                                ${card.document_type ? `<div class="preview-card-subtitle">${card.document_type}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        html += `</div>`;
        d.get_field('preview_area').$wrapper.html(html);
    }).catch(error => {
        console.error('Error in preview:', error);
        d.get_field('preview_area').$wrapper.html(`
            <div class="text-danger p-4">
                <i class="fa fa-exclamation-circle"></i>
                Error loading preview: ${error.message || 'Unknown error'}
            </div>
        `);
    });
}

// Helper function to format values
function formatValue(value) {
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
                return formatIndianInteger(intPart) + '.' + decPart;
            }
            return formatIndianInteger(numStr);
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

function formatIndianInteger(numStr) {
    numStr = numStr.toString().replace(/,/g, '');
    const lastThree = numStr.substring(numStr.length - 3);
    const otherNumbers = numStr.substring(0, numStr.length - 3);
    if (otherNumbers !== '') {
        return otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }
    return lastThree;
}

// Function to refresh card values in preview
// function refresh_card_values(dialog, frm) {
//     frm.doc.cards.forEach(card => {
//         if (card.is_visible && card.number_card) {
//             // First get the card doc to get its filters and document type
//             frappe.db.get_doc('Number Card', card.number_card)
//                 .then(card_doc => {
//                     frappe.call({
//                         method: 'frappe.desk.doctype.number_card.number_card.get_result',
//                         args: {
//                             card: card.number_card,
//                             doc: card_doc,
//                             filters: card_doc.filters_json ? JSON.parse(card_doc.filters_json) : {}
//                         },
//                         callback: function (r) {
//                             if (r.message !== undefined) {
//                                 let card_element = dialog.get_field('preview_area')
//                                     .$wrapper.find(`[data-name="${card.number_card}"] .number-card-value`);
//                                 if (card_element.length) {
//                                     card_element.html(r.message);
//                                 }
//                             }
//                         }
//                     });
//                 });
//         }
//     });
// }


// Function to refresh card values in preview
async function refresh_card_values(dialog, frm) {
    try {
        const cards = await Promise.all(frm.doc.cards.map(async card => {
            if (!card.number_card) return null;

            try {
                const cardDoc = await frappe.db.get_doc('Number Card', card.number_card);

                // If it's a Report type card, get document_type from report
                if (cardDoc.type === 'Report' && cardDoc.report_name) {
                    const reportDoc = await frappe.db.get_value('Report', cardDoc.report_name, ['ref_doctype']);
                    if (reportDoc?.message?.ref_doctype) {
                        cardDoc.document_type = reportDoc.message.ref_doctype;
                    }
                }

                const result = await frappe.call({
                    method: 'frappe.desk.doctype.number_card.number_card.get_result',
                    args: {
                        card: cardDoc.name,
                        doc: {
                            ...cardDoc,
                            filters_json: cardDoc.filters_json || '{}'
                        },
                        filters: cardDoc.filters_json ? JSON.parse(cardDoc.filters_json) : {}
                    }
                });

                return {
                    ...cardDoc,
                    value: result.message,
                    card_label: card.card_label || cardDoc.label,
                    is_visible: card.is_visible
                };
            } catch (error) {
                console.error(`Error refreshing card ${card.number_card}:`, error);
                return {
                    name: card.number_card,
                    card_label: card.card_label,
                    error: true
                };
            }
        }));

        // Filter out null values and non-visible cards
        const validCards = cards.filter(card => card && card.is_visible);

        if (validCards.length === 0) {
            dialog.get_field('preview_area').$wrapper.html(`
                <div class="text-muted text-center p-4">
                    No visible cards to display
                </div>
            `);
            return;
        }

        // Generate HTML for all cards
        let html = `<div class="sva-cards-container">`;

        validCards.forEach(card => {
            const currencySymbol = typeof card.value === 'number' ? '₹' : '';
            if (card.error) {
                html += `
                    <div class="preview-card error">
                        <div class="preview-card-container">
                            <div class="preview-card-content">
                                <div class="preview-card-header">
                                    <h3 class="preview-card-title">${card.card_label}</h3>
                                    <div class="preview-card-icon">
                                        <i class="fa fa-exclamation-triangle"></i>
                                    </div>
                                </div>
                                <div class="preview-card-value text-danger">Error loading data</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="preview-card">
                        <div class="preview-card-container">
                            <div class="preview-card-content">
                                <div class="preview-card-header">
                                    <h3 class="preview-card-title">${card.card_label}</h3>
                                    <div class="preview-card-icon">
                                        <i class="${card.type === 'Report' ? 'fa fa-file-text' : 'fa fa-chart-line'}"></i>
                                    </div>
                                </div>
                                <div class="preview-card-value">${currencySymbol}${formatValue(card.value)}</div>
                                ${card.document_type ? `<div class="preview-card-subtitle">${card.document_type}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }
        });

        html += `</div>`;
        dialog.get_field('preview_area').$wrapper.html(html);

    } catch (error) {
        console.error('Error refreshing values:', error);
        dialog.get_field('preview_area').$wrapper.html(`
            <div class="text-danger p-4">
                <i class="fa fa-exclamation-circle"></i>
                Error refreshing values: ${error.message || 'Unknown error'}
            </div>
        `);
    }
}