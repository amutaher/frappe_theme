import frappe

@frappe.whitelist(allow_guest=True)
def get_my_theme():
    return frappe.get_doc("My Theme")


@frappe.whitelist(allow_guest=True)
def get_property_set(doctype):
        return frappe.db.get_list("Property Setter", fields=["*"] , filters={"doc_type": doctype,"property":"filter_by"})
    

@frappe.whitelist()
def get_doctype_fields(doctype):
    return frappe.get_doc("DocType", doctype,ignore_permissions=True)

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
    fields_dict = [f.as_dict() for f in meta_fields if f.fieldtype not in ['Section Break','Table','Tab Break']]
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