import frappe

@frappe.whitelist(allow_guest=True)
def get_my_theme():
    return frappe.get_doc("My Theme")


@frappe.whitelist(allow_guest=True)
def get_property_set(doctype):
        return frappe.db.get_list("Property Setter", fields=["*"] , filters={"doc_type": doctype,"property":"filter_by"},ignore_permissions=True)
    

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
    fields_dict = [f.as_dict() for f in meta_fields if f.fieldtype not in ['Tab Break',"HTML"]]
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

