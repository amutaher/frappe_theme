frappe.ui.form.on('Number Card Mapper', {
    refresh: function (frm) {
        frm.add_custom_button(__('Refresh Cards'), function () {
            frm.reload_doc();
        });

        frm.add_custom_button(__('Preview Cards'), function () {
            preview_cards(frm);
        });

        // Set filters for number_card field
        frm.set_query('number_card', 'cards', function () {
            return {
                filters: {
                    document_type: frm.doc.doctype_field || ''
                }
            };
        });

        // Refresh the grid
        if (frm.doc.cards) {
            frm.doc.cards.forEach((card, idx) => {
                if (card.number_card && !card.card_label) {
                    update_card_label(frm, card);
                }
            });
        }
    },

    doctype_field: function (frm) {
        if (frm.doc.doctype_field) {
            frappe.call({
                method: 'frappe_theme.api.get_html_fields',
                args: {
                    doctype: frm.doc.doctype_field
                },
                callback: function (r) {
                    if (r.message) {
                        let options = r.message.map(field => field.fieldname);
                        frm.set_df_property('wrapper_field', 'options', [''].concat(options));
                        frm.refresh_field('wrapper_field');
                    }
                }
            });
        }
    },

    validate: function (frm) {
        // Update sequence numbers
        if (frm.doc.cards) {
            frm.doc.cards.forEach((card, idx) => {
                frappe.model.set_value(card.doctype, card.name, 'sequence', idx + 1);
            });
        }
    }
});

frappe.ui.form.on('Number Card Mapper Child', {
    cards_add: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.sequence = (frm.doc.cards || []).length;
        row.is_visible = 1;
        frm.refresh_field('cards');
    },

    number_card: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.number_card) {
            update_card_label(frm, row);
        }
    },

    form_render: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.number_card && !row.card_label) {
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
                frm.refresh_field('cards');
            }
        });
}

// Preview function
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
        size: 'large'
    });

    d.show();
    d.get_field('preview_area').$wrapper.html('<div class="text-muted text-center">Loading preview...</div>');

    frappe.call({
        method: 'frappe_theme.api.get_cards_preview',
        args: {
            mapper_name: frm.doc.name
        },
        callback: function (r) {
            if (r.message) {
                d.get_field('preview_area').$wrapper.html(r.message);
            }
        }
    });
}