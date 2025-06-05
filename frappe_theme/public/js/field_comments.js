// Place these function definitions near the top of the file, outside any other function scopes.
const primaryColor = frappe.boot.my_theme?.button_background_color || '#171717';
// Variable to store the context of the currently viewed field's comments
let current_field_context = null;

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

// Place this function definition near the top of the file, outside any other function scopes.
function get_comment_html(comment, commentMap) {
    const userColor = getUserColor(comment.user);
    const isCurrentUser = comment.user === frappe.session.user;

    // Render the comment content as Markdown
    const renderedComment = frappe.format(comment.comment, 'Markdown');

    return `
        <div class="comment-item" style="margin-bottom: 28px; position: relative; display: flex; ${isCurrentUser ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}">
            ${!isCurrentUser ? `
                <div style="background: ${userColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${frappe.user.full_name(comment.user).charAt(0).toUpperCase()}
                </div>
            ` : ''}
            <div style="max-width: 80%;">
                ${!isCurrentUser ? `
                    <div style="margin-bottom: 6px;">
                        <div style="font-weight: 600; font-size: 13px; color: ${userColor}; display: flex; align-items: center; gap: 6px;">
                            ${frappe.user.full_name(comment.user)}
                            <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">${frappe.datetime.prettyDate(comment.creation_date)}</span>
                        </div>
                    </div>
                ` : ''}
                <div class="comment-content" style="padding: 12px 16px; border-radius: 16px; border: 1px solid #ececec; position: relative; background: ${isCurrentUser ? '#f5f7fa' : '#fff'}; margin-bottom: 2px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                    ${!isCurrentUser ? `
                        <div style="position: absolute; left: -7px; top: 16px; width: 12px; height: 12px; background: #fff; border-left: 1px solid #ececec; border-bottom: 1px solid #ececec; transform: rotate(45deg);"></div>
                    ` : `
                        <div style="position: absolute; right: -7px; top: 16px; width: 12px; height: 12px; background: #f5f7fa; border-right: 1px solid #ececec; border-bottom: 1px solid #ececec; transform: rotate(45deg);"></div>
                    `}
                    <div style="font-size: 14px; line-height: 1.6; color: #222; word-wrap: break-word;">${renderedComment}</div>
                </div>
                <div style="display: flex; justify-content: ${isCurrentUser ? 'flex-end' : 'flex-start'}; margin-top: 4px;">
                    ${isCurrentUser ? `
                <div style="font-size: 11px; color: var(--text-muted);">${frappe.datetime.prettyDate(comment.creation_date)}</div>
                    ` : ''}
                </div>
            </div>
            ${isCurrentUser ? `
                <div style="background: ${userColor}; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-left: 10px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${frappe.user.full_name(comment.user).charAt(0).toUpperCase()}
                </div>
            ` : ''}
        </div>
    `;
}

// Add comment button to form and implement threaded comments
frappe.ui.form.on('*', {
    refresh: function (frm) {
        if (!frm.is_new()) {
            if (!frm.doc || !frm.doc.doctype) return;

            // Lighten by 40%
            const lightPrimaryColor = getLightColor(primaryColor);
            const lighterPrimaryColor = getLighterColor(primaryColor);

            // Create comment popup/sidebar if not exists
            if (!$('.field-comments-sidebar').length) {
                const comment_sidebar = $(`
                    <div class="field-comments-sidebar" style="display: none; position: fixed; right: -400px; top: 48px; width: 400px; height: calc(100vh - 48px); background: var(--fg-color); box-shadow: -2px 0 8px rgba(0,0,0,0.1); z-index: 100; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);">
                        <div style="padding: 15px; border-bottom: none;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h5 style="margin: 0; font-size: 18px; font-weight: 600;">Comment</h5>
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
                        <div class="comments-container" style="height: calc(100vh - 108px); overflow-y: auto; padding: 15px;">
                            <div class="comments-list"></div>
                        </div>
                    </div>
                `);

                $('body').append(comment_sidebar);

                // Handle close button click
                comment_sidebar.find('.close-comments').click(() => {
                    comment_sidebar.css('right', '-400px');
                    setTimeout(() => {
                        comment_sidebar.hide();
                    }, 400);
                });

                // Handle refresh button click
                comment_sidebar.find('.refresh-comments').click(() => {
                    if (!cur_frm) return;

                    // Show loading state
                    const refreshBtn = comment_sidebar.find('.refresh-comments');
                    refreshBtn.prop('disabled', true);
                    refreshBtn.find('svg').css('animation', 'spin 1s linear infinite');

                    let loadCommentsPromise;

                    // Check if viewing comments for a specific field or all comments
                    if (current_field_context) {
                        loadCommentsPromise = load_field_comments(current_field_context.fieldName, current_field_context.field);
                    } else {
                        loadCommentsPromise = load_all_comments();
                    }

                    loadCommentsPromise.then(() => {
                        // Reset button state
                        refreshBtn.prop('disabled', false);
                        refreshBtn.find('svg').css('animation', '');

                        frappe.show_alert({
                            message: __('Comments refreshed'),
                            indicator: 'green'
                        });
                    }).catch((error) => {
                        // Reset button state on error
                        refreshBtn.prop('disabled', false);
                        refreshBtn.find('svg').css('animation', '');

                        frappe.show_alert({
                            message: __('Error refreshing comments'),
                            indicator: 'red'
                        });
                    });
                });
            }

            // Add comment button to form
            if (!frm.page.sidebar.find('.field-comments-btn').length) {
                frm.add_custom_button(__('Comment'), function () {
                    $('.field-comments-sidebar').show();
                    // Force a reflow to ensure the transition works
                    $('.field-comments-sidebar')[0].offsetHeight;
                    $('.field-comments-sidebar').css('right', '0');
                    // Set context to null when viewing all comments
                    current_field_context = null;
                    load_all_comments();
                });
            }

            // Function to initialize comment control
            function initializeCommentControl(field_section, fieldName, field, get_comment_html) {
                const commentBox = field_section.find('.comment-box')[0];
                let control;

                // Initialize the control
                control = frappe.ui.form.make_control({
                    parent: $(commentBox),
                    df: {
                        fieldtype: 'Comment',
                        fieldname: 'comment',
                        placeholder: __('Type your message...Use @ to mention someone'),
                    },
                    render_input: true,
                    only_input: true,
                    enable_mentions: true,
                });

                // Remove comment-input-header and adjust spacing
                $(commentBox).find('.comment-input-header').remove();
                $(commentBox).closest('.comment-input').css({
                    'margin': '0',
                    'padding': '0'
                });
                $(commentBox).closest('.comment-box').css({
                    'margin': '0',
                    'padding': '0'
                });

                // Handle comment submission using Frappe's built-in button
                $(commentBox).find('.btn-comment').off('click').on('click', () => {
                    if (!control) return;

                    const comment = control.get_value();
                    if (!comment) return;

                    // Extract mentions from comment
                    const mentionRegex = /@([a-zA-Z0-9._-]+)/g;
                    const mentions = [];
                    let match;
                    while ((match = mentionRegex.exec(comment)) !== null) {
                        mentions.push(match[1]);
                    }

                    // Call the server-side method to save the comment
                    frappe.call({
                        method: "frappe_theme.api.save_field_comment",
                        args: {
                            doctype_name: frm.doctype,
                            docname: frm.docname,
                            field_name: fieldName,
                            field_label: field.df.label || fieldName,
                            comment_text: comment
                        },
                        callback: function (response) {
                            if (response.message) {
                                const newCommentEntry = response.message;
                                control.set_value('');
                                frappe.show_alert({
                                    message: __('Comment added successfully'),
                                    indicator: 'green'
                                });

                                // Show status selector after first comment
                                field_section.find('.status-selector').show();

                                // Send notifications to mentioned users
                                if (mentions.length > 0) {
                                    mentions.forEach(mention => {
                                        frappe.call({
                                            method: 'frappe_theme.api.send_mention_notification',
                                            args: {
                                                mentioned_user: mention,
                                                comment_doc: newCommentEntry.parent,
                                                doctype: frm.doctype,
                                                docname: frm.docname,
                                                field_name: fieldName,
                                                field_label: field.df.label || fieldName,
                                                comment: comment
                                            }
                                        });
                                    });
                                }

                                // Reload comments based on current view
                                const isAllCommentsView = $('.field-comments-sidebar').find('.comments-list').children().length > 1;
                                if (isAllCommentsView) {
                                    load_all_comments();
                                } else {
                                    // For field-specific view, reload the comments immediately
                                    load_field_comments(fieldName, field).then(() => {
                                        // Update comment count badge
                                        updateCommentCount(fieldName);
                                    });
                                }
                            } else {
                                console.error('Error saving comment:', response);
                                frappe.show_alert({
                                    message: __('Error adding comment'),
                                    indicator: 'red'
                                });
                            }
                        }
                    });
                });

                return control;
            }

            function load_field_comments(fieldName, field) {
                return new Promise((resolve, reject) => {
                    frappe.call({
                        method: "frappe_theme.api.load_field_comments",
                        args: {
                            doctype_name: frm.doctype,
                            docname: frm.docname,
                            field_name: fieldName
                        },
                        callback: function (response) {
                            const comments_list = $('.field-comments-sidebar').find('.comments-list');
                            comments_list.empty();

                            // Create field section first
                            const field_section = $(`
                                <div class="field-comment-section" style="margin-bottom: 25px; padding: 15px; border-radius: 12px; border: none; box-shadow: none;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                                        <h5 style="margin: 0; font-weight: 600; font-size: 15px;">${field.df.label || fieldName}</h5>
                                        <div class="status-selector" style="display: none; align-items: center; gap: 8px;">
                                            <select class="form-control status-select" style="font-size: 12px; padding: 2px 8px; height: 24px;">
                                                <option value="Open">Open</option>
                                                <option value="Resolved">Resolved</option>
                                                <option value="Closed">Closed</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="field-comments"></div>
                                    <div class="comment-input" style="margin-top: 15px;">
                                        <div style="display: flex; align-items: center;">
                                            <div style="flex-grow: 1; display: flex; align-items: center; border: 1px solid var(--border-color); border-radius: 20px; padding: 8px 15px; background-color: var(--control-bg); box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s ease;">
                                                <div class="comment-box" style="flex-grow: 1; min-height: 24px; margin-right: 8px;"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `);

                            // Initialize status tracking for this field section
                            let currentStatus = response.message.status || 'Open';

                            // Set initial status and show status selector only if there are comments
                            if (response.message.comments && response.message.comments.length > 0) {
                                field_section.find('.status-selector').show();
                                field_section.find('.status-select').val(currentStatus);

                                // Disable status select if status is Closed
                                if (currentStatus === 'Closed') {
                                    field_section.find('.status-select').prop('disabled', true);
                                    field_section.find('.status-select').css({
                                        'opacity': '0.7',
                                        'cursor': 'not-allowed',
                                        'background-color': '#f5f5f5'
                                    });
                                }
                            }

                            // Add status change handler
                            field_section.find('.status-select').on('change', function () {
                                const newStatus = $(this).val();

                                // If current status is Closed, prevent change
                                if (currentStatus === 'Closed') {
                                    $(this).val('Closed');
                                    frappe.show_alert({
                                        message: __('Cannot change status of closed comments'),
                                        indicator: 'red'
                                    });
                                    return;
                                }

                                frappe.db.get_list('DocType Field Comment', {
                                    filters: {
                                        doctype_name: frm.doctype,
                                        docname: frm.docname,
                                        field_name: fieldName
                                    },
                                    fields: ['name'],
                                    limit: 1
                                }).then(comment_doc_list => {
                                    if (comment_doc_list && comment_doc_list.length > 0) {
                                        frappe.db.set_value('DocType Field Comment', comment_doc_list[0].name, 'status', newStatus)
                                            .then(() => {
                                                currentStatus = newStatus;  // Update current status
                                                frappe.show_alert({
                                                    message: __('Status updated successfully'),
                                                    indicator: 'green'
                                                });

                                                // If status is Closed, disable the select
                                                if (newStatus === 'Closed') {
                                                    field_section.find('.status-select').prop('disabled', true);
                                                    field_section.find('.status-select').css({
                                                        'opacity': '0.7',
                                                        'cursor': 'not-allowed',
                                                        'background-color': '#f5f5f5'
                                                    });
                                                    field_section.find('.comment-input').hide();
                                                } else {
                                                    field_section.find('.status-select').prop('disabled', false);
                                                    field_section.find('.status-select').css({
                                                        'opacity': '1',
                                                        'cursor': 'pointer',
                                                        'background-color': ''
                                                    });
                                                    field_section.find('.comment-input').show();
                                                }
                                            });
                                    }
                                });
                            });

                            // Hide comment input if status is Closed
                            if (currentStatus === 'Closed') {
                                field_section.find('.comment-input').hide();
                            }

                            if (!response.message.comments || response.message.comments.length === 0) {
                                field_section.find('.field-comments').html(`
                                    <div style="display: flex; justify-content: center; align-items: center; height: 100px;">
                                        <div class="text-muted" style="text-align: center;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-chat-square-text" viewBox="0 0 16 16" style="margin-bottom: 10px;">
                                                <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a2 2 0 0 0-1.6.8L8 14.333 6.1 11.8a2 2 0 0 0-1.6-.8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5a1 1 0 0 1 .8.4l1.9 2.533a1 1 0 0 0 1.6 0l1.9-2.533a1 1 0 0 1 .8-.4H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                                                <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                                            </svg>
                                            <div>No comments yet</div>
                                        </div>
                                    </div>
                                `);
                            } else {
                                const commentMap = {};
                                response.message.comments.forEach(c => commentMap[c.name] = c);

                                // Sort comments by creation date
                                const sortedComments = response.message.comments.sort((a, b) => new Date(a.creation_date) - new Date(b.creation_date));

                                sortedComments.forEach(c => {
                                    const comment_element = get_comment_html(c, commentMap);
                                    field_section.find('.field-comments').append(comment_element);
                                });
                            }

                            comments_list.append(field_section);
                            initializeCommentControl(field_section, fieldName, field, get_comment_html);
                            resolve();
                        },
                        error: function (err) {
                            console.error('Error loading field comments:', err);
                            reject(err);
                        }
                    });
                });
            }

            function load_all_comments() {
                return new Promise((resolve, reject) => {
                    frappe.call({
                        method: "frappe_theme.api.load_all_comments",
                        args: {
                            doctype_name: frm.doctype,
                            docname: frm.docname
                        },
                        callback: function (response) {
                            const comments_list = $('.field-comments-sidebar').find('.comments-list');
                            comments_list.empty();

                            if (!response.message || response.message.length === 0) {
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
                                resolve();
                                return;
                            }

                            // Create HTML for each field's comments
                            response.message.forEach(data => {
                                const field = frm.fields_dict[data.field_name];
                                if (!field) return; // Skip if field doesn't exist in the form

                                const field_section = $(`
                                    <div class="field-comment-section" style="margin-bottom: 25px; padding: 15px; border-radius: 12px; border: none; box-shadow: none;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                                            <h5 style="margin: 0; font-weight: 600; font-size: 15px;">${data.field_label || data.field_name}</h5>
                                            <div class="status-selector" style="display: none; align-items: center; gap: 8px;">
                                                <select class="form-control status-select" style="font-size: 12px; padding: 2px 8px; height: 24px;">
                                                    <option value="Open">Open</option>
                                                    <option value="Resolved">Resolved</option>
                                                    <option value="Closed">Closed</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div class="field-comments"></div>
                                        <div class="comment-input" style="margin-top: 15px;">
                                            <div style="display: flex; align-items: center;">
                                                <div style="flex-grow: 1; display: flex; align-items: center; border: 1px solid var(--border-color); border-radius: 20px; padding: 8px 15px; background-color: var(--control-bg); box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s ease;">
                                                    <div class="comment-box" style="flex-grow: 1; min-height: 24px; margin-right: 8px;"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `);

                                // Initialize status tracking for this field section
                                let currentStatus = data.status || 'Open';

                                // Set initial status and show status selector only if there are comments
                                if (data.comments && data.comments.length > 0) {
                                    field_section.find('.status-selector').show();
                                    field_section.find('.status-select').val(currentStatus);

                                    // Disable status select if status is Closed
                                    if (currentStatus === 'Closed') {
                                        field_section.find('.status-select').prop('disabled', true);
                                        field_section.find('.status-select').css({
                                            'opacity': '0.7',
                                            'cursor': 'not-allowed',
                                            'background-color': '#f5f5f5'
                                        });
                                    }
                                }

                                // Add status change handler
                                field_section.find('.status-select').on('change', function () {
                                    const newStatus = $(this).val();

                                    // If current status is Closed, prevent change
                                    if (currentStatus === 'Closed') {
                                        $(this).val('Closed');
                                        frappe.show_alert({
                                            message: __('Cannot change status of closed comments'),
                                            indicator: 'red'
                                        });
                                        return;
                                    }

                                    frappe.db.get_list('DocType Field Comment', {
                                        filters: {
                                            doctype_name: frm.doctype,
                                            docname: frm.docname,
                                            field_name: data.field_name
                                        },
                                        fields: ['name'],
                                        limit: 1
                                    }).then(comment_doc_list => {
                                        if (comment_doc_list && comment_doc_list.length > 0) {
                                            frappe.db.set_value('DocType Field Comment', comment_doc_list[0].name, 'status', newStatus)
                                                .then(() => {
                                                    currentStatus = newStatus;  // Update current status
                                                    frappe.show_alert({
                                                        message: __('Status updated successfully'),
                                                        indicator: 'green'
                                                    });

                                                    // If status is Closed, disable the select
                                                    if (newStatus === 'Closed') {
                                                        field_section.find('.status-select').prop('disabled', true);
                                                        field_section.find('.status-select').css({
                                                            'opacity': '0.7',
                                                            'cursor': 'not-allowed',
                                                            'background-color': '#f5f5f5'
                                                        });
                                                        field_section.find('.comment-input').hide();
                                                    } else {
                                                        field_section.find('.status-select').prop('disabled', false);
                                                        field_section.find('.status-select').css({
                                                            'opacity': '1',
                                                            'cursor': 'pointer',
                                                            'background-color': ''
                                                        });
                                                        field_section.find('.comment-input').show();
                                                    }
                                                });
                                        }
                                    });
                                });

                                // Hide comment input if status is Closed
                                if (currentStatus === 'Closed') {
                                    field_section.find('.comment-input').hide();
                                }

                                if (!data.comments || data.comments.length === 0) {
                                    field_section.find('.field-comments').html(`
                                        <div style="display: flex; justify-content: center; align-items: center; height: 100px;">
                                            <div class="text-muted" style="text-align: center;">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-chat-square-text" viewBox="0 0 16 16" style="margin-bottom: 10px;">
                                                    <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a2 2 0 0 0-1.6.8L8 14.333 6.1 11.8a2 2 0 0 0-1.6-.8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5a1 1 0 0 1 .8.4l1.9 2.533a1 1 0 0 0 1.6 0l1.9-2.533a1 1 0 0 1 .8-.4H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                                                    <path d="M3 3.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 6a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 6zm0 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                                                </svg>
                                                <div>No comments yet</div>
                                            </div>
                                        </div>
                                    `);
                                } else {
                                    // Need a commentMap for replies - create it from the logs
                                    const commentMap = {};
                                    data.comments.forEach(c => commentMap[c.name] = c);

                                    // Sort comments by creation date
                                    const sortedComments = data.comments.sort((a, b) => new Date(a.creation_date) - new Date(b.creation_date));

                                    sortedComments.forEach(c => {
                                        const comment_element = get_comment_html(c, commentMap);
                                        field_section.find('.field-comments').append(comment_element);
                                    });
                                }

                                comments_list.append(field_section);
                                initializeCommentControl(field_section, data.field_name, field, get_comment_html);
                            });

                            resolve();
                        },
                        error: function (err) {
                            console.error('Error loading all comments:', err);
                            reject(err);
                        }
                    });
                });
            }

            // Function to update comment count
            function updateCommentCount(fieldName) {
                frappe.call({
                    method: "frappe_theme.api.get_comment_count",
                    args: {
                        doctype_name: frm.doctype,
                        docname: frm.docname,
                        field_name: fieldName
                    },
                    callback: function (response) {
                        // Ensure we have a valid number
                        let count = 0;
                        if (typeof response.message === 'number') {
                            count = response.message;
                        } else if (typeof response.message === 'string') {
                            count = parseInt(response.message) || 0;
                        }

                        const comment_icon = $(frm.fields_dict[fieldName].label_area).find('.field-comment-icon');
                        if (comment_icon.length) {
                            const badge = comment_icon.find('.comment-count-badge');
                            badge.text(count);

                            // Always show the badge with appropriate styling
                            badge.css({
                                display: 'flex !important',
                                visibility: 'visible',
                                opacity: count > 0 ? 1 : 0.9,
                                transform: count > 0 ? 'scale(1)' : 'scale(0.9)',
                                background: count > 0 ? primaryColor : '#e0e0e0',
                                color: count > 0 ? '#fff' : '#666',
                                boxShadow: count > 0 ? '0 2px 6px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                                zIndex: 9999
                            });
                        }
                    },
                    error: function (err) {
                        // Set default state on error
                        const comment_icon = $(frm.fields_dict[fieldName].label_area).find('.field-comment-icon');
                        if (comment_icon.length) {
                            const badge = comment_icon.find('.comment-count-badge');
                            badge.text('0');
                            badge.css({
                                display: 'flex !important',
                                visibility: 'visible',
                                opacity: 0.9,
                                transform: 'scale(0.9)',
                                background: '#e0e0e0',
                                color: '#666',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            });
                        }
                    }
                });
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
                        <div class="field-comment-icon" style="display: none; position: absolute; right: -30px; top: -2px; z-index: 10;">
                            <button class="btn" style="padding: 2px 8px; position: relative;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-chat" viewBox="0 0 16 16">
                                    <path d="M2.678 11.894a1 1 0 0 1 .287.801 11 11 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8 8 0 0 0 8 14c3.996 0 7-2.807 7-6s-3.004-6-7-6-7 2.808-7 6c0 1.468.617 2.83 1.678 3.894m-.493 3.905a22 22 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a10 10 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105"></path>
                                </svg>
                                <span class="comment-count-badge" style="
                                    position: absolute;
                                    top: -4px;
                                    right: -8px;
                                    background: #ff5722;
                                    color: #fff;
                                    border-radius: 50%;
                                    min-width: 16px;
                                    height: 16px;
                                    font-size: 10px;
                                    font-weight: 600;
                                    display: flex !important;
                                    align-items: center;
                                    justify-content: center;
                                    padding: 0 4px;
                                    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                                    border: 1.5px solid #fff;
                                    z-index: 9999;
                                    opacity: 1;
                                    transition: all 0.2s ease;
                                    transform-origin: center;
                                ">0</span>
                            </button>
                        </div>
                    `);

                    // Add icon to the field wrapper
                    $(field.label_area).css('position', 'relative');
                    $(field.label_area).append(comment_icon);

                    // Update comment count initially
                    updateCommentCount(fieldname);

                    // Show/hide icon on hover
                    $(field.$wrapper).hover(
                        function () {
                            comment_icon.show();
                            updateCommentCount(fieldname);
                        },
                        function () { comment_icon.hide(); }
                    );

                    // Handle click on comment icon
                    comment_icon.click(() => {
                        // Show sidebar
                        $('.field-comments-sidebar').show();
                        // Force a reflow to ensure the transition works
                        $('.field-comments-sidebar')[0].offsetHeight;
                        $('.field-comments-sidebar').css('right', '0');

                        // Set context when viewing comments for a specific field
                        current_field_context = { fieldName: fieldname, field: field };

                        // Load only this field's comments
                        load_field_comments(fieldname, field);
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