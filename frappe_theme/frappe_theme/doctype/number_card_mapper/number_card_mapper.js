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

        // // Set filters for number_card field
        // frm.set_query('number_card', 'cards', function () {
        //     return {
        //         filters: {
        //             document_type: frm.doc.doctype_field || ''
        //         }
        //     };
        // });

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

// Preview function with enhanced error handling
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

    frappe.call({
        method: 'frappe_theme.api.get_cards_preview',
        args: {
            mapper_name: frm.doc.name
        },
        callback: function (r) {
            if (r.message) {
                d.get_field('preview_area').$wrapper.html(r.message);
                // Add a small delay before refreshing values to ensure DOM is ready
                setTimeout(() => refresh_card_values(d, frm), 500);
            }
        }
    });
}

// Function to refresh card values in preview
function refresh_card_values(dialog, frm) {
    frm.doc.cards.forEach(card => {
        if (card.is_visible && card.number_card) {
            // First get the card doc to get its filters and document type
            frappe.db.get_doc('Number Card', card.number_card)
                .then(card_doc => {
                    frappe.call({
                        method: 'frappe.desk.doctype.number_card.number_card.get_result',
                        args: {
                            card: card.number_card,
                            doc: card_doc,
                            filters: card_doc.filters_json ? JSON.parse(card_doc.filters_json) : {}
                        },
                        callback: function (r) {
                            if (r.message !== undefined) {
                                let card_element = dialog.get_field('preview_area')
                                    .$wrapper.find(`[data-name="${card.number_card}"] .number-card-value`);
                                if (card_element.length) {
                                    card_element.html(r.message);
                                }
                            }
                        }
                    });
                });
        }
    });
}