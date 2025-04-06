import frappe
import json
from frappe import _

@frappe.whitelist(allow_guest=True)
def get_my_theme():
    return frappe.get_doc("My Theme")


@frappe.whitelist(allow_guest=True)
def get_property_set(doctype):
        return frappe.db.get_list("Property Setter", fields=["*"] , filters={"doc_type": doctype,"property":['IN',["filter_by","link_filter"]]},ignore_permissions=True)
    

@frappe.whitelist()
def get_doctype_fields(doctype):
    custom_fields = frappe.get_all("Custom Field", filters={"dt": doctype}, fields=["*"],ignore_permissions=True)
    dt = frappe.get_doc("DocType", doctype,ignore_permissions=True)
    if len(custom_fields) > 0:
        dt.fields.extend(custom_fields)
    return dt

@frappe.whitelist()
def get_my_list_settings(doctype):
	try:
		return frappe.get_cached_doc("List View Settings", doctype,ignore_permissions=True)
	except frappe.DoesNotExistError:
		frappe.clear_messages()

@frappe.whitelist()
def get_meta_fields(doctype):
    meta_fields = frappe.get_meta(doctype).fields
    property_setters = frappe.get_all('Property Setter', 
                                      filters={'doc_type': doctype}, 
                                      fields=['field_name', 'property', 'value'],ignore_permissions=True)
    # Convert meta_fields into mutable dictionaries if necessary
    fields_dict = [f.as_dict() for f in meta_fields if f.fieldtype not in ['Tab Break']]
    # Apply property setter values to the meta fields
    for field in fields_dict:
        for ps in property_setters:
            if field.get('fieldname') == ps.field_name:
                # Dynamically set the field property
                field[ps.property] = ps.value
    
    return fields_dict

@frappe.whitelist()
def get_permissions(doctype):
    permissions = []
    if frappe.has_permission(doctype,'read'):
        permissions.append('read')
    if frappe.has_permission(doctype,'write'):
        permissions.append('write')
    if frappe.has_permission(doctype,'create'):
        permissions.append('create')
    if frappe.has_permission(doctype,'delete'):
        permissions.append('delete')
    if frappe.has_permission(doctype,'submit'):
        permissions.append('submit')
    if frappe.has_permission(doctype,'cancel'):
        permissions.append('cancel')
    return permissions

@frappe.whitelist() 
def get_meta(doctype):
    frappe.flags.ignore_permissions = True
    return frappe.get_meta(doctype).as_dict()


@frappe.whitelist()
def get_html_fields(doctype):
    try:
        doctype_meta = frappe.get_meta(doctype)
        html_fields = [field.fieldname for field in doctype_meta.fields 
                      if field.fieldtype == "HTML"]
        return html_fields
    except Exception as e:
        frappe.log_error(f"Error getting HTML fields for {doctype}: {str(e)}")
        return []

@frappe.whitelist()
def execute_number_card_query(report_name, filters=None):
    try:
        # Get the report document
        report_doc = frappe.get_doc('Report', report_name)
        if not report_doc or not report_doc.query:
            frappe.throw('Report not found or invalid')

        # Get the base query from the report
        base_query = report_doc.query
        
        # Create subquery
        query = f"SELECT * FROM ({base_query}) AS subquery"
        
        # Add WHERE clause if filters are provided
        if filters:
            # Convert string filters to dict if needed
            if isinstance(filters, str):
                filters = frappe.parse_json(filters)
                
            where_conditions = []
            for field, value in filters.items():
                # Clean the field name (remove quotes if present)
                field = field.strip('\'"')
                
                # Safely format the value based on type
                if isinstance(value, (int, float)):
                    where_conditions.append(f"{field} = {value}")
                else:
                    # Remove any existing quotes and escape single quotes in the value
                    value = str(value).strip('\'"').replace("'", "\\'") 
                    where_conditions.append(f"{field} = '{value}'")

            if where_conditions:
                query += " WHERE " + " AND ".join(where_conditions)
        
        # Execute the query
        result = frappe.db.sql(query, as_dict=True)
        
        # Get column information by creating a temporary table
        temp_table_name = f'temp_report_{frappe.generate_hash()[:10]}'
        try:
            # Create temporary table
            frappe.db.sql(f'CREATE TEMPORARY TABLE `{temp_table_name}` AS {base_query}')
            
            # Get column information
            columns = frappe.db.sql(f'DESCRIBE `{temp_table_name}`', as_dict=True)
            column_types = {col.Field: col.Type for col in columns}
            
            return {
                'result': result,
                'column_types': column_types
            }
        finally:
            # Clean up temporary table
            frappe.db.sql(f'DROP TEMPORARY TABLE IF EXISTS `{temp_table_name}`')
    except Exception as e:
        frappe.log_error(f"Error executing number card query: {str(e)}")
        return None


@frappe.whitelist()
def get_linked_doctype_fields(doc_type, frm_doctype):
    """Get linked fields between two doctypes"""
    try:
        # Get standard fields
        res = frappe.get_list('DocField', 
            filters={
                'parent': doc_type,
                'fieldtype': 'Link',
                'options': ['IN', ['DocType', frm_doctype]]
            },
            fields=['fieldname', 'options'],
            ignore_permissions=True
        )

        # Get custom fields
        cus_ref_res = frappe.get_list('Custom Field',
            filters={
                'dt': doc_type,
                'fieldtype': 'Link',
                'options': ['IN', ['DocType', frm_doctype]]
            },
            fields=['fieldname', 'options'],
            ignore_permissions=True
        )

        # Combine and filter fields
        filds = res + cus_ref_res
        filds = [f for f in filds if f.fieldname not in ["amended_from", "parent_grant"]]

        if not filds:
            return None

        field = filds[0]
        result = {'field': field}

        if field.options == 'DocType':
            # Get standard dynamic link fields
            fieldname = frappe.get_list('DocField',
                filters={
                    'parent': doc_type,
                    'fieldtype': 'Dynamic Link',
                    'options': field.fieldname
                },
                fields=['fieldname'],
                ignore_permissions=True
            )

            # Get custom dynamic link fields
            fieldname2 = frappe.get_list('Custom Field',
                filters={
                    'dt': doc_type,
                    'fieldtype': 'Dynamic Link',
                    'options': field.fieldname
                },
                fields=['fieldname'],
                ignore_permissions=True
            )

            fieldname3 = fieldname + fieldname2
            if fieldname3:
                result['final_field'] = fieldname3[0]
        return result

    except Exception as e:
        frappe.log_error(f"Error in get_linked_doctype_fields: {str(e)}")
        return None


@frappe.whitelist()
def get_versions(dt,dn,page_length,start,filters = None):
    if isinstance(filters, str):
        filters = json.loads(filters)
    
    where_clause = f"ver.ref_doctype = '{dt}' AND ver.docname = '{dn}'"
    search_param_cond = ""
    if filters and isinstance(filters, dict):
        if filters.get('doctype'):
            where_clause += f" AND (ver.custom_actual_doctype = '{filters['doctype']}' OR (COALESCE(ver.custom_actual_doctype, '') = '' AND ver.ref_doctype = '{filters['doctype']}'))"
        
        if filters.get('owner'):
            search_param_cond = f" WHERE usr.full_name LIKE '{filters['owner']}%'"
        else:
            search_param_cond = ""
    
    sql = f"""
        WITH extracted AS (
            SELECT
                ver.name AS name,
                ver.owner AS owner,
                ver.creation AS creation,
                ver.custom_actual_doctype,
                ver.custom_actual_document_name,
                ver.ref_doctype,
                ver.docname,
                jt.elem AS changed_elem,
                JSON_UNQUOTE(JSON_EXTRACT(jt.elem, '$[0]')) AS field_name,
                JSON_UNQUOTE(JSON_EXTRACT(jt.elem, '$[1]')) AS old_value,
                JSON_UNQUOTE(JSON_EXTRACT(jt.elem, '$[2]')) AS new_value
            FROM `tabVersion` AS ver,
            JSON_TABLE(JSON_EXTRACT(ver.data, '$.changed'), '$[*]'
                COLUMNS (
                    elem JSON PATH '$'
                )
            ) jt
            WHERE {where_clause}
            # WHERE ver.ref_doctype = '{dt}' AND ver.docname = '{dn}'
        )
        SELECT
            e.custom_actual_doctype,
            e.custom_actual_document_name,
            e.ref_doctype,
            usr.full_name AS owner,
            e.creation AS creation,
            e.docname,
            JSON_ARRAYAGG(
                JSON_ARRAY(
                    COALESCE(tf.label, ctf.label, e.field_name),
                    COALESCE(
                        CASE
                            WHEN e.old_value = 'null' OR e.old_value = '' THEN '(blank)'
                            ELSE e.old_value
                        END,
                        ''
                    ),
                    COALESCE(
                        CASE
                            WHEN e.new_value = 'null' OR e.new_value = '' THEN '(blank)'
                            ELSE e.new_value
                        END
                    , '')
                )
            ) AS changed
        FROM extracted e
        LEFT JOIN `tabDocField` AS tf ON (e.field_name = tf.fieldname AND tf.parent IN (e.ref_doctype, e.custom_actual_doctype))
        LEFT JOIN `tabCustom Field` AS ctf ON (e.field_name = ctf.fieldname AND ctf.dt IN (e.ref_doctype, e.custom_actual_doctype))
        LEFT JOIN `tabUser` AS usr ON e.owner = usr.name
        {search_param_cond}
        GROUP BY e.name
        ORDER BY e.creation DESC
        LIMIT {page_length}
        OFFSET {start}
    """
    return frappe.db.sql(sql,as_dict=True)


@frappe.whitelist()
def get_timeline_dt(dt, dn):
    sql = f"""
        SELECT DISTINCT ver.custom_actual_doctype AS doctype
        FROM `tabVersion` AS ver
        WHERE ver.ref_doctype = '{dt}'
        AND ver.docname = '{dn}'
        AND ver.custom_actual_doctype IS NOT NULL
    """
    
    result = frappe.db.sql(sql, as_dict=True)
    return [row["doctype"] for row in result]