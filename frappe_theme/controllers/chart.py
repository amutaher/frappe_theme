import frappe
import json
from frappe import _

class Chart():
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

    def get_chart_data(type, details,report=None, doctype=None, docname=None):
        details = json.loads(details)
        report = json.loads(report)

        if type == 'Report':
            return Chart.chart_report(details,report, doctype, docname)
        elif type == 'Document Type':
            return Chart.chart_doc_type(details,doctype, docname)
            
    def chart_doc_type(details,doctype=None, docname=None):
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
        colors = []
        if details.get('custom_options'):
            custom_options = json.loads(details.get('custom_options'))
            colors = [x for x in custom_options]
        else:
            colors = [x.get('color') for x in details.get('y_axis')]
        return {
            'data': {
                'labels': [x.get('label') for x in data],
                'datasets': [{'data': [x.get('count') for x in data],
                'backgroundColor':colors}]
            },
            'message': 'Document Type',
        }
    
    def chart_report(details,report=None,doctype=None, docname=None):
        if report.get('query'):
            query = ""
            conditions = "WHERE 1=1"
            for f in report.get('columns'):
                if f.get('fieldtype') == 'Link' and f.get('options') == doctype:
                    conditions += f" AND t.{f.get('fieldname')} = '{docname}'"
            field_name = details.get('x_field')
            y_axis = details.get('y_axis', [])
            y_field = y_axis[0].get('y_field') if y_axis else None
            if not y_field:
                return {
                    'data': {
                        'labels': [],
                        'datasets': [{'data': []}]
                    },
                    'message': 'Invalid chart configuration'
                }
            query = f"SELECT t.{y_field} AS count, t.{field_name} AS label FROM ({report.get('query')}) AS t {conditions}"
            data = frappe.db.sql(query, as_dict=True)
            colors = []
            if details.get('custom_options'):
                custom_options = json.loads(details.get('custom_options'))
                colors = [x for x in custom_options]
            else:
                colors = [x.get('color') for x in details.get('y_axis')]
            
            return {
                'data': {
                    'labels': [x.get('label') for x in data],
                    'datasets': [{'data': [x.get('count') for x in data],#0,4,2,3,1,5,4,3
                    'backgroundColor':colors}]
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
