frappe.ui.form.on('Number Card Mapper', {
    refresh: function (frm) {
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
        frm.set_query('number_cards', function () {
            return {
                filters: {
                    'document_type': frm.doc.doctype_field
                }
            };
        });
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
    }
});
