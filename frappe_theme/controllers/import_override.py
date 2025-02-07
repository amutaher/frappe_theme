from frappe.core.doctype.data_import.data_import import DataImport
from frappe_theme.controllers.custom_importer import CustomImporter
import frappe
from frappe import _
class CustomDataImport(DataImport):
    def get_importer(self):
       return CustomImporter(self.reference_doctype, data_import=self, use_sniffer=self.use_csv_sniffer)
    def start_import(self):
        data_import = frappe.get_doc("Data Import", self.name)
        i = CustomImporter(data_import.reference_doctype, data_import=data_import)
        i.import_data()
      
        