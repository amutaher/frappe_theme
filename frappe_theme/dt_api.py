import frappe
import json

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

@frappe.whitelist()
def doc_filters(doctype, filters=None):
    dtmeta = frappe.get_meta(doctype)
    field_dicts = {}
    field_dicts[doctype] = []
    
    def process_field(field):
        field_dict = {}
        for key, value in field.__dict__.items():
            if key == 'link_filters' and isinstance(value, list):
                field_dict[key] = json.dumps(value)
            else:
                field_dict[key] = value
        return field_dict
    
    for field in dtmeta.fields:
        field_dict = process_field(field)
        if field_dict.get('fieldtype') in ["Table", "Table MultiSelect"]:
            child_meta = frappe.get_meta(field_dict.get('options'))
            if len(child_meta.fields) > 0:
                field_dicts[field_dict.get('options')] = []
                for child_field in child_meta.fields:
                    child_field_dict = process_field(child_field)
                    field_dicts[field_dict.get('options')].append(child_field_dict)
            continue
        field_dicts[doctype].append(field_dict)
    return field_dicts