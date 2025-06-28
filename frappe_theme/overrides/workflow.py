from frappe.model.workflow import apply_workflow as original_apply_workflow
from frappe.utils import getdate
import frappe

@frappe.whitelist()
def custom_apply_workflow(doc, action):
    doc = frappe.parse_json(doc)
    # Get relevant workflow-related fields from Property Setter
    props = frappe.get_all(
        "Property Setter",
        fields=["field_name"],
        filters={
            "doc_type": doc.doctype,
            "property": "wf_state_field",
            "value": action
        },
        ignore_permissions=True
    )

    wf_dialog_fields = doc.get('wf_dialog_fields') or {}

    required_fields = [prop["field_name"] for prop in props]

    # Check if all required fields have values
    if not all(wf_dialog_fields.get(f) for f in required_fields):
        return
        # frappe.throw("Required workflow data is missing or incomplete.")

    # Load the actual doc and update fields
    data_doc = frappe.get_doc(doc.doctype, doc.name)
    meta = frappe.get_meta(doc.doctype)
    updated = False

    for fieldname, value in wf_dialog_fields.items():
        if value is None:
            continue

        field = meta.get_field(fieldname)
        if not field:
            continue  # Skip unknown/invalid fields

        # Type-specific conversion
        if field.fieldtype == "Date":
            value = getdate(value)
        elif field.fieldtype == "Check":
            value = 1 if str(value) in ("1", "true", "True") else 0
        elif field.fieldtype in ("Int", "Float"):
            try:
                value = float(value) if field.fieldtype == "Float" else int(value)
            except ValueError:
                frappe.throw(f"Invalid value for field {fieldname}")

        data_doc.set(fieldname, value)
        updated = True

    if updated:
        data_doc.save()

    # Call original workflow function
    return original_apply_workflow(frappe.as_json(doc), action)
