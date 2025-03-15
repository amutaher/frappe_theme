import frappe
def boot_theme(bootinfo):
    bootinfo.my_theme = frappe.get_single("My Theme")
    bootinfo.submittable_doctypes = frappe.get_all("DocType", filters={"is_submittable": 1}, pluck="name")
    # metas = frappe.get_all("DocType", pluck='name', filters={'module': ['NOT IN', ['Website','Workflow','Printing','Social','Automation' ,'Integrations', 'Custom', 'Core','Email']],'issingle':0})
    # filter_fields = {}
    # for meta in metas:
    #     dtmeta = frappe.get_doc('DocType', meta)
    #     filter_fields[meta] = dtmeta.fields
    # bootinfo.filter_fields = filter_fields