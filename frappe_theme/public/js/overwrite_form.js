frappe.ui.form.Form = class CustomForm extends frappe.ui.form.Form {
    async refresh(docname) {
        await super.refresh(docname);
        // console.log(this, 'super.refresh');

        if (frappe.ui.form.handlers[this.doctype]) {
            if (frappe.ui.form.handlers[this.doctype].refresh) {
                frappe.ui.form.handlers[this.doctype].refresh = [
                    ...frappe.ui.form.handlers[this.doctype]?.refresh, this.custom_refresh.bind(this)]
            } else {
                frappe.ui.form.handlers[this.doctype].refresh = [this.custom_refresh.bind(this)]
            }
            if (frappe.ui.form.handlers[this.doctype].on_tab_change) {
                frappe.ui.form.handlers[this.doctype].on_tab_change = [
                    ...frappe.ui.form.handlers[this.doctype].on_tab_change,
                    this._activeTab.bind(this)
                ]
            } else {
                frappe.ui.form.handlers[this.doctype].on_tab_change = [this._activeTab.bind(this)]
            }
        } else {
            frappe.ui.form.handlers[this.doctype] = {
                refresh: [this.custom_refresh.bind(this)],
                on_tab_change: [this._activeTab.bind(this)]
            }
        }


    }
    async _activeTab(frm) {
        let tab_field = frm.get_active_tab()?.df?.fieldname;
        await this.tabContent(frm, tab_field);
    }
    async custom_refresh(frm) {
        let me = this;
        me.goToCommentButton(frm);
        let tab_field = frm.get_active_tab()?.df?.fieldname;
        me.tabContent(frm, tab_field)
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
    getDataElement = (fieldname) => {
        return new Promise((resolve, reject) => {
            let wrapper = document.querySelector(`[data-fieldname="${fieldname}"]`);
            if (!wrapper) {
                let maxTime = 5000; // 5 seconds
                let intervalTime = 500; // 1 second
                let interval = setInterval(() => {
                    wrapper = document.querySelector(`[data-fieldname="${fieldname}"]`);
                    if (wrapper) {
                        clearInterval(interval);
                        resolve(wrapper);
                    } else if (maxTime <= 0) {
                        resolve(null)
                    }
                    maxTime -= intervalTime;
                }, intervalTime);
            } else {
                resolve(wrapper)
            }
        });
    }
    renderCustomComponent = async (frm, fieldname, template) => {
        let el = document.createElement('div');
        frm.set_df_property(fieldname, 'options', el);
        let id=`custom-component-${fieldname}`

        let loader = new Loader(el, id);
        loader.show();

        switch (template) {
            case "Gallery":
                new GalleryComponent(frm, el);
                break;
            case "Email":
                new EmailComponent(frm, el);
                break;
            case "Tasks":
                new mGrantTask(frm,el);
                break;
            case "Timeline":
                new TimelineGenerator(frm, el);
                break;
            case "Notes":
                new NotesManager(frm, el);
                break;
            case "Linked Users":
                new LinkedUser(frm, el);
                break;
            default:
                break;
        }
        loader.hide();
    }
    tabContent = async (frm, tab_field) => {
        if (await frappe.db.exists('SVADatatable Configuration', frm.doc.doctype)) {
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

            let dts = await frappe.db.get_doc('SVADatatable Configuration', frm.doc.doctype);
            let dtFields = dts.child_doctypes?.filter(f => tab_fields.includes(f.html_field))
            // number_cards, charts
            let vm_fields = [
                ...dts?.number_cards?.filter(f => tab_fields.includes(f.html_field)).map(f=>f.html_field),
                ...dts?.charts?.filter(f => tab_fields.includes(f.html_field)).map(f=>f.html_field)
            ]
            let vm_all_fields = [
                ...dts?.number_cards?.map(f=>f.html_field),
                ...dts?.charts?.map(f=>f.html_field)
            ]

            let relevant_html_fields = [...dtFields.map(f=>f.html_field), ...vm_fields]

            let other_mapped_fields = [
                ...dts.child_doctypes?.filter(f =>!relevant_html_fields.includes(f.html_field)).map(f=>f.html_field),
                ...vm_all_fields.filter(f =>!vm_fields.includes(f))
            ]
            for(let field of other_mapped_fields){
                frm.set_df_property(field, 'options', '');
            }
            for(let card  of dts?.number_cards){
                const wrapper = document.createElement('div');
                wrapper.id = `${card.html_field}-wrapper`;
                frm.set_df_property(card.html_field, 'options', wrapper);
                // Initialize SVADashboardManager and store reference
                wrapper._dashboard = new SVADashboardManager({
                    wrapper: wrapper,
                    frm: frm,
                    numberCards: [card],
                    charts: []
                });
            }

            for(let chart  of dts?.charts){
                const wrapper = document.createElement('div');
                wrapper.id = `${chart.html_field}-wrapper`;
                frm.set_df_property(chart.html_field, 'options', wrapper);
                // Initialize SVADashboardManager and store reference
                wrapper._dashboard = new SVADashboardManager({
                    wrapper: wrapper,
                    frm: frm,
                    numberCards: [],
                    charts: [chart]
                });
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
                        this.renderCustomComponent(frm, _f.html_field, _f.template)
                    } else {
                        let childLinks = dts.child_confs.filter(f => f.parent_doctype == _f.link_doctype)
                        let wrapper = document.createElement('div');
                        wrapper.id = `sva-datatable-wrapper-${_f.html_field}`;
                        frm.set_df_property(_f.html_field, 'options', wrapper);
                        let result = new SvaDataTable({
                            label: frm.meta?.fields?.find(f => f.fieldname == _f.html_field)?.label,
                            wrapper: wrapper, // Wrapper element   // Pass your data
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
                            onFieldValueChange: function (e) {
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