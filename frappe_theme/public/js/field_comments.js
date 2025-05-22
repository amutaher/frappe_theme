// Add comment icons to all form fields
frappe.ui.form.on('*', {
    refresh: function (frm) {
        if (!frm.is_new()) {
            if (!frm.doc || !frm.doc.doctype) return;

            // Add comment icons to each field
            Object.keys(frm.fields_dict).forEach(fieldname => {
                const field = frm.fields_dict[fieldname];
                if (!field || !field.df) return;
                if (['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Button'].includes(field.df.fieldtype)) {
                    return;
                }

                // Create comment icon if not exists
                if (field.label_area && !$(field.label_area).find('.field-comment-icon').length) {
                    const comment_icon = $(`
                    <div class="field-comment-icon" style="display: none; position: absolute; right: -30px; top: -2px; z-index: 1;">
                        <button class="btn btn-default ellipsis" style="padding: 2px 8px;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-chat" viewBox="0 0 16 16">
                                <path d="M2.678 11.894a1 1 0 0 1 .287.801 11 11 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8 8 0 0 0 8 14c3.996 0 7-2.807 7-6s-3.004-6-7-6-7 2.808-7 6c0 1.468.617 2.83 1.678 3.894m-.493 3.905a22 22 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a10 10 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105"></path>
                            </svg>
                        </button>
                    </div>
                `);

                    // Add icon to the field wrapper
                    $(field.label_area).css('position', 'relative');
                    $(field.label_area).append(comment_icon);

                    // Show/hide icon on hover
                    $(field.$wrapper).hover(
                        function () { comment_icon.show(); },
                        function () { comment_icon.hide(); }
                    );

                    // Handle click
                    comment_icon.click(() => {
                        const d = new frappe.ui.Dialog({
                            title: __('Field: {0}', [field.df.label || fieldname]),
                            size: 'large',
                            fields: [
                                {
                                    fieldname: 'new_comment',
                                    fieldtype: 'Text Editor',
                                    label: '',
                                    options: {
                                        mention: {
                                            users: true,
                                            roles: true
                                        }
                                    }
                                },
                                {
                                    fieldname: 'comments_html',
                                    fieldtype: 'HTML',
                                    options: '<div class="text-muted">No comments yet</div>'
                                }
                            ],
                            primary_action_label: __('Add Comment'),
                            primary_action: function () {
                                const comment = d.get_value('new_comment');
                                if (!comment) return;

                                frappe.db.insert({
                                    doctype: 'DocType Field Comment',
                                    doctype_name: frm.doctype,
                                    docname: frm.docname,
                                    field_name: fieldname,
                                    field_label: field.df.label || fieldname,
                                    comment: comment
                                }).then(() => {
                                    d.hide();
                                    frappe.show_alert({
                                        message: __('Comment added successfully'),
                                        indicator: 'green'
                                    });
                                    // Reload comments
                                    load_comments();
                                });
                            }
                        });

                        function load_comments() {
                            frappe.db.get_list('DocType Field Comment', {
                                filters: {
                                    doctype_name: frm.doctype,
                                    docname: frm.docname,
                                    field_name: fieldname
                                },
                                fields: ['comment', 'user', 'creation'],
                                order_by: 'creation desc'
                            }).then(comments => {
                                if (!comments || comments.length === 0) {
                                    d.fields_dict.comments_html.$wrapper.html('<div class="text-muted" style="padding: 15px;">No comments yet</div>');
                                    return;
                                }

                                const comments_html = comments.map(c => `
                                <div class="comment-item" style="margin-bottom: 15px;">
                                    <div class="comment-header" style="margin-bottom: 5px;">
                                        <span class="text-muted">${frappe.user.full_name(c.user)}</span>
                                        <span class="text-muted"> • </span>
                                        <span class="text-muted">${frappe.datetime.prettyDate(c.creation)}</span>
                                    </div>
                                    <div class="comment-content" style="background: var(--fg-color); padding: 10px; border-radius: 4px;">
                                        ${frappe.format(c.comment, 'Markdown')}
                                    </div>
                                </div>
                            `).join('');

                                d.fields_dict.comments_html.$wrapper.html(`
                                <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
                                    ${comments_html}
                                </div>
                            `);
                            });
                        }

                        // Set initial height for comment box
                        d.fields_dict.new_comment.$wrapper.find('.ql-editor').css('min-height', '100px');
                        d.fields_dict.new_comment.$wrapper.find('.ql-editor').css('max-height', '150px');

                        load_comments();
                        d.show();

                        // Initialize mention feature after dialog is shown
                        d.fields_dict.new_comment.$wrapper.on('focus', function () {
                            const input = d.fields_dict.new_comment.$input;
                            if (input && !input.mention) {
                                input.mention = new frappe.ui.Mention({
                                    input: input,
                                    users: true,
                                    roles: true
                                });
                            }
                        });
                    });
                }
            });
        } else {
            Object.keys(frm.fields_dict).forEach(fieldname => {
                const field = frm.fields_dict[fieldname];
                if (field && field.label_area) {
                    $(field.label_area).find('.field-comment-icon').remove();
                }
            });
        }
    }
});