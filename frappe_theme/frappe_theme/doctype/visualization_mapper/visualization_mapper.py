import frappe
from frappe.model.document import Document

class VisualizationMapper(Document):
    def validate(self):
        self.validate_wrapper_field()
        self.validate_mapper_type()
        
    def validate_wrapper_field(self):
        doctype_meta = frappe.get_meta(self.doctype_field)
        html_fields = [field.fieldname for field in doctype_meta.fields 
                      if field.fieldtype == "HTML"]
        
        if self.wrapper_field and self.wrapper_field not in html_fields:
            frappe.throw(f"Selected wrapper field must be an HTML field in {self.doctype_field}")
    
    def validate_mapper_type(self):
        if self.mapper_type == "Number Card":
            if not self.cards:
                frappe.throw("Number Cards are required for Number Card mapper type")
            self.validate_cards()
            # Clear charts if type is Number Card
            self.charts = []
            
        elif self.mapper_type == "Dashboard Chart":
            if not self.charts:
                frappe.throw("Dashboard Charts are required for Dashboard Chart mapper type")
            self.validate_charts()
            # Clear cards if type is Dashboard Chart
            self.cards = []
            
        elif self.mapper_type == "Both":
            if not self.cards and not self.charts:
                frappe.throw("At least one Number Card or Dashboard Chart is required")
            self.validate_cards()
            self.validate_charts()
    
    def validate_cards(self):
        if self.cards:
            seen_cards = set()
            for card in self.cards:
                if card.number_card in seen_cards:
                    frappe.throw(f"Duplicate card {card.number_card} not allowed")
                seen_cards.add(card.number_card)
    
    def validate_charts(self):
        if self.charts:
            seen_charts = set()
            for chart in self.charts:
                if chart.dashboard_chart in seen_charts:
                    frappe.throw(f"Duplicate chart {chart.dashboard_chart} not allowed")
                seen_charts.add(chart.dashboard_chart)

    @frappe.whitelist()
    def get_html_fields(self):
        """Get HTML fields for the selected DocType"""
        if not self.doctype_field:
            return []
            
        doctype_meta = frappe.get_meta(self.doctype_field)
        return [
            field.fieldname 
            for field in doctype_meta.fields 
            if field.fieldtype == "HTML"
        ]