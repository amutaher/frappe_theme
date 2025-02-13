import frappe
from frappe.model.document import Document

class VisualizationMapper(Document):
    def validate(self):
        self.validate_mapper_type()
        if self.mapper_type in ['Number Card', 'Both'] and self.cards:
            self.validate_cards()
        if self.mapper_type in ['Dashboard Chart', 'Both'] and self.charts:
            self.validate_charts()

    
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
            # seen_cards = set()
            from frappe_theme.api import get_html_fields
            html_fields = get_html_fields(self.doctype_field)
            
            for card in self.cards:
                # Validate number card uniqueness
                # if card.number_card in seen_cards:
                #     frappe.throw(f"Duplicate card {card.number_card} not allowed")
                # seen_cards.add(card.number_card)
                
                # Validate wrapper field exists and is HTML
                if not card.wrapper_field:
                    frappe.throw(f"Wrapper field is required for card {card.number_card}")
                if card.wrapper_field not in html_fields:
                    frappe.throw(f"Selected wrapper field {card.wrapper_field} must be an HTML field in {self.doctype_field}")
    
    def validate_charts(self):
        if self.charts:
            # seen_charts = set()
            from frappe_theme.api import get_html_fields
            html_fields = get_html_fields(self.doctype_field)
            
            for chart in self.charts:
                # Validate chart uniqueness
                # if chart.dashboard_chart in seen_charts:
                #     frappe.throw(f"Duplicate chart {chart.dashboard_chart} not allowed")
                # seen_charts.add(chart.dashboard_chart)
                
                # Validate wrapper field exists and is HTML
                if not chart.wrapper_field:
                    frappe.throw(f"Wrapper field is required for chart {chart.dashboard_chart}")
                if chart.wrapper_field not in html_fields:
                    frappe.throw(f"Selected wrapper field {chart.wrapper_field} must be an HTML field in {self.doctype_field}")