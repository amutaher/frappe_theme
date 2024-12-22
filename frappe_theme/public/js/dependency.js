
const getData = async (dt) => {
    return new Promise((resolve, reject) => {
        frappe.call({
            method: "frappe_theme.api.get_property_set",
            args: {
                doctype: dt
            },
            callback: function (r) {
                if (r && r.message) {
                    resolve(r.message);
                } else {
                    reject("Error fetching data");
                }
            }
        });
    });
};
function apply_filter(field_name, filter_on, frm, filter_value) {
    frm.fields_dict[field_name].get_query = () => {
        return {
            filters: {
                [filter_on]: filter_value || frm.doc[filter_on] || `please select ${filter_on}`,
            },
            page_length: 1000
        };
    }
}

const tabContent = async (frm, tab_field) => {
    if (await frappe.db.exists('SVADatatable Configuration', frm.doc.doctype)) {
        let dts = await frappe.db.get_doc('SVADatatable Configuration', frm.doc.doctype);
        let tab_fields = []
        let tab_field_index = frm.meta?.fields?.findIndex(f => f.fieldname == tab_field)
        if ((tab_field_index + 1) > frm.meta?.fields.length) {
            return;
        }
        for (let i = (tab_field_index + 1); i < frm.meta?.fields.length; i++) {
            let f = frm.meta?.fields[i]
            if (f.fieldtype == 'Tab Break') {
                break;
            }
            if (f.fieldtype == 'HTML') {
                tab_fields.push(f.fieldname)
            }
        }
        let dtFields = dts.child_doctypes?.filter(f => tab_fields.includes(f.html_field))
        for (let _f of dtFields) {
            if (_f?.connection_type == "Is Custom Design") {
                if (_f?.template == "Gallery") {
                    gallery_image(frm, _f.html_field);
                }
                if (_f?.template == "Email") {
                    communication(frm, _f.html_field);
                }
                if (_f?.template == "Tasks") {
                    getTaskList(frm, _f.html_field);
                }
                if (_f?.template == "Timeline") {
                    showTimelines(frm, _f.html_field);
                }
                if (_f?.template == "Notes") {
                    await render_note(frm,_f.html_field);
                }
            } else {
                let childLinks = dts.child_confs.filter(f => f.parent_doctype == _f.link_doctype)
                new SvaDataTable({
                    wrapper: document.querySelector(`[data-fieldname="${_f.html_field}"]`), // Wrapper element   // Pass your data
                    doctype: _f.connection_type == "Direct" ? _f.link_doctype : _f.referenced_link_doctype, // Doctype name
                    frm: frm,       // Pass the current form object (optional)
                    connection: _f,
                    childLinks: childLinks,
                    options: {
                        serialNumberColumn: true, // Enable serial number column (optional)
                        editable: false,      // Enable editing (optional),
                    }
                });
            }
        }
    }
}
const mapEvents = (props) => {
    let obj = {};
    if (props.length) {
        for (let prop of props) {
            if (prop) {
                let abc = prop.value.split("->")
                obj[abc[0]] = function (frm) {
                    apply_filter(prop.field_name, abc[0], frm, frm.doc[abc[1]]);
                    frm.set_value(prop.field_name, "");
                }
            }
        }
    }
    return {
        refresh: async function (frm) {
            let tab_field = frm.get_active_tab()?.df?.fieldname;
            tabContent(frm, tab_field)
            $('a[data-toggle="tab"]').on('shown.bs.tab', async function (e) {
                let tab_field = frm.get_active_tab()?.df?.fieldname;
                tabContent(frm, tab_field)
            });
            if (props.length) {
                for (let prop of props) {
                    if (prop) {
                        let abc = prop.value.split("->")
                        apply_filter(prop.field_name, abc[0], frm, frm.doc[abc[1]]);
                    }
                }
            }
        },
        ...obj
    }
}
async function setDynamicProperties() {
    if (cur_frm) {
        try {
            if (cur_frm.doc.doctype == "DocType") {
                cur_frm.add_custom_button('Set Property', () => {
                    set_properties(cur_frm.doc.name);
                });
            }
            let props = await getData(cur_frm.doc.doctype);
            frappe.ui.form.on(cur_frm.doc.doctype, mapEvents(props ?? []));
            frappe.ui.form.trigger(cur_frm.doc.doctype, 'refresh', cur_frm);
        } catch (error) {
            console.error("Error setting dynamic properties:", error);
        }
    }
}
// console.log(frappe,'frappe');
frappe.router.on('change', async () => {
    let interval;
    let elapsedTime = 0;
    const checkInterval = 500; // Check every 500 ms
    const maxTime = 10000; // 10 seconds in milliseconds

    interval = setInterval(async function () {
        elapsedTime += checkInterval;

        // Condition: Stop if the desired value exists in cur_frm
        if (cur_frm || elapsedTime >= maxTime) {
            $('.form-footer').remove();
            clearInterval(interval);
            await setDynamicProperties();
            return;
        }
    }, checkInterval);
});

const set_properties = async (doctype) => {
    let res = await frappe.db.get_list('Property Setter', {
        filters: {
            doc_type: doctype
        }
    })

    let list = new frappe.ui.Dialog({
        title: 'Set Property',
        fields: [
            {
                label: 'List of Properties',
                fieldname: 'property_name',
                fieldtype: 'Autocomplete',
                options: res.map(d => d.name),
                depends_on: `eval: ${JSON.stringify(res.length)} > 0`,
            },
            {
                label: 'New Property Value',
                fieldname: 'property_value',
                fieldtype: 'Data',
                mandatory_depends_on: 'eval: !doc.property_name ',
                depends_on: 'eval: !doc.property_name'
            }
        ],
        primary_action_label: 'Set',
        primary_action: async function () {
            let property_value = list.fields_dict.property_value.get_value()
            list.hide();
            add_properties(doctype, property_value);
        }
    })
    list.show();
}

const add_properties = async (doctype, new_property) => {
    let fields = await frappe.call('frappe_theme.api.get_meta_fields', { doctype: 'Property Setter' });

    let add = new frappe.ui.Dialog({
        title: 'Add Property',
        fields: fields.message.map(d => {
            return {
                label: d.label,
                fieldname: d.fieldname,
                fieldtype: d.fieldtype,
                options: d.options,
                default: d.fieldname == 'property' ? new_property : '',
                reqd: d.reqd,
                read_only: d.fieldname == 'property' ? 1 : 0,
            }
        }),
        primary_action_label: 'Add',
        primary_action: async function () {
            let res = await frappe.call({
                method: 'frappe.desk.form.save.savedocs',
                args: {
                    doc: {
                        doctype: 'Property Setter',
                        doc_type: doctype,
                        doctype_or_field: add.fields_dict.doctype_or_field.get_value(),
                        property: new_property,
                        row_name: add.fields_dict.row_name.get_value(),
                        module: add.fields_dict.module.get_value(),
                        value: add.fields_dict.value.get_value(),
                        property_type: add.fields_dict.property_type.get_value(),
                        default_value: add.fields_dict.default_value.get_value(),
                    },
                    action: 'Save',
                }
            });
            if (res.docs.length > 0) {
                frappe.msgprint('Property set successfully');
                add.hide();
            }
        }
    })
    add.show();
}