
class CustomListView {
  constructor({ frm, connection }) {
    this.frm = frm;
    this.connection = connection;
  }
  custom_import() {
     
    let cus_popup = new frappe.ui.Dialog({
      title: __("Data Import"),
      fields: [
        {
          fieldname: "import_type",
          label: __("Import Type"),
          fieldtype: "Select",
          options: ["", "Insert New Records", "Update Existing Records"],
          reqd: 1,
          onchange: () => {
            let importType = cus_popup.get_value("import_type");
            if (importType) {
              frappe.db.insert({
                doctype: "Data Import",
                import_type: importType,
                custom_parent_ref_doctype: this.frm.doctype,
                custom_parent_ref_doc: this.frm.docname,
                reference_doctype: this.connection.link_doctype,
                user: frappe.session.user,
                status: "Pending",
                docstatus: 0,
              }).then((doc) => {
                cus_popup.set_value("name", doc.name);
                frappe.show_alert({
                  message: __("Data Import ready to csv upload file"),
                  indicator: "green"
                });
              });

            }
          }
        },
        {
          fieldname: "download_template",
          label: __("Download Template"),
          fieldtype: "Button",
          "depends_on": "eval: doc.import_type",
          click: () => {
            let importType = cus_popup.get_value("import_type");
            if (importType) {
              frappe.require("data_import_tools.bundle.js", () => {
                frm.data_exporter = new frappe.data_import.DataExporter(
                  this.connection.link_doctype,
                  importType,
                );
              });
            }
          },
        },
        {
          fieldname: "import_file",
          label: __("Import File"),
          fieldtype: "Attach",
          depends_on: "eval: doc.import_type",
          onchange: () => {
            let import_file = cus_popup.get_value("import_file")
            let name = cus_popup.get_value("name")
            frappe.db.set_value("Data Import", name, "import_file", import_file);
          },
        },
        {
          "depends_on": "eval:doc.google_sheets_url && !doc.__unsaved &&  ['Success', 'Partial Success'].includes(doc.status)",
          "fieldname": "refresh_google_sheet",
          "fieldtype": "Button",
          "label": "Refresh Google Sheet"
        },
        {
          fieldname: "name",
          label: __("Name"),
          fieldtype: "Data",
          reqd: 1,
          "hidden": 1,
        },
      ],
      primary_action_label: __("Start Import"),
      primary_action: (values) => {
        // frappe.call({
        //   method: "frappe.core.doctype.data_import.data_import.form_start_import",
        //   args: {
        //     data_import: values.name
        //   },

        // }).then((r) => {
        //   frappe.show_alert({
        //     message: __("Data Import started"),
        //     indicator: "green"
        //   }); 

        //   // cus_popup.hide();
        // });
      }
    });
    cus_popup.show();
  }

}


