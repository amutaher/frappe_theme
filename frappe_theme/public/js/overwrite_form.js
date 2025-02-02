frappe.ui.form.Form = class CustomForm extends frappe.ui.form.Form {
    refresh(docname) {
        super.refresh(docname);
        if (frappe.ui.form.handlers[this.doctype]) {
            if (frappe.ui.form.handlers[this.doctype].refresh) {
                frappe.ui.form.handlers[this.doctype].refresh = [...frappe.ui.form.handlers[this.doctype]?.refresh, async (frm) => {
                    await this.custom_refresh(frm);
                }]
            } else {
                frappe.ui.form.handlers[this.doctype].refresh = [async (frm) => {
                    await this.custom_refresh(frm);
                }]
            }
        } else {
            frappe.ui.form.handlers[this.doctype] = {
                refresh: [async (frm) => {
                    await this.custom_refresh(frm);
                }]
            }
        }

    }
    async custom_refresh(frm) {
        let me = this;
        me.goToCommentButton(frm);
        let tab_field = frm.get_active_tab()?.df?.fieldname;
        me.tabContent(frm, tab_field)
        $('a[data-toggle="tab"]').on('shown.bs.tab', async function (e) {
            let tab_field = frm.get_active_tab()?.df?.fieldname;
            me.tabContent(frm, tab_field);
        });
        let props = await me.getPropertySetterData(cur_frm.doc.doctype);
        if (props.length) {
            for (let prop of props) {
                if (prop) {
                    let abc = prop.value.split("->")
                    me.apply_custom_filter(prop.field_name, abc[0], frm, frm.doc[abc[1]]);
                }
            }
        }
    }
    tabContent = async (frm, tab_field) => {
        // debugger;
        console.log(tab_field, 'tab_field INSIDE')
        if (await frappe.db.exists('SVADatatable Configuration', frm.doc.doctype) || (await frappe.db.exists('Visualization Mapper', { doctype_field: frm.doc.doctype }))) {
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
            let visualizationFields = tab_fields.filter(f => !dts?.child_doctypes?.map(d => d.html_field).includes(f))
            for (let fld of visualizationFields) {
                if (await frappe.db.exists('Visualization Mapper', { doctype_field: frm.doc.doctype, wrapper_field: fld })) {
                    let vm = await frappe.db.get_list('Visualization Mapper', {
                        filters: {
                            doctype_field: frm.doc.doctype,
                            wrapper_field: fld
                        },
                        pluck: 'name',
                        limit: 1
                    });

                    if (vm.length > 0) {
                        let visualizationMapper = await frappe.db.get_doc('Visualization Mapper', vm[0]);
                        const wrapper = document.querySelector(`[data-fieldname="${fld}"]`);

                        // Clear any existing dashboard instances
                        if (wrapper._dashboard) {
                            wrapper._dashboard = null;
                        }
                        wrapper.innerHTML = ''; // Clear the wrapper

                        isLoading(true, wrapper);

                        // Initialize SVADashboardManager and store reference
                        if (visualizationMapper?.cards?.length > 0 || visualizationMapper?.charts?.length > 0) {
                            wrapper._dashboard = new SVADashboardManager({
                                wrapper: wrapper,
                                frm: frm,
                                numberCards: visualizationMapper?.cards || [],
                                charts: visualizationMapper?.charts || []
                            });
                        }

                        isLoading(false, wrapper);
                    }
                } else {
                    console.log('Visualization Mapper does not exist');
                }
            }
            for (let _f of dtFields) {
                if (frm.doc.__islocal) {
                    if (!document.querySelector(`[data-fieldname="${_f.html_field}"]`)?.querySelector('#form-not-saved')) {
                        document.querySelector(`[data-fieldname="${_f.html_field}"]`).innerHTML = `<div id="form-not-saved" style="display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px; padding: 10px; border: 1px solid #525252; border-radius: 4px; margin: 10px 0;">
                            <img width='50px' src='/assets/frappe_theme/images/form-not-saved.png'/>
                            Save ${frm.doctype} to add ${_f?.connection_type == "Is Custom Design" ? _f?.template : (_f.connection_type == "Direct" ? _f.link_doctype : _f.referenced_link_doctype)} items.
                        </div>`;
                    }
                } else {
                    if (document.querySelector(`[data-fieldname="${_f.html_field}"]`)?.querySelector('#form-not-saved')) {
                        document.querySelector(`[data-fieldname="${_f.html_field}"]`)?.querySelector('#form-not-saved').remove();
                    }
                    if (_f?.connection_type == "Is Custom Design") {
                        if (_f?.template == "Gallery" && GalleryComponent) {
                            isLoading(true, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                            let gallery = new GalleryComponent(frm, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                            frm.set_df_property(_f.html_field, 'options', gallery);
                            isLoading(false, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                        }
                        if (_f?.template == "Email" && EmailComponent) {
                            isLoading(true, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                            let email = new EmailComponent(frm, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                            frm.set_df_property(_f.html_field, 'options', email);
                            isLoading(false, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                        }
                        if (_f?.template == "Tasks" && getTaskList) {
                            isLoading(true, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                            await getTaskList(frm, _f.html_field);
                            isLoading(false, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                        }
                        if (_f?.template == "Timeline" && TimelineGenerator) {
                            let timeline = new TimelineGenerator(frm, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                            frm.set_df_property(_f.html_field, 'options', timeline);
                        }
                        if (_f?.template == "Notes" && NotesManager) {
                            let notes = new NotesManager(frm, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                            frm.set_df_property(_f.html_field, 'options', notes);
                        }
                    } else {
                        let childLinks = dts.child_confs.filter(f => f.parent_doctype == _f.link_doctype)
                        isLoading(true, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                        let result = new SvaDataTable({
                            label: frm.meta?.fields?.find(f => f.fieldname == _f.html_field)?.label,
                            wrapper: document.querySelector(`[data-fieldname="${_f.html_field}"]`), // Wrapper element   // Pass your data
                            doctype: _f.connection_type == "Direct" ? _f.link_doctype : _f.referenced_link_doctype, // Doctype name
                            frm: frm,       // Pass the current form object (optional)
                            connection: _f,
                            childLinks: childLinks,
                            options: {
                                serialNumberColumn: true, // Enable serial number column (optional)
                                editable: false,      // Enable editing (optional),
                            },
                            onFieldClick: (e) => {
                                if (e && window?.onFieldClick) {
                                    let obj = {
                                        dt: e?.target?.getAttribute('data-dt'),
                                        dn: e?.target?.getAttribute('data-dn'),
                                        fieldname: e?.target?.getAttribute('data-fieldname')
                                    }
                                    window?.onFieldClick(obj);
                                }
                            },
                            onFieldValueChange: function (e, b, c, d, f) {
                                if (e && window?.onFieldValueChange) {
                                    let obj = {
                                        dt: e?.target?.getAttribute('data-dt'),
                                        dn: e?.target?.getAttribute('data-dn'),
                                        fieldtype: e?.target?.getAttribute('data-fieldtype'),
                                        fieldname: e?.target?.getAttribute('data-fieldname'),
                                        value: e?.target?.value
                                    }
                                    window?.onFieldValueChange(obj);
                                }
                            }
                        });
                        frm.set_df_property(_f.html_field, 'options', result);
                        isLoading(false, document.querySelector(`[data-fieldname="${_f.html_field}"]`));
                    }
                }
            }
        }
    }
    apply_custom_filter(field_name, filter_on, frm, filter_value) {
        frm.fields_dict[field_name].get_query = () => {
            return {
                filters: {
                    [filter_on]: filter_value || frm.doc[filter_on] || `please select ${filter_on}`,
                },
                page_length: 1000
            };
        }
    }
    getPropertySetterData = async (dt) => {
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
    goToCommentButton = (frm) => {
        frm.add_custom_button(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chat" viewBox="0 0 16 16">
                                    <path d="M2.678 11.894a1 1 0 0 1 .287.801 11 11 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8 8 0 0 0 8 14c3.996 0 7-2.807 7-6s-3.004-6-7-6-7 2.808-7 6c0 1.468.617 2.83 1.678 3.894m-.493 3.905a22 22 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a10 10 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105"/>
                                </svg>`,
            () => {
                const commentSection = document.querySelector('.comment-box');
                if (commentSection) {
                    commentSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        );
    }
}