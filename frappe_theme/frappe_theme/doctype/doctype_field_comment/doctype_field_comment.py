import frappe
from frappe.model.document import Document

class DocTypeFieldComment(Document):
    def before_save(self):
        if not self.user:
            self.user = frappe.session.user
        if not self.creation_date:
            self.creation_date = frappe.utils.now()
