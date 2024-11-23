// Copyright (c) 2024, Suvaidyam and contributors
// For license information, please see license.txt

// frappe.ui.form.on("SVADatatable Configuration", {
//     refresh: function(frm) {
//     },
// });

frappe.ui.form.on("SVADatatable Configuration Child", {
    async form_render(frm) {
        let html_fields = await frappe.db.get_list('DocField', { filters: { 'parent': frm.doc.parent_doctype, 'fieldtype': 'HTML' }, fields: ['fieldname'] });
        let options = html_fields.map(function (d) { return d.fieldname });
        frm?.cur_grid?.set_field_property('html_field', 'options', options);
    },
    // async setup_list_settings(frm, cdt, cdn) {
    //     let row = locals[cdt][cdn];
    //     let listview_fields = []
    //     let prev_settings = JSON.parse(row.listview_setting ?? '[]');
    //     if((prev_settings != "['*']" && prev_settings.length)) {
    //         listview_fields = prev_settings;
    //     }
    //     let dtmeta = await frappe.call('frappe_theme.api.get_meta_fields', { doctype: row.child_doctype });
    //     let fields = dtmeta.message.map(f => {return {
    //         label: f.label,
    //         fieldname: f.fieldname,
    //         fieldtype: 'Check',
    //         default: prev_settings.includes(f.fieldname),
    //         onchange: function () {
    //             const fieldname = this.df.fieldname;
    //             const value = this.get_value();
    //             if (value) {
    //                 if (!listview_fields.includes(fieldname)) {
    //                     listview_fields.push(fieldname);
    //                 }
    //             } else {
    //                 listview_fields = listview_fields.filter(f => f !== fieldname);
    //             }
    //         }
    //     }})
    //     let list_dialog = new frappe.ui.Dialog({
    //         title: __('List Settings'),
    //         fields: fields,
    //         primary_action_label: __('Save'),
    //         primary_action: async () => {
    //             if(listview_fields.length) {
    //                 row.listview_setting = JSON.stringify(listview_fields);
    //             }
    //             frm.refresh_field('svadatatable_configuration_child');
    //             list_dialog.hide();
    //         }
    //     });
    //     list_dialog.show();
    // }
    async setup_list_settings(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        let listview_fields = [];
        let prev_settings = [];
    
        try {
            prev_settings = JSON.parse(row.listview_settings || '[]');
        } catch (e) {
            console.error('Invalid listview_setting JSON', e);
        }
    
        if (Array.isArray(prev_settings)) {
            listview_fields = [...prev_settings];
        }
    
        let dtmeta = await frappe.call({
            method: 'frappe_theme.api.get_meta_fields',
            args: { doctype: row.child_doctype }
        });
    
        if (!dtmeta.message) {
            frappe.msgprint(__('No fields found for the selected Doctype.'));
            return;
        }
    
        let fields = dtmeta.message.map(f => {
            return {
                label: f.label,
                fieldname: f.fieldname,
                fieldtype: 'Check',
                default: prev_settings.includes(f.fieldname),
                onchange: function () {
                    const fieldname = this.df.fieldname;
                    const value = this.get_value();
                    if (value) {
                        if (!listview_fields.includes(fieldname)) {
                            listview_fields.push(fieldname);
                        }
                    } else {
                        listview_fields = listview_fields.filter(f => f !== fieldname);
                    }
                }
            };
        });
    
        let list_dialog = new frappe.ui.Dialog({
            title: __('List Settings'),
            fields: fields,
            primary_action_label: __('Save'),
            primary_action: async () => {
                frappe.model.set_value(cdt,cdn,"listview_settings",JSON.stringify(listview_fields));
                list_dialog.hide();
            }
        });
        list_dialog.show();
    }
    
});
