import frappe
import json
class NumberCard():
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

    def get_number_card_count(type, details,report=None, doctype=None, docname=None):
        details = json.loads(details)
        report = json.loads(report)

        if type == 'Report':
            return NumberCard.card_type_report(details,report, doctype, docname)
        elif type == 'Document Type':
            return NumberCard.card_type_docype(details, doctype, docname)
    
    
    def card_type_report(details,report=None, doctype=None, docname=None):
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
            
    def card_type_docype(details,doctype=None, docname=None):
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
        