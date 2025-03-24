// Copyright (c) 2025, Suvaidyam and contributors
// For license information, please see license.txt

frappe.ui.form.on("SVAWorkspace Configuration", {
	refresh(frm) {

	},

});
frappe.ui.form.on("SVAWorkspace Heatmap Child", {
    form_render: async function(frm, cdt, cdn) {
        let workspace = frm.doc.workspace;
        if(workspace){
            let res = await frappe.call('frappe_theme.wp_api.get_html_blocks',{workspace: workspace});
            frm.cur_grid.grid_form.fields_dict.custom_block.get_query = () => {
                return {
                    filters: { 'name': ['IN', res.message] },
                    limit_page_length: 100
                }
            }
        }
        let row = locals[cdt][cdn];
        let slected_targets = JSON.parse(row.target_fields || "[]").map((field) => {return {label:field.label,value:field.fieldname}} );
        frm.cur_grid.set_field_property('primary_target','options',slected_targets)
    },
    target_fields:async function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        let slected_targets = JSON.parse(row.target_fields || "[]").map((field) => {return {label:field.label,value:field.fieldname}} );
        console.log(slected_targets,'slected_targts');
    },
    setup_target_fields: async function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if(row.report){
            let res = await frappe.call({method: 'frappe.desk.query_report.run',args: { report_name: row.report }});
            let fields = res.message?.columns?.filter((col) => ["Int","Float","Currency"].includes(col.fieldtype))?.map(col => {
                return {
                    label: col.label,
                    fieldname: col.fieldname,
                    fieldtype: col.fieldtype
                };
            });
            let prev_targets = JSON.parse(row.target_fields || "[]").map((field) => {return field.fieldname} );
            let dialog = new frappe.ui.Dialog({
                title: __('Select Target Fields'),
                fields: fields.map(field => {
                    return {
                        label: field.label,
                        fieldname: field.fieldname,
                        default: prev_targets.includes(field.fieldname),
                        fieldtype: 'Check'
                    };
                }),
                primary_action_label: 'Submit',
                primary_action(values) {
                    let target_fields = [];
                    fields.forEach(field => {
                        if(values[field.fieldname]){
                            target_fields.push({
                                fieldname: field.fieldname,
                                label: field.label,
                                fieldtype: field.fieldtype
                            });
                        }
                    });
                    
                    frappe.model.set_value(cdt, cdn, "target_fields", JSON.stringify(target_fields));
                    dialog.clear();
                    dialog.hide();
                },
                secondary_action_label: 'Cancel',
                secondary_action() {
                    dialog.clear();
                    dialog.hide();
                }
            }).show();
        }else{
            frappe.show_alert({
                message: __('Please select a report'),
                indicator: 'red'
            });
        }
    }

});
