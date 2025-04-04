// Copyright (c) 2025, Suvaidyam and contributors
// For license information, please see license.txt

frappe.ui.form.on("Copy Role Perms", {
    refresh(frm) {
        frm.add_custom_button(__('Copy'), function () {
            // Button click handler will be added here
            frappe.call({
                method: "frappe_theme.api.copy_role_perms",
                args: {
                    doc: frm.doc,
                },
            });
        });
    },
});
