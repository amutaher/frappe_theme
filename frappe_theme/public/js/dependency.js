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
        } catch (error) {
            console.error("Error setting dynamic properties:", error);
        }
    }
}
const getPageType = () => {
    return frappe.get_route()?.[0];
}
frappe.router.on('change', async () => {
    window.onFieldClick = undefined
    window.onFieldValueChange = undefined
    window.onWorkflowStateChange = undefined
    window.SVADialog = {}
    if (getPageType() == "Form") {
        let interval;
        let elapsedTime = 0;
        const checkInterval = 1000; // Check every 500 ms
        const maxTime = 10000; // 10 seconds in milliseconds
        interval = setInterval(async function () {
            elapsedTime += checkInterval;
            if ((cur_frm) || elapsedTime >= maxTime) {
                clearInterval(interval);
                await setDynamicProperties();
                return;
            }
        }, checkInterval);
    } else {
        cur_frm = undefined
    }
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