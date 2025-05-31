// Add comment button to form and implement threaded comments
frappe.ui.form.on('*', {
    refresh: function (frm) {
        if (!frm.is_new()) {
            if (!frm.doc || !frm.doc.doctype) return;

            // Get theme colors
            const primaryColor = frappe.boot.my_theme?.button_background_color || '#171717';
            const getLightColor = (color) => {
                // Convert hex to RGB
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                // Lighten by 40%
                return `rgb(${Math.min(255, r + 102)}, ${Math.min(255, g + 102)}, ${Math.min(255, b + 102)})`;
            };
            const getLighterColor = (color) => {
                // Convert hex to RGB
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                // Lighten by 60%
                return `rgb(${Math.min(255, r + 153)}, ${Math.min(255, g + 153)}, ${Math.min(255, b + 153)})`;
            };
            const lightPrimaryColor = getLightColor(primaryColor);
            const lighterPrimaryColor = getLighterColor(primaryColor);

            // Function to generate consistent color for a user
            const getUserColor = (username) => {
                const colors = [
                    '#4A90E2', // Light Blue
                    '#50C878', // Light Green
                    '#FFA07A', // Light Salmon
                    '#B19CD9', // Light Purple
                    '#FF6B6B', // Light Red
                    '#48D1CC', // Light Turquoise
                    '#D2B48C', // Light Brown
                    '#A9A9A9', // Light Gray
                    '#BDB76B', // Light Olive
                    '#FFB6C1'  // Light Pink
                ];
                // Generate a consistent index based on username
                const index = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
                return colors[index];
            };

            // Function to get light version of user color
            const getLightUserColor = (color) => {
                const r = parseInt(color.slice(1, 3), 16);
                const g = parseInt(color.slice(3, 5), 16);
                const b = parseInt(color.slice(5, 7), 16);
                return `rgb(${Math.min(255, r + 102)}, ${Math.min(255, g + 102)}, ${Math.min(255, b + 102)})`;
            };

            // Add comment button to form
            if (!frm.page.sidebar.find('.field-comments-btn').length) {
                // Create comment popup/sidebar
                const comment_sidebar = $(`
                    <div class="field-comments-sidebar" style="display: none; position: fixed; right: -400px; top: 0; width: 400px; height: 100vh; background: var(--fg-color); box-shadow: -2px 0 15px rgba(0,0,0,0.1); z-index: 9999; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
                        <div style="padding: 15px; border-bottom: 1px solid var(--border-color);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h5 style="margin: 0; font-size: 18px; font-weight: 600;">Field Comments</h5>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn btn-default btn-sm refresh-comments" style="padding: 4px 8px;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-arrow-clockwise" viewBox="0 0 16 16">
                                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                                            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                                        </svg>
                                    </button>
                                    <button class="btn btn-default btn-sm close-comments" style="padding: 4px 8px;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="comments-container" style="height: calc(100vh - 60px); overflow-y: auto; padding: 15px;">
                            <div class="comments-list"></div>
                        </div>
                    </div>
                `);

                $('body').append(comment_sidebar);

                // Add custom button to form
                frm.add_custom_button(__('Field Comments'), function () {
                    comment_sidebar.show();
                    // Force a reflow to ensure the transition works
                    comment_sidebar[0].offsetHeight;
                    comment_sidebar.css('right', '0');
                    load_all_comments();
                });

                // Handle close button click
                comment_sidebar.find('.close-comments').click(() => {
                    comment_sidebar.css('right', '-400px');
                    setTimeout(() => {
                        comment_sidebar.hide();
                    }, 400);
                });

                // Handle refresh button click
                comment_sidebar.find('.refresh-comments').click(() => {
                    load_all_comments();
                    frappe.show_alert({
                        message: __('Comments refreshed'),
                        indicator: 'green'
                    });
                });

                function load_all_comments() {
                    frappe.db.get_list('DocType Field Comment', {
                        filters: {
                            doctype_name: frm.doctype,
                            docname: frm.docname
                        },
                        fields: ['name', 'field_name', 'field_label', 'comment', 'user', 'creation', 'reply_to'],
                        order_by: 'creation asc'
                    }).then(comments => {
                        const comments_list = comment_sidebar.find('.comments-list');
                        comments_list.empty();

                        if (!comments || comments.length === 0) {
                            comments_list.html(`
                                <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
                                    <div class="text-muted" style="text-align: center;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-chat-square-text" viewBox="0 0 16 16" style="margin-bottom: 10px;">
                                            <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a2 2 0 0 0-1.6.8L8 14.333 6.1 11.8a2 2 0 0 0-1.6-.8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5a1 1 0 0 1 .8.4l1.9 2.533a1 1 0 0 0 1.6 0l1.9-2.533a1 1 0 0 1 .8-.4H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                                            <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                                        </svg>
                                        <div>No comments yet</div>
                                    </div>
                                </div>
                            `);
                            return;
                        }

                        // Create a map of comments by their name for easy lookup
                        const commentMap = {};
                        comments.forEach(c => commentMap[c.name] = c);

                        // Group comments by field
                        const field_comments = {};
                        comments.forEach(c => {
                            if (!field_comments[c.field_name]) {
                                field_comments[c.field_name] = {
                                    label: c.field_label || c.field_name,
                                    comments: []
                                };
                            }
                            field_comments[c.field_name].comments.push(c);
                        });

                        // Create HTML for each field's comments
                        Object.entries(field_comments).forEach(([field_name, data]) => {
                            const field_section = $(`
                                <div class="field-comment-section" style="margin-bottom: 25px; padding: 15px; border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                                        <h5 style="margin: 0; font-weight: 600; font-size: 15px;">${data.label}</h5>
                                        <button class="btn btn-default btn-sm add-field-comment" style="padding: 4px 8px;" data-field-name="${field_name}">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-plus-circle" viewBox="0 0 16 16">
                                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                                            </svg>
                                        </button>
                                    </div>
                                    <div class="field-comments"></div>
                                </div>
                            `);

                            // Sort comments to keep conversations together
                            const sortedComments = data.comments.sort((a, b) => {
                                // If b is a reply to a, put b after a
                                if (b.reply_to === a.name) return -1;
                                // If a is a reply to b, put a after b
                                if (a.reply_to === b.name) return 1;
                                // Otherwise sort by creation time
                                return new Date(a.creation) - new Date(b.creation);
                            });

                            sortedComments.forEach(c => {
                                const userColor = getUserColor(c.user);
                                const lightUserColor = getLightUserColor(userColor);
                                const isCurrentUser = c.user === frappe.session.user;
                                const isReply = c.reply_to;
                                const repliedToComment = isReply ? commentMap[c.reply_to] : null;

                                field_section.find('.field-comments').append(`
                                    <div class="comment-item" style="margin-bottom: 20px; position: relative; display: flex; ${isCurrentUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}">
                                        ${!isCurrentUser ? `
                                            <div style="background: ${userColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                ${frappe.user.full_name(c.user).charAt(0).toUpperCase()}
                                            </div>
                                        ` : ''}
                                        <div style="max-width: 80%;">
                                            ${!isCurrentUser ? `
                                                <div style="margin-bottom: 8px;">
                                                    <div style="font-weight: 600; font-size: 13px; color: ${userColor};">${frappe.user.full_name(c.user)}</div>
                                                    <div style="font-size: 11px; color: var(--text-muted);">${frappe.datetime.prettyDate(c.creation)}</div>
                                                </div>
                                            ` : ''}
                                            ${isReply ? `
                                                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                                                    Replying to ${frappe.user.full_name(repliedToComment.user)}
                                                </div>
                                            ` : ''}
                                            <div class="comment-content" style="padding: 12px; border-radius: 12px; border: 1px solid ${lightUserColor}; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.05); background: ${isCurrentUser ? lightUserColor : 'var(--fg-color)'};">
                                                ${!isCurrentUser ? `
                                                    <div style="position: absolute; left: -6px; top: 10px; width: 12px; height: 12px; background: var(--fg-color); border-left: 1px solid ${lightUserColor}; border-bottom: 1px solid ${lightUserColor}; transform: rotate(45deg);"></div>
                                                ` : `
                                                    <div style="position: absolute; right: -6px; top: 10px; width: 12px; height: 12px; background: ${lightUserColor}; border-right: 1px solid ${lightUserColor}; border-bottom: 1px solid ${lightUserColor}; transform: rotate(45deg);"></div>
                                                `}
                                                ${frappe.format(c.comment, 'Markdown')}
                                            </div>
                                            <div style="display: flex; justify-content: ${isCurrentUser ? 'flex-end' : 'flex-start'}; margin-top: 4px;">
                                                ${isCurrentUser ? `
                                                    <div style="font-size: 11px; color: var(--text-muted);">${frappe.datetime.prettyDate(c.creation)}</div>
                                                ` : ''}
                                            </div>
                                        </div>
                                        ${isCurrentUser ? `
                                            <div style="background: ${userColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-left: 10px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                ${frappe.user.full_name(c.user).charAt(0).toUpperCase()}
                                            </div>
                                        ` : ''}
                                    </div>
                                `);
                            });

                            comments_list.append(field_section);
                        });

                        // Add click handlers for reply buttons
                        $(document).on('click', '.reply-btn', function (e) {
                            e.preventDefault();
                            e.stopPropagation();

                            const commentName = $(this).data('comment-name');
                            const fieldName = $(this).closest('.field-comment-section').find('h5').text();
                            const field = frm.fields_dict[fieldName];

                            if (!field) return;

                            const replyDialog = new frappe.ui.Dialog({
                                title: __('Reply to Comment'),
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
                                    }
                                ],
                                primary_action_label: __('Add Reply'),
                                secondary_action_label: __('Cancel'),
                                secondary_action: function () {
                                    replyDialog.hide();
                                },
                                primary_action: function () {
                                    const comment = replyDialog.get_value('new_comment');
                                    if (!comment) return;

                                    frappe.db.insert({
                                        doctype: 'DocType Field Comment',
                                        doctype_name: frm.doctype,
                                        docname: frm.docname,
                                        field_name: fieldName,
                                        field_label: field.df.label || fieldName,
                                        comment: comment,
                                        reply_to: commentName
                                    }).then(() => {
                                        replyDialog.hide();
                                        frappe.show_alert({
                                            message: __('Reply added successfully'),
                                            indicator: 'green'
                                        });
                                        load_all_comments();
                                    });
                                }
                            });

                            // Set initial height for comment box
                            replyDialog.fields_dict.new_comment.$wrapper.find('.ql-editor').css({
                                'min-height': '100px',
                                'max-height': '150px',
                                'border': '1px solid var(--primary-color)'
                            });

                            replyDialog.fields_dict.new_comment.$wrapper.find('.ql-editor').attr('placeholder', 'Write your reply...');

                            // Initialize mention feature
                            replyDialog.fields_dict.new_comment.$wrapper.on('focus', function () {
                                const input = replyDialog.fields_dict.new_comment.$input;
                                if (input && !input.mention) {
                                    input.mention = new frappe.ui.Mention({
                                        input: input,
                                        users: true,
                                        roles: true
                                    });
                                }
                            });

                            // Set dialog z-index and show
                            replyDialog.$wrapper.css('z-index', '9999');
                            replyDialog.show();

                            // Focus the editor
                            setTimeout(() => {
                                replyDialog.fields_dict.new_comment.$input.focus();
                            }, 100);
                        });

                        // Add click handlers for field comment buttons in sidebar
                        $(document).off('click', '.add-field-comment').on('click', '.add-field-comment', function (e) {
                            e.preventDefault();
                            e.stopPropagation();

                            const fieldName = $(this).data('field-name');
                            const field = frm.fields_dict[fieldName];
                            if (!field) return;

                            const commentDialog = new frappe.ui.Dialog({
                                title: __('Field: {0}', [field.df.label || fieldName]),
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
                                    }
                                ],
                                primary_action_label: __('Add Comment'),
                                secondary_action_label: __('Cancel'),
                                secondary_action: function () {
                                    commentDialog.hide();
                                },
                                primary_action: function () {
                                    const comment = commentDialog.get_value('new_comment');
                                    if (!comment) return;

                                    frappe.db.insert({
                                        doctype: 'DocType Field Comment',
                                        doctype_name: frm.doctype,
                                        docname: frm.docname,
                                        field_name: fieldName,
                                        field_label: field.df.label || fieldName,
                                        comment: comment
                                    }).then(() => {
                                        commentDialog.hide();
                                        frappe.show_alert({
                                            message: __('Comment added successfully'),
                                            indicator: 'green'
                                        });
                                        load_all_comments();
                                    });
                                }
                            });

                            // Set initial height for comment box
                            commentDialog.fields_dict.new_comment.$wrapper.find('.ql-editor').css({
                                'min-height': '100px',
                                'max-height': '150px',
                                'border': '1px solid var(--primary-color)'
                            });

                            commentDialog.fields_dict.new_comment.$wrapper.find('.ql-editor').attr('placeholder', 'Write your comment...');

                            // Initialize mention feature
                            commentDialog.fields_dict.new_comment.$wrapper.on('focus', function () {
                                const input = commentDialog.fields_dict.new_comment.$input;
                                if (input && !input.mention) {
                                    input.mention = new frappe.ui.Mention({
                                        input: input,
                                        users: true,
                                        roles: true
                                    });
                                }
                            });

                            // Set dialog z-index and show
                            commentDialog.$wrapper.css('z-index', '9999');
                            commentDialog.show();

                            // Focus the editor
                            setTimeout(() => {
                                commentDialog.fields_dict.new_comment.$input.focus();
                            }, 100);
                        });
                    });
                }
            }

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
                            secondary_action_label: __('Close'),
                            secondary_action: function () {
                                d.hide();
                            },
                            primary_action: function () {
                                const comment = d.get_value('new_comment');
                                if (!comment) return;

                                frappe.db.insert({
                                    doctype: 'DocType Field Comment',
                                    doctype_name: frm.doctype,
                                    docname: frm.docname,
                                    field_name: fieldname,
                                    field_label: field.df.label || fieldname,
                                    comment: comment,
                                    reply_to: d.reply_to || null
                                }).then(() => {
                                    d.hide();
                                    frappe.show_alert({
                                        message: __('Comment added successfully'),
                                        indicator: 'green'
                                    });
                                    // Reload comments
                                    load_comments();
                                    // Reload sidebar comments if visible
                                    if (comment_sidebar.is(':visible')) {
                                        load_all_comments();
                                    }
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
                                fields: ['name', 'comment', 'user', 'creation', 'reply_to'],
                                order_by: 'creation asc'
                            }).then(comments => {
                                if (!comments || comments.length === 0) {
                                    d.fields_dict.comments_html.$wrapper.html(`
                                        <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
                                            <div class="text-muted" style="text-align: center;">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-chat-square-text" viewBox="0 0 16 16" style="margin-bottom: 10px;">
                                                    <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a2 2 0 0 0-1.6.8L8 14.333 6.1 11.8a2 2 0 0 0-1.6-.8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5a1 1 0 0 1 .8.4l1.9 2.533a1 1 0 0 0 1.6 0l1.9-2.533a1 1 0 0 1 .8-.4H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                                                    <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                                                </svg>
                                                <div>No comments yet</div>
                                            </div>
                                        </div>
                                    `);
                                    return;
                                }

                                // Create a map of comments by their name for easy lookup
                                const commentMap = {};
                                comments.forEach(c => commentMap[c.name] = c);

                                // Sort comments to keep conversations together
                                const sortedComments = comments.sort((a, b) => {
                                    // If b is a reply to a, put b after a
                                    if (b.reply_to === a.name) return -1;
                                    // If a is a reply to b, put a after b
                                    if (a.reply_to === b.name) return 1;
                                    // Otherwise sort by creation time
                                    return new Date(a.creation) - new Date(b.creation);
                                });

                                const comments_html = sortedComments.map(c => {
                                    const userColor = getUserColor(c.user);
                                    const lightUserColor = getLightUserColor(userColor);
                                    const isCurrentUser = c.user === frappe.session.user;
                                    const isReply = c.reply_to;
                                    const repliedToComment = isReply ? commentMap[c.reply_to] : null;

                                    return `
                                        <div class="comment-item" style="margin-bottom: 20px; position: relative; display: flex; ${isCurrentUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}">
                                            ${!isCurrentUser ? `
                                                <div style="background: ${userColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                    ${frappe.user.full_name(c.user).charAt(0).toUpperCase()}
                                                </div>
                                            ` : ''}
                                            <div style="max-width: 80%;">
                                                ${!isCurrentUser ? `
                                                    <div style="margin-bottom: 8px;">
                                                        <div style="font-weight: 600; font-size: 13px; color: ${userColor};">${frappe.user.full_name(c.user)}</div>
                                                        <div style="font-size: 11px; color: var(--text-muted);">${frappe.datetime.prettyDate(c.creation)}</div>
                                                    </div>
                                                ` : ''}
                                                ${isReply ? `
                                                    <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                                                        Replying to ${frappe.user.full_name(repliedToComment.user)}
                                                    </div>
                                                ` : ''}
                                                <div class="comment-content" style="padding: 12px; border-radius: 12px; border: 1px solid ${lightUserColor}; position: relative; box-shadow: 0 2px 4px rgba(0,0,0,0.05); background: ${isCurrentUser ? lightUserColor : 'var(--fg-color)'};">
                                                    ${!isCurrentUser ? `
                                                        <div style="position: absolute; left: -6px; top: 10px; width: 12px; height: 12px; background: var(--fg-color); border-left: 1px solid ${lightUserColor}; border-bottom: 1px solid ${lightUserColor}; transform: rotate(45deg);"></div>
                                                    ` : `
                                                        <div style="position: absolute; right: -6px; top: 10px; width: 12px; height: 12px; background: ${lightUserColor}; border-right: 1px solid ${lightUserColor}; border-bottom: 1px solid ${lightUserColor}; transform: rotate(45deg);"></div>
                                                    `}
                                                    ${frappe.format(c.comment, 'Markdown')}
                                                </div>
                                                <div style="display: flex; justify-content: ${isCurrentUser ? 'flex-end' : 'flex-start'}; margin-top: 4px;">
                                                    ${isCurrentUser ? `
                                                        <div style="font-size: 11px; color: var(--text-muted);">${frappe.datetime.prettyDate(c.creation)}</div>
                                                    ` : ''}
                                                </div>
                                            </div>
                                            ${isCurrentUser ? `
                                                <div style="background: ${userColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-left: 10px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                                    ${frappe.user.full_name(c.user).charAt(0).toUpperCase()}
                                                </div>
                                            ` : ''}
                                        </div>
                                    `;
                                }).join('');

                                d.fields_dict.comments_html.$wrapper.html(`
                                    <div style="max-height: 400px; overflow-y: auto; padding-right: 10px;">
                                        ${comments_html}
                                    </div>
                                `);

                                // Add click handlers for reply buttons in the field dialog
                                $(document).on('click', '.reply-btn', function (e) {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    const commentName = $(this).data('comment-name');
                                    d.reply_to = commentName;

                                    // Show visual indicator
                                    d.fields_dict.new_comment.$wrapper.find('.ql-editor').css({
                                        'border': '1px solid var(--primary-color)',
                                        'background-color': 'var(--fg-color)'
                                    });

                                    d.fields_dict.new_comment.$wrapper.find('.ql-editor').attr('placeholder', 'Write your reply...');

                                    // Focus and scroll to input
                                    d.fields_dict.new_comment.$input.focus();
                                    d.fields_dict.new_comment.$wrapper[0].scrollIntoView({ behavior: 'smooth' });
                                });
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

                        // Set dialog z-index
                        d.$wrapper.css('z-index', '9999');
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