import frappe
def boot_theme(bootinfo):
    frappe.flags.ignore_permissions = True
    bootinfo.my_theme = frappe.get_single("My Theme")
    bootinfo.submittable_doctypes = frappe.get_all("DocType", filters={"is_submittable": 1}, pluck="name")
    workspace_confs = frappe.get_all("SVAWorkspace Configuration", pluck="name")
    sva_workspaces = {}
    if len(workspace_confs) > 0:
        for wp in workspace_confs:
            sva_workspaces[wp] = frappe.get_doc("SVAWorkspace Configuration", wp).as_dict()
    bootinfo.sva_workspaces = sva_workspaces
    metas = frappe.get_all("DocType", pluck='name', filters={'module': ['NOT IN', ['Website','Workflow','Printing','Social','Automation' ,'Integrations', 'Custom', 'Core','Email']],'issingle':0})
    filter_fields = {}
    for meta in metas:
        dtmeta = frappe.get_doc('DocType', meta)
        filter_fields[meta] = dtmeta.fields
    bootinfo.filter_fields = filter_fields