# Copyright (c) 2025, Suvaidyam and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from hashlib import md5

class SVADTUserListviewSettings(Document):
	def on_update(self):
		setting_id = md5(f"{self.parent_id}-{self.child_dt}-{self.user}".encode('utf-8')).hexdigest()
		frappe.cache.set_value(setting_id,self.listview_settings)
