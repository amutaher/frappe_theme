import frappe
def boot_session(bootinfo):
    bootinfo.my_theme = frappe.get_single("My Theme")