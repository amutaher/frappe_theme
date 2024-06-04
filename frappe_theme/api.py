import frappe

@frappe.whitelist(allow_guest=True)
def get_my_theme():
    return frappe.get_doc("My Theme")


@frappe.whitelist(allow_guest=True)
def get_property_set():
        return frappe.db.get_list("Property Setter", fields=["*"])
    
        
       