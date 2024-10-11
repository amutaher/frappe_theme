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
	return frappe.get_meta(doctype).fields
