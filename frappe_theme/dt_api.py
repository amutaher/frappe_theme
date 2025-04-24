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
def get_indirect_connection_local_fields(dt):
    fields = frappe.get_meta(dt).fields
    valid_fields = [{'value':field.fieldname,'label':field.label,'options':field.options} for field in fields if field.fieldtype in ["Link"] and field.options not in ["Workflow State",dt]]
    return valid_fields

@frappe.whitelist()
def get_indirect_connection_foreign_fields(dt,local_field_option):
    fields = frappe.get_all('DocField',
        filters=[
            ['DocField', 'parent', '=', dt],
            ['DocField', 'options', '=', local_field_option],
            ['DocField', 'parenttype', '=', "DocType"]
        ],
        fields=['label','fieldname as value'])
    return fields

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

@frappe.whitelist()
def get_sva_dt_settings(doctype):
    if not frappe.db.exists("SVADatatable Configuration", doctype):
        return None

    settings = frappe.get_doc("SVADatatable Configuration", doctype)
    settings = settings.as_dict()
    # number cards
    updated_cards = number_card_settings(settings)
    settings['number_cards'] = updated_cards

    # charts
    updated_charts = chart_settings(settings)
    settings['charts'] = updated_charts
    return settings

def number_card_settings(settings):
    # Filter only visible number cards
    visible_cards = [card for card in settings.number_cards if card.is_visible]
    updated_cards = []

    for card in visible_cards:
        if frappe.db.exists('Number Card', card.number_card):
            card_details = frappe.get_doc('Number Card', card.number_card)
            card['details'] = card_details

            if card_details.type == 'Report' and card_details.report_name:
                if frappe.db.exists('Report', card_details.report_name):
                    report_doc = frappe.get_doc('Report', card_details.report_name)
                    card['report'] = report_doc
            elif card_details.type == 'Document Type':
                card['report'] = None

        updated_cards.append(card)

    # Update the settings with the updated cards
    return updated_cards

def chart_settings(settings):

    visible_charts = [chart for chart in settings.charts if chart.is_visible]
    updated_charts = []
    for chart in visible_charts:
        if frappe.db.exists('Dashboard Chart', chart.chart_label):
            chart_details = frappe.get_doc('Dashboard Chart', chart.chart_label)
            chart['details'] = chart_details
            updated_charts.append(chart)
        if chart.details.chart_type == 'Report':
            if frappe.db.exists('Report', chart.details.report_name):
                report_doc = frappe.get_doc('Report', chart.details.report_name)
                chart['report'] = report_doc
            else:
                chart['report'] = None
    return updated_charts

@frappe.whitelist()
def get_number_card_count(type, details,report=None, doctype=None, docname=None):
    details = json.loads(details)
    report = json.loads(report)

    if type == 'Report':
        if report.get('query'):
            query = ""
            conditions = "WHERE 1=1"
            field_type = None
            for f in report.get('columns'):
                if f.get('fieldtype') == 'Link' and f.get('options') == doctype:
                    conditions += f" AND t.{f.get('fieldname')} = '{docname}'"
            field_name = details.get('report_field')
            field_type = f.get('fieldtype')
            if details.get('report_function')=='Sum':
                query = f"SELECT SUM(t.{field_name}) AS count FROM ({report.get('query')}) AS t {conditions}"
            elif details.get('report_function')=='Average':
                query = f"SELECT AVG(t.{field_name}) AS count FROM ({report.get('query')}) AS t {conditions}"
            elif details.get('report_function')=='Minimum':
                query = f"SELECT MIN(t.{field_name}) AS count FROM ({report.get('query')}) AS t {conditions}"
            elif details.get('report_function')=='Maximum':
                query = f"SELECT MAX(t.{field_name}) AS count FROM ({report.get('query')}) AS t {conditions}"
            
            count = frappe.db.sql(query, as_dict=True)
            return {
                'count': count[0].get('count'),
                'message': 'Report',
                'field_type': field_type
            }
        else:
            return {
                'count': 0,
                'message': 'Report',
                'field_type': None,
            }
    elif type == 'Document Type':
        filters = json.loads(details.get('filters_json'))
        # Clean up filters by removing null and false values
        for i, filter_condition in enumerate(filters):
            if isinstance(filter_condition[3], list):
                filter_condition[3] = [x for x in filter_condition[3] if x is not None]
                if not filter_condition[3]:  # If array becomes empty after removing null
                    filters.pop(i)  # Remove the entire filter condition
            # Remove false from the end of filter conditions
            if len(filter_condition) > 4 and filter_condition[4] is False:
                filter_condition.pop(4)
        if doctype and docname:
            meta = frappe.get_meta(details.get('document_type'))
            if meta.fields:
                direct_link_field = next((x for x in meta.fields if x.fieldtype == 'Link' and x.options == doctype and x.fieldname not in ['amended_form']), None)
                if direct_link_field:
                    filters.append([details.get('document_type'),direct_link_field.get('fieldname'), '=', docname])
                
                reference_dt_field = next((x for x in meta.fields if x.fieldtype == 'Link' and x.options == 'DocType'), None)
                if reference_dt_field:
                    reference_dn_field = next((x for x in meta.fields if x.fieldtype == 'Dynamic Link' and x.options == reference_dt_field.get('fieldname')), None)
                    if reference_dn_field:
                        filters.append([details.get('document_type'),reference_dt_field.get('fieldname'), '=', doctype])
                        filters.append([details.get('document_type'),reference_dn_field.get('fieldname'), '=', docname])
        if details.get('function') == 'Count':
            count = frappe.db.count(details.get('document_type'), filters=filters)
        elif details.get('function') == 'Sum':
            count = frappe.db.get_value(details.get('document_type'), filters, f"SUM({details.get('aggregate_function_based_on')})")
        elif details.get('function') == 'Average':
            count = frappe.db.get_value(details.get('document_type'), filters, f"AVG({details.get('aggregate_function_based_on')})")
        elif details.get('function') == 'Minimum':
            count = frappe.db.get_value(details.get('document_type'), filters, f"MIN({details.get('aggregate_function_based_on')})")
        elif details.get('function') == 'Maximum':
            count = frappe.db.get_value(details.get('document_type'), filters, f"MAX({details.get('aggregate_function_based_on')})")
        return {
            'count': count,
            'message': details,
            'field_type': None,
        }
@frappe.whitelist()
def get_chart_count(type, details,report=None, doctype=None, docname=None):
    details = json.loads(details)

    if type == 'Report':
        if details.get('query'):
            data = frappe.db.sql(details.get('query'), as_dict=True)
            return {
                'data': {
                    'labels': [x.get('label') for x in data],
                    'datasets': [{'data': [x.get('count') for x in data]}]
                },
                'message': details
            }
        else:
            return {
                'data': {
                    'labels': [],
                    'datasets': [{'data': []}]
                },
                'message': 'Report'
            }
    elif type == 'Document Type':
        filters = json.loads(details.get('filters_json'))
        # Clean up filters by removing null and false values
        for i, filter_condition in enumerate(filters):
            if isinstance(filter_condition[3], list):
                filter_condition[3] = [x for x in filter_condition[3] if x is not None]
                if not filter_condition[3]:  # If array becomes empty after removing null
                    filters.pop(i)  # Remove the entire filter condition
            # Remove false from the end of filter conditions
            if len(filter_condition) > 4 and filter_condition[4] is False:
                filter_condition.pop(4)
        if doctype and docname:
            meta = frappe.get_meta(details.get('document_type'))
            if meta.fields:
                direct_link_field = next((x for x in meta.fields if x.fieldtype == 'Link' and x.options == doctype and x.fieldname not in ['amended_form']), None)
                if direct_link_field:
                    filters.append([details.get('document_type'),direct_link_field.get('fieldname'), '=', docname])
                
                reference_dt_field = next((x for x in meta.fields if x.fieldtype == 'Link' and x.options == 'DocType'), None)
                if reference_dt_field:
                    reference_dn_field = next((x for x in meta.fields if x.fieldtype == 'Dynamic Link' and x.options == reference_dt_field.get('fieldname')), None)
                    if reference_dn_field:
                        filters.append([details.get('document_type'),reference_dt_field.get('fieldname'), '=', doctype])
                        filters.append([details.get('document_type'),reference_dn_field.get('fieldname'), '=', docname])
        data = frappe.db.get_list(details.get('document_type'), filters=filters)
        return {
            'data': {
                'labels': [x.get('label') for x in data],
                'datasets': [{'data': [x.get('count') for x in data]}]
            },
            'message': 'Document Type',
        }
