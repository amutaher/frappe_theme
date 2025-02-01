

async function get_note_list(frm, selector) {
    toggleLoader(true, selector);
    const response = await frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'Notes',
            fields: ['*'],
            filters: { 'reference_doctype': frm.doc.doctype, 'related_to': frm.doc.name },
            limit_page_length: 10000,
        },
    });
    note_list = response.message;
    toggleLoader(false, selector);
    const today = new Date(), yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const formatDate = date => new Date(date).toISOString().split('T')[0];
    const groupedData = { Today: [], Yesterday: [], Older: [] };
    note_list.forEach(note => {
        const creationDate = formatDate(note.creation);
        creationDate === formatDate(today) ? groupedData.Today.unshift(note) :
            creationDate === formatDate(yesterday) ? groupedData.Yesterday.push(note) :
                groupedData.Older.push(note);
    });

    document.querySelector(`[data-fieldname="${selector}"]`).innerHTML = `
    <style>
        * {
            margin: 0px;
            padding: 0px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            box-sizing: border-box;
        }
        .note_content {
            width: 100%;
            // padding: 20px;
        }
        .title_links {
            width: 100%;
            height: 700px;
            min-height: 700px;
            overflow-y: auto;
        }
        .note-button {
            background-color: black;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 4px 8px;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.3s, transform 0.2s;
        }
        #default-message {
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center;
        }
        #action_icon {
            cursor: pointer;
            background: none;
            border: none;
            font-size: 20px;
            padding: 0;
        }
        .action-menu {
            position: relative;
        }
        .action-menu-content {
            display: none;
            position: absolute;
            right: 16px;
            top:7px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        .action-menu-content a {
            display: block;
            padding: 6px 35px;
            text-decoration: none;
            color: inherit;
        }
        .action-menu-content a:hover {
            background: #f8fafc;
        }
        .note_message {
            display: flex;
            min-height: 500px;
            height: 100%;   
            justify-content: center;
            align-items: center;
        }
        .note-title {
            font-size: 24px;
            font-weight:normal ;
            margin-bottom: 20px;
        }
        .note-group {
            margin-bottom: 20px;
              
        }
        .group-title {
            font-size: 14px;
            color: #718096;
            margin-bottom: 10px;
        }
        .note-item {
            border-bottom: 1px solid #e2e8f0;
            padding: 10px;
            // margin-bottom: 15px;
        }
        .note-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;

        }

        .note-header h3 {
        font-weight: normal;
            font-size: 18px;
            margin: 0;
            flex-grow: 1;
            margin-right: 10px;
        }

        .frappe-control .ql-editor:not(.read-mode){
            min-height: 100px;
            Height: 36px;
            background-color: #fff;
            border: none;

        }
        .input-with-feedback form-control{
            background-color: red !important;

        }
       


        .note-content {
            margin-bottom: 10px;
        }
        .note-meta {
            display: flex;
            align-items: center;
            font-size: 12px;
            color: #718096;
            gap: 5px;
        }
        .add-note-link {
            color: #9C2B2E;
            text-decoration: none;
        }
        @media (max-width: 768px) {
            .note_content {
                padding: 10px;
            }
            .note-title {
                font-size: 20px;
            }
            .note-header h3 {
                font-size: 16px;
            }
            .note-item {
                padding: 10px;
            }
        }
    </style>
    <div class="d-flex">
        <!-- Main Content -->
        <div class="note_content">
            <div id="default-message">
                <div>
                    <h3>Select an item to read</h3>
                    <p>Nothing is selected</p>
                </div>
            </div>
            <div id="dynamic-content" style="display: none;"></div>

            <div class="title_links mt-4">
                ${groupedData.Today.length === 0 && groupedData.Yesterday.length === 0 && groupedData.Older.length === 0 ? `
                    <div class="note_message">You haven't created a Record yet</div>
                ` : `
                    ${['Today', 'Yesterday', 'Older'].map(group =>
        groupedData[group].length > 0 ? `
                        <div class="note-group">
                            <p class="group-title">${group}</p>
                            ${groupedData[group].map(note => `
                                <div class="note-item">
                                    <div class="note-header">
                                        <h3>${note.title}</h3>
                                        <div class="action-menu">
                                            <button class="action-button" id="action_icon" note_id="${note.name}">⋮</button>
                                            <div class="action-menu-content">
                                                <a href="#" class="edit_note">Edit</a>
                                                <a href="#" class="delete_note">Delete</a>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="note-content">${note.description || ''}</div>
                                    <div class="note-meta">
                                        <span>${note.owner}</span>
                                        <span>•</span>
                                        <span>${timeAgo(note.creation)}</span>

                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''
    ).join('')}
                `}
            </div>
        </div>
    </div>
`;

    // ======================================== Update Note ========================================

    document.querySelectorAll('.edit_note').forEach(link => {
        link.addEventListener('click', async function (event) {
            event.preventDefault();
            event.stopPropagation();

            const noteName = this.closest('.note-item').querySelector('#action_icon').getAttribute('note_id');
            if (!noteName) {
                frappe.show_alert({ message: 'Note name not found', indicator: 'red' });
                return;
            }

            try {
                // Fetch the note details
                const { message: latestNote } = await frappe.call({
                    method: 'frappe.client.get',
                    args: { doctype: 'Notes', name: noteName },
                });

                if (!latestNote) {
                    frappe.show_alert({ message: 'Failed to fetch note details', indicator: 'red' });
                    return;
                }

                // Get the metadata for the doctype
                const { message: meta } = await frappe.call({
                    method: 'mgrant.apis.api.get_doctype_meta',
                    args: { doctype: 'Notes' },
                });

                if (!meta || !meta.fields) {
                    frappe.show_alert({ message: 'Failed to fetch doctype metadata', indicator: 'red' });
                    return;
                }

                // Get the container for dynamic content
                const dynamicContent = document.getElementById('dynamic-content');
                const defaultMessage = document.getElementById('default-message');
                dynamicContent.style.display = 'block';
                defaultMessage.style.display = 'none';
                dynamicContent.innerHTML = ''; // Clear previous content

                // Create a form container
                const formContainer = document.createElement('div');
                formContainer.classList.add('form-container');
                dynamicContent.appendChild(formContainer);

                // Render fields using make_control
                const fieldControls = [];
                meta.fields.forEach(f => {
                    if (f.hidden) return; // Skip hidden fields

                    const fieldWrapper = document.createElement('div');
                    fieldWrapper.classList.add('my-control', 'mb-3');
                    formContainer.appendChild(fieldWrapper);

                    const control = frappe.ui.form.make_control({
                        parent: fieldWrapper,
                        df: {
                            fieldname: f.fieldname,
                            fieldtype: f.fieldtype || 'Data',
                            options: f.fieldtype === 'Link' ? f.options : undefined,
                            default: latestNote[f.fieldname] || '',
                            read_only: f.read_only || 0,
                            hidden: f.hidden || 0,
                        },
                        render_input: true,
                    });
                    $(control.label_area).remove()
                    const formControl = control.wrapper.querySelector('.form-control');
                    if (formControl) {
                        formControl.style.backgroundColor = 'white';
                        formControl.style.marginBottom = '0px';

                        formControl.addEventListener('focus', () => {
                            formControl.style.backgroundColor = 'white';
                            formControl.style.boxShadow = 'none';
                            formControl.style.border = 'none';
                        });

                    }

                    control.refresh();

                    // Explicitly set the value to ensure pre-fill
                    if (latestNote[f.fieldname]) {
                        control.set_value(latestNote[f.fieldname]);
                    }

                    fieldControls.push(control);
                });

                // Add buttons for cancel and update
                const buttonContainer = document.createElement('div');
                buttonContainer.classList.add('button-container', 'pb-4');
                formContainer.appendChild(buttonContainer);

                const updateButton = document.createElement('button');
                updateButton.classList.add('btn', 'btn-primary');
                updateButton.textContent = 'Update';
                updateButton.style.float = 'right';
                buttonContainer.appendChild(updateButton);

                // Update button logic
                updateButton.addEventListener('click', async () => {
                    const updatedValues = {};
                    let validationFailed = false;

                    fieldControls.forEach(control => {
                        const value = control.get_value();
                        if (control.df.reqd && !value) {
                            validationFailed = true;
                            frappe.msgprint({ message: `Field "${control.df.label}" is mandatory`, indicator: 'red' });
                        }
                        updatedValues[control.df.fieldname] = value;
                    });

                    if (validationFailed) return; // Stop if validation fails

                    try {
                        await frappe.db.set_value('Notes', noteName, updatedValues);
                        frappe.show_alert({ message: 'Note updated successfully', indicator: 'green' });

                        await render_note(frm, selector)
                        // Clear the form after update
                        dynamicContent.innerHTML = '';
                        dynamicContent.style.display = 'none';
                        defaultMessage.style.display = 'block';
                    } catch (err) {
                        frappe.show_alert({ message: `Error: ${err.message}`, indicator: 'red' });
                    }
                });

            } catch (err) {
                frappe.msgprint({ message: `Error: ${err.message}`, indicator: 'red' });
            }
        });
    });


    // ======================================== Create Note =========================================
    try {
        const { message: meta } = await frappe.call({
            method: 'mgrant.apis.api.get_doctype_meta',
            args: { doctype: 'Notes' }
        });

        if (!meta || !meta.fields) {
            frappe.show_alert({ message: 'Failed to fetch metadata', indicator: 'red' });
            return;
        }
        const frm = cur_frm;
        if (!frm) {
            frappe.msgprint('Form context not found.');
            return;
        }




        // Select the container where the form should be displayed
        const dynamicContent = document.getElementById('dynamic-content');
        const defaultMessage = document.getElementById('default-message');
        dynamicContent.style.display = 'block';
        defaultMessage.style.display = 'none';
        dynamicContent.innerHTML = ''; // Clear previous content

        // Prepare the container for the form fields
        const formContainer = document.createElement('div');
        formContainer.classList.add('form-container');
        dynamicContent.appendChild(formContainer);

        // Render each field using `frappe.ui.form.make_control`
        const fieldControls = [];
        meta.fields.forEach(f => {
            if (f.hidden) return; // Skip hidden fields

            const fieldWrapper = document.createElement('div');
            fieldWrapper.classList.add('my-control', 'mb-3');
            formContainer.appendChild(fieldWrapper);

            // Set default values for specific fields
            if (f.fieldname === 'reference_doctype') {
                f.default = frm.doc.doctype;
            }
            if (f.fieldname === 'related_to') {
                f.default = frm.doc.name;
                // Explicitly set options for the Dynamic Link field
                if (f.fieldtype === "Dynamic Link") {
                    // Set options dynamically based on your requirement
                    f.options = "Your Target Doctype"; // Example: "Customer"
                }
            }

            // Create control for each field
            const control = frappe.ui.form.make_control({
                parent: fieldWrapper,
                df: {
                    label: f.label || f.fieldname,
                    fieldname: f.fieldname,
                    fieldtype: f.fieldtype || 'Data',
                    options: f.fieldtype === 'Link' ? f.options : undefined, // Set options for Link field
                    // reqd: f.reqd || 0, // Mandatory field
                    default: f.default || '',
                    read_only: f.read_only || 0,
                    hidden: f.hidden || 0,
                    placeholder: f.placeholder || '',
                },
                render_input: true
            });
            $(control.label_area).remove()
            const formControl = control.wrapper.querySelector('.form-control');
            if (formControl) {
                formControl.style.backgroundColor = 'white';
                formControl.style.marginBottom = '0px';

                formControl.addEventListener('focus', () => {
                    formControl.style.backgroundColor = 'white';
                    formControl.style.boxShadow = 'none';
                    formControl.style.border = 'none';
                });

            }

            // Ensure options are set for Dynamic Link fields
            if (f.fieldtype === 'Dynamic Link' && f.options) {
                control.df.options = f.options; // Add options for Dynamic Link field
            }

            control.refresh();

            // Explicitly set default value if defined
            if (f.default) {
                control.set_value(f.default);
            }

            fieldControls.push(control);
        });

        // Add a submit button
        const submitButton = document.createElement('button');
        submitButton.classList.add('btn', 'btn-primary');
        submitButton.textContent = 'Save';
        submitButton.style.float = 'right'; // Add this line to float the button to the right
        submitButton.style.marginLeft = 'auto'; // Add this line to push the button to the right
        formContainer.appendChild(submitButton);

        // Add a clearfix after the button
        const clearfix = document.createElement('div');
        clearfix.style.clear = 'both';
        formContainer.appendChild(clearfix);

        // Handle the submit action
        submitButton.addEventListener('click', async () => {
            const newNoteValues = {};

            // Collect values from controls and validate mandatory fields
            let validationFailed = false;
            fieldControls.forEach(control => {
                const value = control.get_value();
                if (control.df.reqd && !value) {
                    validationFailed = true;
                    frappe.msgprint({ message: `Field "${control.df.label}" is mandatory`, indicator: 'red' });
                }
                newNoteValues[control.df.fieldname] = value;
            });

            if (validationFailed) return; // Stop if validation fails
            newNoteValues['reference_doctype'] = frm.doc.doctype;
            newNoteValues['related_to'] = frm.doc.name;

            // Insert the new document
            try {
                const { message } = await frappe.call({
                    method: 'frappe.client.insert',
                    args: { doc: { doctype: 'Notes', ...newNoteValues } }
                });

                if (message) {
                    frappe.show_alert({ message: 'Note Created Successfully', indicator: 'green' });
                    await render_note(frm, selector)
                    dynamicContent.innerHTML = ''; // Clear the form after creation
                    dynamicContent.style.display = 'none';
                    defaultMessage.style.display = 'block';
                }
            } catch (error) {
                frappe.show_alert({ message: `Error: ${error.message}`, indicator: 'red' });
            }
        });

    } catch (error) {
        frappe.msgprint({ message: `Error: ${error.message}`, indicator: 'red' });
    }

    // ======================================== Action Note ========================================
    document.querySelectorAll('#action_icon').forEach(button => {
        button.addEventListener('click', function (event) {
            event.stopPropagation();
            const dropdown = this.nextElementSibling;
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
    });


    // ======================================== Delete Note ========================================
    document.querySelectorAll('.delete_note').forEach(link => {
        link.addEventListener('click', async function (event) {
            event.preventDefault();
            event.stopPropagation();
            const doc_name = this.closest('.action-menu').querySelector('#action_icon').getAttribute('note_id');

            frappe.confirm(
                'Are you sure you want to delete this Note?',
                () => {
                    frappe.db.delete_doc('Notes', doc_name)
                        .then(async response => {
                            frappe.show_alert({ message: 'Note Delete successfully', indicator: 'green' });
                            await render_note(frm, selector);
                        })
                        .catch(error => {
                            console.error("Error deleting document", error);
                        });
                },
                () => {
                    console.log('Document deletion canceled');
                }
            );
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (event) {
        if (!event.target.matches('#action_icon')) {
            document.querySelectorAll('.action-menu-content').forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        }
    });
}

async function render_note(frm, selector) {
    await get_note_list(frm, selector);
}

