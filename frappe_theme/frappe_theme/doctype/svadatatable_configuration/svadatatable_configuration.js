// Copyright (c) 2024, Suvaidyam and contributors
// For license information, please see license.txt

// frappe.ui.form.on("SVADatatable Configuration", {
//     refresh: function(frm) {
//     },
// });
const set_list_settings = async (frm, cdt, cdn) => {
    let row = locals[cdt][cdn];
    let dtmeta = await frappe.call({
        method: 'frappe_theme.api.get_meta',
        args: { doctype: row.connection_type == "Direct" ? row.link_doctype : row.referenced_link_doctype ?? row.link_doctype }
    });
    new ListSettings({
        doctype: row.connection_type == "Direct" ? row.link_doctype : row.referenced_link_doctype ?? row.link_doctype,
        meta: dtmeta.message,
        settings: row,
        dialog_primary_action: async (listview_settings) => {
            frappe.model.set_value(cdt, cdn, "listview_settings", JSON.stringify(listview_settings));
            frappe.show_alert({ message: __('Listview settings updated'), indicator: 'green' });
        }
    });
}
const set_crud_permissiions = (frm, cdt, cdn) => {
    let row = locals[cdt][cdn];
    let prev_permissions = JSON.parse(row.crud_permissions ?? '["read", "write", "create", "delete"]');
    let fields = ["read", "write", "create", "delete"].map(p => {
        return {
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
        }
    });
    let permissions_dialog = new frappe.ui.Dialog({
        title: __('CRUD Permissions'),
        fields: fields,
        primary_action_label: __('Save'),
        primary_action: async () => {
            frappe.model.set_value(cdt, cdn, "crud_permissions", JSON.stringify(prev_permissions));
            permissions_dialog.hide();
        }
    });
    permissions_dialog.show();
}
var final_dt_options = [];
frappe.ui.form.on("SVADatatable Configuration Child", {
    async form_render(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.connection_type === 'Direct') {
            frm.cur_grid.grid_form.fields_dict.link_doctype.get_query = () => {
                return {
                    filters: [
                        ['DocField', 'options', '=', frm.doc.parent_doctype],
                        ['DocField', 'parenttype', '=', "DocType"]
                    ],
                    limit_page_length: 100
                }
            }
        }
        if (row.connection_type === 'Referenced') {
            let modules = await frappe.db.get_list('Module Def', { filters: { 'app_name': ['!=', "frappe"] }, pluck: 'name' });
            let dts = await frappe.db.get_list('DocType', {
                filters: [
                    ['DocType', 'module', 'IN', modules],
                    ['DocField', 'options', '=', "DocType"],
                    ['DocType', 'istable', '=', 0],
                ],
                pluck: 'name'
            });
            let dts_2 = await frappe.db.get_list('Custom Field', {
                filters: [
                    ['Custom Field', 'options', '=', "DocType"]
                ],
                fields: ['dt', 'fieldname']
            });
            let dt_options = [];
            if (dts.length) {
                dt_options = dts;
                final_dt_options = dts.map(d => { return { 'dt': d, 'parent': "DocType" } });
            }
            if (dts_2.length) {
                dt_options = dt_options.concat(dts_2?.map(d => d.dt));
                final_dt_options = final_dt_options.concat(dts_2.map(d => { return { 'dt': d.dt, 'fieldname': d.fieldname, 'parent': "Custom Field" } }));
            }
            if (dt_options.length) {
                frm.cur_grid.grid_form.fields_dict.referenced_link_doctype.set_data(dt_options);
            }
        }

        let html_fields = await frappe.db.get_list('DocField', { filters: { 'parent': frm.doc.parent_doctype, 'fieldtype': 'HTML' }, fields: ['fieldname'] });
        let html_fields_2 = await frappe.db.get_list('Custom Field', { filters: { 'dt': frm.doc.parent_doctype, 'fieldtype': 'HTML' }, fields: ['fieldname'] });
        if (html_fields_2.length) {
            html_fields = html_fields.concat(html_fields_2);
        }
        let options = html_fields.map(function (d) { return d.fieldname });
        frm?.cur_grid?.set_field_property('html_field', 'options', options);
    },
    connection_type: async function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.connection_type === 'Direct') {
            frm.cur_grid.grid_form.fields_dict.link_doctype.get_query = () => {
                return {
                    filters: [
                        ['DocField', 'options', '=', frm.doc.parent_doctype],
                        ['DocField', 'parenttype', '=', "DocType"]
                    ],
                    limit_page_length: 100
                }
            }
        }
        if (row.connection_type === 'Referenced') {
            let modules = await frappe.db.get_list('Module Def', { filters: { 'app_name': ['!=', "frappe"] }, pluck: 'name' });
            let dts = await frappe.db.get_list('DocType', {
                filters: [
                    ['DocType', 'module', 'IN', modules],
                    ['DocField', 'options', '=', "DocType"],
                    ['DocType', 'istable', '=', 0],
                ],
                pluck: 'name'
            });
            let dts_2 = await frappe.db.get_list('Custom Field', {
                filters: [
                    ['Custom Field', 'options', '=', "DocType"]
                ],
                fields: ['dt', 'fieldname']
            });
            let dt_options = [];
            if (dts.length) {
                dt_options = dts;
                final_dt_options = dts.map(d => { return { 'dt': d, 'parent': "DocType" } });
            }
            if (dts_2.length) {
                dt_options = dt_options.concat(dts_2?.map(d => d.dt));
                final_dt_options = final_dt_options.concat(dts_2.map(d => { return { 'dt': d.dt, 'fieldname': d.fieldname, 'parent': "Custom Field" } }));
            }
            if (dt_options.length) {
                frm.cur_grid.grid_form.fields_dict.referenced_link_doctype.set_data(dt_options);
            }
        }
    },
    link_doctype: async function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.link_doctype) {
            let fields = await frappe.db.get_list("DocField", {
                filters: [
                    ['DocField', 'options', '=', frm.doc.parent_doctype],
                    ['DocField', 'parenttype', '=', "DocType"],
                    ['DocField', 'parent', '=', row.link_doctype]
                ],
                fields: ['fieldname', 'label', 'parent']
            });
            let field = fields[0];
            if (field) {
                frappe.model.set_value(cdt, cdn, 'link_fieldname', field.fieldname);
            }
        } else {
            frappe.model.set_value(cdt, cdn, 'link_fieldname', '');
        }
    },
    referenced_link_doctype: async function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.referenced_link_doctype) {
            let dt = final_dt_options.find(d => d.dt === row.referenced_link_doctype);
            let ref_dt_field = '';
            let ref_dn_field = '';
            if (dt.parent === "Custom Field") {
                ref_dt_field = dt.fieldname;
                let ref_dn_fields = await frappe.db.get_list('Custom Field', { filters: { 'dt': row.referenced_link_doctype, 'fieldtype': 'Dynamic Link', 'options': ref_dt_field }, fields: ['fieldname'] });
                if (ref_dn_fields.length) {
                    ref_dn_field = ref_dn_fields[0].fieldname;
                }
            } else {
                let ref_dt_fields = await frappe.db.get_list('DocField', { filters: { 'parent': row.referenced_link_doctype, 'fieldtype': 'Link', 'options': "DocType" }, fields: ['fieldname'] });
                if (ref_dt_fields.length) {
                    ref_dt_field = ref_dt_fields[0].fieldname;
                }
                let ref_dn_fields = await frappe.db.get_list('DocField', { filters: { 'parent': row.referenced_link_doctype, 'fieldtype': 'Dynamic Link', 'options': ref_dt_field }, fields: ['fieldname'] });
                if (ref_dn_fields.length) {
                    ref_dn_field = ref_dn_fields[0].fieldname;
                }
            }
            if (ref_dt_field && ref_dn_field) {
                frappe.model.set_value(cdt, cdn, 'dt_reference_field', ref_dt_field);
                frappe.model.set_value(cdt, cdn, 'dn_reference_field', ref_dn_field);
            }
        } else {
            frappe.model.set_value(cdt, cdn, 'dt_reference_field', '');
            frappe.model.set_value(cdt, cdn, 'dn_reference_field', '');
        }
    },
    async setup_list_settings(frm, cdt, cdn) {
        await set_list_settings(frm, cdt, cdn);
    },
    async setup_crud_permissions(frm, cdt, cdn) {
        set_crud_permissiions(frm, cdt, cdn);
    },

});

var child_response_dts = [];
frappe.ui.form.on("SVADatatable Child Conf", {
    async form_render(frm, cdt, cdn) {
        frm.cur_grid.grid_form.fields_dict.parent_doctype.get_query = () => {
            return {
                filters: {
                    'name': ['in', frm.doc.child_doctypes.length ? frm.doc.child_doctypes?.map((i) => { return i.link_doctype }) : []]
                }
            }
        }

        let html_fields = await frappe.db.get_list('DocField', { filters: { 'parent': frm.doc.parent_doctype, 'fieldtype': 'HTML' }, fields: ['fieldname'] });
        let options = html_fields.map(function (d) { return d.fieldname });
        frm?.cur_grid?.set_field_property('html_field', 'options', options);
    },
    parent_doctype: async function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        child_response_dts = await frappe.db.get_list('DocField',
            {
                filters: [
                    ['DocField', 'options', '=', row.parent_doctype],
                    ['DocField', 'parenttype', '=', "DocType"]
                ],
                fields: ['parent', 'fieldname', 'label']
            }
        );
        frm.cur_grid.grid_form.fields_dict.link_doctype.get_query = () => {
            return {
                filters: {
                    'name': ['in', response_dts ? child_response_dts.map(d => d.parent) : []]
                }
            }
        }
    },
    link_doctype: async function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.link_doctype) {
            let field = child_response_dts.find(d => d.parent === row.link_doctype);
            if (field) {
                frappe.model.set_value(cdt, cdn, 'link_fieldname', field.fieldname);
            }
        } else {
            frappe.model.set_value(cdt, cdn, 'link_fieldname', '');
        }
    },
    async setup_list_settings(frm, cdt, cdn) {
        await set_list_settings(frm, cdt, cdn);
    },
    async setup_crud_permissions(frm, cdt, cdn) {
        set_crud_permissiions(frm, cdt, cdn);
    },

});
