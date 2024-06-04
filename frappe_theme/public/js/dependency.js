
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

async function setDynamicProperties() {
    if(cur_frm){
        try {
            let props = await getData(cur_frm.doc.doctype);
            if (!props.length) {
                return;
            }
            for (let prop of props) {
                if (prop) {
                    let abc = prop.value.split("->")
                    frappe.ui.form.on(prop.doc_type, {
                        refresh: function (frm) {
                            apply_filter(prop.field_name,abc[0], frm, frm.doc[abc[1]]);
                        },
                        [abc[0]]: function (frm) {
                            apply_filter(prop.field_name,abc[0], frm, frm.doc[abc[1]]);
                            frm.set_value(prop.field_name, "");
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error setting dynamic properties:", error);
        }
    }
}
// console.log(frappe,'frappe');
frappe.router.on('change', async () => {
    await setDynamicProperties();
});

