import frappe

def validate(doc, method):
    pass
    # props = frappe.get_all("Property Setter", filters={"doc_type": doc.doctype, "property": "wf_state_field"})
    # if len(props):
    #     for prop in props:
    #         if not doc.get(prop.field_name, None):
    #             frappe.throw('On Hold Process')

