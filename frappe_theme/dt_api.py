import frappe
import json
from hashlib import md5

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
            continue
            # child_meta = frappe.get_meta(field_dict.get('options'))
            # if len(child_meta.fields) > 0:
            #     field_dicts[field_dict.get('options')] = []
            #     for child_field in child_meta.fields:
            #         child_field_dict = process_field(child_field)
            #         field_dicts[field_dict.get('options')].append(child_field_dict)
            # continue
        field_dicts[doctype].append(field_dict)
    return field_dicts

@frappe.whitelist()
def setup_user_list_settings(parent_id,child_dt,listview_settings):
    user = frappe.session.user
    if user == "Administrator":
        return
    exists = frappe.db.exists("SVADT User Listview Settings",{"parent_id":parent_id,"child_dt":child_dt,"user":user})
    if exists:
        doc = frappe.get_doc("SVADT User Listview Settings",exists)
        doc.listview_settings = listview_settings
        doc.save(ignore_permissions=True)
    else:
        frappe.get_doc({"doctype":"SVADT User Listview Settings","parent_id":parent_id,"child_dt":child_dt,"user":user,"listview_settings":listview_settings}).insert(ignore_permissions=True)
        
@frappe.whitelist()
def delete_user_list_settings(parent_id,child_dt):
    user = frappe.session.user
    if user == "Administrator":
        return None
    exists = frappe.db.exists("SVADT User Listview Settings",{"parent_id":parent_id,"child_dt":child_dt,"user":user})
    if exists:
        frappe.delete_doc("SVADT User Listview Settings",exists)
    return True

@frappe.whitelist()
def get_user_list_settings(parent_id,child_dt):
    user = frappe.session.user
    if user == "Administrator":
        return None
    setting_id = md5(f"{parent_id}-{child_dt}-{user}".encode('utf-8')).hexdigest()
    listview_settings = None
    if frappe.cache.exists(setting_id):
        listview_settings = frappe.cache.get_value(setting_id)
    elif frappe.db.exists("SVADT User Listview Settings",{"parent_id":parent_id,"child_dt":child_dt,"user":user}):
        listview_settings = frappe.get_doc("SVADT User Listview Settings",frappe.db.exists("SVADT User Listview Settings",{"parent_id":parent_id,"child_dt":child_dt,"user":user})).listview_settings
    return listview_settings