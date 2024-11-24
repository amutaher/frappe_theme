// Copyright (c) 2024, Suvaidyam and contributors
// For license information, please see license.txt

// frappe.ui.form.on("SVADatatable Configuration", {
//     refresh: function(frm) {
//     },
// });
var response_dts = [];
frappe.ui.form.on("SVADatatable Configuration Child", {
    async form_render(frm) {
        response_dts = await frappe.db.get_list('DocField', 
            { 
                filters:[
                    ['DocField','options','=',frm.doc.parent_doctype],
                    ['DocField','parenttype','=',"DocType"]
                ],
                fields: ['parent','fieldname','label'] 
            }
        );
        frm.cur_grid.grid_form.fields_dict.link_doctype.get_query = () => {
            return {
                filters: {
                    'name': ['in', response_dts ? response_dts.map(d => d.parent) : []]
                }
            }
        }
        let html_fields = await frappe.db.get_list('DocField', { filters: { 'parent': frm.doc.parent_doctype, 'fieldtype': 'HTML' }, fields: ['fieldname'] });
        let options = html_fields.map(function (d) { return d.fieldname });
        frm?.cur_grid?.set_field_property('html_field', 'options', options);
    },
    link_doctype:async function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if(row.link_doctype){
            let field = response_dts.find(d => d.parent === row.link_doctype);
            if(field){
                frappe.model.set_value(cdt, cdn, 'link_fieldname', field.fieldname);
            }
        }else{
            frappe.model.set_value(cdt, cdn, 'link_fieldname', '');
        }
    },
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
    },
    async setup_crud_permissions(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        let prev_permissions = JSON.parse(row.crud_permissions ?? '["read", "write", "create", "delete"]');
        let fields = ["read", "write", "create", "delete"].map(p => {return {
            label: p[0].toUpperCase() + p.slice(1),
            fieldname: p,
            fieldtype: 'Check',
            default: prev_permissions.includes(p) || p === "read",
            read_only: p === "read",
            onchange: function () {
                const fieldname = this.df.fieldname;
                const value = this.get_value();
                if (value) {
                    if (!prev_permissions.includes(fieldname)) {
                        prev_permissions.push(fieldname);
                    }
                } else {
                    prev_permissions = prev_permissions.filter(f => f !== fieldname);
                }
            }
        }});
        let permissions_dialog = new frappe.ui.Dialog({
            title: __('CRUD Permissions'),
            fields: fields,
            primary_action_label: __('Save'),
            primary_action: async () => {
                frappe.model.set_value(cdt,cdn,"crud_permissions",JSON.stringify(prev_permissions));
                permissions_dialog.hide();
            }
        });
        permissions_dialog.show();
    },
    
});
var child_response_dts = [];
frappe.ui.form.on("SVADatatable Child Conf", {
    async form_render(frm,cdt,cdn) {
        child_response_dts = await frappe.db.get_list('DocField', 
            { 
                filters:[
                    ['DocField','options','=',frm.doc.parent_doctype],
                    ['DocField','parenttype','=',"DocType"]
                ],
                fields: ['parent','fieldname','label'] 
            }
        );
        frm.cur_grid.grid_form.fields_dict.link_doctype.get_query = () => {
            return {
                filters: {
                    'name': ['in', response_dts ? response_dts.map(d => d.parent) : []]
                }
            }
        }
        let html_fields = await frappe.db.get_list('DocField', { filters: { 'parent': frm.doc.parent_doctype, 'fieldtype': 'HTML' }, fields: ['fieldname'] });
        let options = html_fields.map(function (d) { return d.fieldname });
        frm?.cur_grid?.set_field_property('html_field', 'options', options);
    },
    link_doctype:async function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if(row.link_doctype){
            let field = response_dts.find(d => d.parent === row.link_doctype);
            if(field){
                frappe.model.set_value(cdt, cdn, 'link_fieldname', field.fieldname);
            }
        }else{
            frappe.model.set_value(cdt, cdn, 'link_fieldname', '');
        }
    },
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
    },
    async setup_crud_permissions(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        let prev_permissions = JSON.parse(row.crud_permissions ?? '["read", "write", "create", "delete"]');
        let fields = ["read", "write", "create", "delete"].map(p => {return {
            label: p[0].toUpperCase() + p.slice(1),
            fieldname: p,
            fieldtype: 'Check',
            default: prev_permissions.includes(p) || p === "read",
            read_only: p === "read",
            onchange: function () {
                const fieldname = this.df.fieldname;
                const value = this.get_value();
                if (value) {
                    if (!prev_permissions.includes(fieldname)) {
                        prev_permissions.push(fieldname);
                    }
                } else {
                    prev_permissions = prev_permissions.filter(f => f !== fieldname);
                }
            }
        }});
        let permissions_dialog = new frappe.ui.Dialog({
            title: __('CRUD Permissions'),
            fields: fields,
            primary_action_label: __('Save'),
            primary_action: async () => {
                frappe.model.set_value(cdt,cdn,"crud_permissions",JSON.stringify(prev_permissions));
                permissions_dialog.hide();
            }
        });
        permissions_dialog.show();
    },
    
});
