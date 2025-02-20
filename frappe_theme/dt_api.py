import frappe

@frappe.whitelist()
def get_direct_connection_dts(dt):
    standard_dts = frappe.get_list('DocField',filters=[
        ['DocField', 'options', '=', dt],
        ['DocField', 'parenttype', '=', "DocType"]
    ],pluck='parent',ignore_permissions=True)
    custom_dts = frappe.get_list('Custom Field',filters=[
        ['Custom Field', 'options', '=', dt],
    ],pluck='dt',ignore_permissions=True)
    return standard_dts + custom_dts

@frappe.whitelist()
def get_direct_connection_fields(dt,link_dt):
    standard_dt_fields = frappe.get_list('DocField',filters=[
        ['DocField', 'options', '=', dt],
        ['DocField', 'parenttype', '=', "DocType"],
        ['DocField', 'parent', '=', link_dt]
    ],fields=['label','fieldname'],ignore_permissions=True)
    custom_dt_fields = frappe.get_list('Custom Field',filters=[
        ['Custom Field', 'options', '=', dt],
        ['Custom Field', 'dt', '=', link_dt]
    ],fields=['label','fieldname'],ignore_permissions=True)
    return standard_dt_fields + custom_dt_fields

@frappe.whitelist()
def get_workflow_with_dt(dt):
    exists = frappe.db.exists('Workflow', {'document_type': dt})
    if exists:
        frappe.set_user('Administrator')
        wf_doc = frappe.get_doc('Workflow', exists)
        frappe.set_user(frappe.session.user)
        return wf_doc.as_dict()
    else:
        frappe.throw('No workflow found for this doctype')