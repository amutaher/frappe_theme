import frappe
from frappe.model.document import Document

class NumberCardMapper(Document):
    def validate(self):
        self.validate_wrapper_field()
    
    def validate_wrapper_field(self):
        doctype_meta = frappe.get_meta(self.doctype_field)
        html_fields = [field.fieldname for field in doctype_meta.fields if field.fieldtype == "HTML"]
        
        if self.wrapper_field not in html_fields:
            frappe.throw(f"Selected wrapper field must be an HTML field in {self.doctype_field}")
