frappe.ui.form.on('Dashboard Chart Child', {
    refresh: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.parent) return;

        // Get parent visualization mapper
        frappe.model.with_doc('Visualization Mapper', row.parent, function () {
            let parent_doc = frappe.get_doc('Visualization Mapper', row.parent);
            if (!parent_doc.doctype_field) return;

            // Get HTML fields for wrapper_field options
            frappe.call({
                method: 'frappe_theme.api.get_html_fields',
                args: {
                    doctype: parent_doc.doctype_field
                },
                callback: function (r) {
                    if (r.message) {
                        frappe.meta.get_docfield(cdt, 'wrapper_field', cdn).options = r.message;
                        frm.refresh_field('wrapper_field');
                    }
                }
            });
        });
    },

    wrapper_field: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.wrapper_field) return;

        // Get parent visualization mapper
        frappe.model.with_doc('Visualization Mapper', row.parent, function () {
            let parent_doc = frappe.get_doc('Visualization Mapper', row.parent);

            // Check for duplicates in the same mapper
            let duplicate = parent_doc.charts.find(chart =>
                chart.name !== row.name &&
                chart.wrapper_field === row.wrapper_field
            );

            if (duplicate) {
                frappe.model.set_value(cdt, cdn, 'wrapper_field', '');
                frappe.throw(__(`Wrapper field "${row.wrapper_field}" is already used in row ${duplicate.idx}`));
            }
        });
    },

    setup: function (frm) {
        frm.set_query('dashboard_chart', function (doc) {
            return {
                filters: {
                    is_standard: 0
                }
            };
        });
    }
});
