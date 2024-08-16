
const makeListResponsive = async (theme) => {
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    if (mediaQuery.matches && theme.disable_card_view_on_mobile_view === 0) {
        frappe.views.ListView = class ListView extends frappe.views.ListView {
            constructor(opts) {
                super(opts);
                this.dynamic_field_map = {}; // Initialize dynamic field map

            }

            get_fields_for_doctype(doctype) {
                if (!this.dynamic_field_map[doctype]) {
                    const doctype_meta = frappe.get_meta(doctype);
                    this.dynamic_field_map[doctype] = doctype_meta.fields
                        .filter(field => field.in_list_view)
                        .map(field => ({
                            label: field.label,
                            fieldname: field.fieldname,
                            fieldtype: field.fieldtype
                        }));
                }
                return this.dynamic_field_map[doctype];
            }

            get_dynamic_fields(doc) {
                const fields = this.get_fields_for_doctype(this.doctype) || [];
                const field_html = fields.map(field => {
                    const value = field.fieldtype === "Link" ?
                        doc[Object.entries(doc).find(([key]) => key.startsWith(`${field.fieldname}_`))?.[0] || field.fieldname] :
                        doc[field.fieldname];
                    return `<div style="color:${theme.table_body_text_color ? theme.table_body_text_color + ' !important' : 'black'};"><strong style="color:${theme.table_head_text_color ? theme.table_head_text_color + ' !important' : 'black'} !important;">${frappe.model.unscrub(field.label)}:</strong> ${value || "----"}</div>`;
                }).join("");
                return field_html;
            }

            get_list_row_html_skeleton(left = "", right = "", details = "") {
                if (this.doctype) {
                    return `
                        <div class="list-row-container" tabindex="1" style="border: 1px solid #ddd; min-height:fit-content; border-radius: 8px; margin-bottom: 10px; padding: 10px; background-color: ${theme.table_body_background_color ? theme.table_body_background_color : 'white'};">
                            <div class="level list-row" style="align-items: center;">
                                <div class="level-left ellipsis" style="font-weight: bold;">
                                    ${left}
                                </div>
                                <div class="level-right text-muted ellipsis" style="color:${theme.table_head_text_color ? theme.table_head_text_color : 'black'};">
                                    ${right}
                                </div>
                            </div>
                            <div class=" text-truncate" style="padding-left:20px; font-size: 14px; flex-wrap: wrap;">
                                ${details}
                            </div>
                        </div>
                    `;
                }
            }

            get_list_row_html(doc) {
                return this.get_list_row_html_skeleton(
                    this.get_left_html(doc),
                    this.get_right_html(doc),
                    this.get_dynamic_fields(doc)
                );
            }
        };

        // Add custom styling to the list row container and details row
        const style = document.createElement('style');
        style.textContent = `
            @media (min-width: 768px) {
                .list-row-container .details-row {
                    display: none;
                }
            }
            .list-row-container .details-row {
                color: #555;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
            }
            .list-row-container .details-row div {
                flex: 1 1 auto;
                min-width: 150px;
                margin-bottom: 5px;
            }
            .list-row-container {
                display: flex;
                flex-direction: column;
                transition: all 0.3s ease;    
            }
            .list-row-container:hover {
                background-color: #f1f1f1;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            }
        `;
        document.head.appendChild(style);
    }
};
const hide_sidebar = async (theme) => {
    if (theme.hide_side_bar == 1) {
        frappe.router.on('change', async () => {
            let cur_router = await frappe.get_route();
            if (cur_router[0] === 'Workspaces') {
                $('.sidebar-toggle-btn').show();
                $('.layout-side-section').show();
                // $('.custom-actions').hide();
            } else {
                $('.sidebar-toggle-btn').hide();
                $('.layout-side-section').hide();
                // $('.custom-actions').hide();
            }

        });
    }
}
const makeResponsive = async () => {
    const theme = await getTheme();
    makeListResponsive(theme);
    await hide_sidebar(theme);

    let user_settings = frappe.get_user_settings('User', 'UI') || {};
    let fullwidth = user_settings.full_width || true;
    $(document.body).addClass('full-width', fullwidth);

    
};

makeResponsive();
