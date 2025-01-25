import frappe

@frappe.whitelist(allow_guest=True)
def get_my_theme():
    return frappe.get_doc("My Theme")


@frappe.whitelist(allow_guest=True)
def get_property_set(doctype):
        return frappe.db.get_list("Property Setter", fields=["*"] , filters={"doc_type": doctype,"property":"filter_by"},ignore_permissions=True)
    

@frappe.whitelist()
def get_doctype_fields(doctype):
    custom_fields = frappe.get_all("Custom Field", filters={"dt": doctype}, fields=["*"],ignore_permissions=True)
    dt = frappe.get_doc("DocType", doctype,ignore_permissions=True)
    if len(custom_fields) > 0:
        dt.fields.extend(custom_fields)
    return dt

@frappe.whitelist()
def get_my_list_settings(doctype):
	try:
		return frappe.get_cached_doc("List View Settings", doctype,ignore_permissions=True)
	except frappe.DoesNotExistError:
		frappe.clear_messages()

@frappe.whitelist()
def get_meta_fields(doctype):
    meta_fields = frappe.get_meta(doctype).fields
    property_setters = frappe.get_all('Property Setter', 
                                      filters={'doc_type': doctype}, 
                                      fields=['field_name', 'property', 'value'],ignore_permissions=True)
    # Convert meta_fields into mutable dictionaries if necessary
    fields_dict = [f.as_dict() for f in meta_fields if f.fieldtype not in ['Tab Break',"HTML"]]
    # Apply property setter values to the meta fields
    for field in fields_dict:
        for ps in property_setters:
            if field.get('fieldname') == ps.field_name:
                # Dynamically set the field property
                field[ps.property] = ps.value
    
    return fields_dict

@frappe.whitelist()
def get_permissions(doctype):
    permissions = []
    if frappe.has_permission(doctype,'read'):
        permissions.append('read')
    if frappe.has_permission(doctype,'write'):
        permissions.append('write')
    if frappe.has_permission(doctype,'create'):
        permissions.append('create')
    if frappe.has_permission(doctype,'delete'):
        permissions.append('delete')
    if frappe.has_permission(doctype,'submit'):
        permissions.append('submit')
    if frappe.has_permission(doctype,'cancel'):
        permissions.append('cancel')
    return permissions

@frappe.whitelist() 
def get_meta(doctype):
    frappe.flags.ignore_permissions = True
    return frappe.get_meta(doctype).as_dict()


@frappe.whitelist()
def get_cards_preview(mapper_name):
    """Get HTML preview of cards"""
    try:
        mapper = frappe.get_doc("Number Card Mapper", mapper_name)
        html = "<div class='card-preview-container d-flex flex-wrap'>"
        
        for card in mapper.cards:
            if not card.is_visible:
                continue
                
            try:
                card_doc = frappe.get_doc("Number Card", card.number_card)
                card_html = card_doc.get_card_html() if hasattr(card_doc, 'get_card_html') else get_default_card_html(card_doc)
                
                html += f"""
                    <div class='card-preview-item m-2' data-name='{card.number_card}'>
                        <div class='card-label h6 text-center'>{card.card_label or card_doc.label}</div>
                        {card_html}
                    </div>
                """
            except Exception as e:
                frappe.log_error(f"Error rendering card {card.number_card}: {str(e)}")
                html += f"""
                    <div class='card-preview-item m-2 text-danger' data-name='{card.number_card}'>
                        Error loading card: {card.number_card}
                    </div>
                """
                
        html += "</div>"
        return html
    except Exception as e:
        frappe.log_error(f"Error in get_cards_preview: {str(e)}")
        return f"<div class='text-danger'>Error loading preview: {str(e)}</div>"

def get_default_card_html(card_doc):
    """Fallback card HTML if get_card_html is not available"""
    return f"""
        <div class='number-card-widget'>
            <div class='card-body'>
                <h6 class='text-muted'>{card_doc.label}</h6>
                <h3 class='number-card-value'>Loading...</h3>
            </div>
        </div>
    """

@frappe.whitelist()
def get_html_fields(doctype):
    """Get HTML fields from doctype"""
    meta = frappe.get_meta(doctype)
    return [{"fieldname": field.fieldname, "label": field.label} 
            for field in meta.fields if field.fieldtype == "HTML"]