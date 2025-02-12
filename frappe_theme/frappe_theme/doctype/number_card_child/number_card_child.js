frappe.ui.form.on('Number Card Child', {
    cards_add: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.sequence = (frm.doc.cards || []).length;
        row.is_visible = 1;
        frm.refresh_field('cards');
    },


    refresh: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.parent) return;

        // Get HTML fields for wrapper_field options
        frappe.call({
            method: 'frappe_theme.api.get_html_fields',
            args: {
                doctype: frappe.get_doc('Visualization Mapper', row.parent).doctype_field
            },
            callback: function (r) {
                if (r.message) {
                    frappe.meta.get_docfield(cdt, 'wrapper_field', cdn).options = r.message;
                    frm.refresh_field('wrapper_field');
                }
            }
        });
    },

    wrapper_field: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.wrapper_field) return;

        // Check for duplicates in the same mapper
        let duplicate = frm.doc.cards.find(card =>
            card.name !== row.name &&
            card.wrapper_field === row.wrapper_field
        );

        if (duplicate) {
            frappe.model.set_value(cdt, cdn, 'wrapper_field', '');
            frappe.throw(__(`Wrapper field "${row.wrapper_field}" is already used in row ${duplicate.idx}`));
        }
    },

    setup: function (frm) {
        frm.set_query('number_card', function (doc) {
            return {
                filters: {
                    is_standard: 0
                }
            };
        });
    },

    refresh: function (frm) {
        // Get parent's doctype_field
        let parent_form = frappe.get_doc('Visualization Mapper', frm.doc.parent);
        if (parent_form && parent_form.doctype_field) {
            // Get HTML fields from the parent's doctype
            frappe.call({
                method: 'frappe_theme.api.get_html_fields',
                args: {
                    doctype: parent_form.doctype_field
                },
                callback: function (r) {
                    if (r.message) {
                        frm.set_df_property('wrapper_field', 'options', r.message);
                    }
                }
            });
        }
    }
});
