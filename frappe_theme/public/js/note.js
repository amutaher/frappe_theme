class NotesManager {
    constructor(frm, wrapper) {
        this.frm = frm;
        this.wrapper = this.setupWrapper(wrapper);
        this.noteList = [];
        this.initialize();
        return this.wrapper;
    }

    setupWrapper(wrapper) {
        // Clear any existing content
        wrapper.innerHTML = '';

        // Create notes wrapper
        const notesWrapper = document.createElement('div');
        notesWrapper.id = 'notes-wrapper';

        // Add loading placeholder
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'notes-loading';
        loadingDiv.style.display = 'none';
        loadingDiv.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 200px;">
                <div class="loading-spinner"></div>
            </div>
        `;
        notesWrapper.appendChild(loadingDiv);

        wrapper.appendChild(notesWrapper);
        this.notes_wrapper = notesWrapper; // Store reference to notes wrapper
        return wrapper;
    }

    showLoading(show = true) {
        const loadingElement = this.notes_wrapper.querySelector('#notes-loading');
        if (loadingElement) {
            loadingElement.style.display = show ? 'block' : 'none';
        }
    }

    async initialize() {
        this.showLoading(true);
        try {
            await this.fetchNotes();
            this.renderLayout();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing NotesManager:', error);
            this.notes_wrapper.innerHTML = `
                <div class="note_message">Error loading notes. Please refresh the page.</div>
            `;
        } finally {
            this.showLoading(false);
        }
    }

    async fetchNotes() {
        const response = await frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Notes',
                fields: ['*'],
                filters: {
                    'reference_doctype': this.frm.doc.doctype,
                    'related_to': this.frm.doc.name
                },
                limit_page_length: 10000,
            },
        });
        this.noteList = response.message;
    }

    renderLayout() {
        // Add styles
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            * {
                margin: 0px;
                padding: 0px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                box-sizing: border-box;
            }
            .note_content {
                width: 100%;
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
                top: 7px;
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
                font-weight: normal;
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
            .frappe-control .ql-editor:not(.read-mode) {
                min-height: 100px;
                height: 36px;
                background-color: #fff;
                border: none;
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
            .notes-container {
                width: 100%;
                height: 100%;
            }
            .form-section {
                width: 100%;
                padding: 20px;
                background: #fff;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            .list-section {
                width: 100%;
                padding: 20px;
                background: #fff;
                border-radius: 8px;
            }
            .form-title {
                font-size: 18px;
                font-weight: normal;
                margin-bottom: 20px;
                color: #1F272E;
            }
        `;
        document.head.appendChild(styleElement);

        // Create main layout
        this.wrapper.innerHTML = `
            <div class="notes-container">
                <div class="form-section">
                    <div id="create-form"></div>
                </div>
                <div class="list-section">
                    <div class="title_links">
                        ${this.renderNotesList()}
                    </div>
                </div>
            </div>
        `;

        // Initialize create form
        this.createNoteForm();
    }

    renderNotesList() {
        const groupedData = this.groupNotesByDate();

        if (Object.values(groupedData).every(group => group.length === 0)) {
            return '<div class="note_message">You haven\'t created a Record yet</div>';
        }

        return Object.entries(groupedData)
            .filter(([_, notes]) => notes.length > 0)
            .map(([groupName, notes]) => `
                <div class="note-group">
                    <p class="group-title">${groupName}</p>
                    ${notes.map(note => this.createNoteItemHTML(note)).join('')}
                </div>
            `).join('');
    }

    groupNotesByDate() {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const formatDate = date => new Date(date).toISOString().split('T')[0];
        return this.noteList.reduce((groups, note) => {
            const creationDate = formatDate(note.creation);
            if (creationDate === formatDate(today)) {
                groups.Today.unshift(note);
            } else if (creationDate === formatDate(yesterday)) {
                groups.Yesterday.push(note);
            } else {
                groups.Older.push(note);
            }
            return groups;
        }, { Today: [], Yesterday: [], Older: [] });
    }

    createNoteItemHTML(note) {
        return `
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
                    <span>${this.timeAgo(note.creation)}</span>
                </div>
            </div>
        `;
    }

    timeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
            }
        }
        return 'just now';
    }

    setupEventListeners() {
        // Action menu listeners
        this.wrapper.querySelectorAll('#action_icon').forEach(button => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const dropdown = button.nextElementSibling;
                dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
            });
        });

        // Edit note listeners
        this.wrapper.querySelectorAll('.edit_note').forEach(link => {
            link.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const noteName = link.closest('.note-item')
                    .querySelector('#action_icon')
                    .getAttribute('note_id');
                await this.handleEditNote(noteName);
            });
        });

        // Delete note listeners
        this.wrapper.querySelectorAll('.delete_note').forEach(link => {
            link.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                const noteName = link.closest('.action-menu')
                    .querySelector('#action_icon')
                    .getAttribute('note_id');
                await this.handleDeleteNote(noteName);
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (event) => {
            if (!event.target.matches('#action_icon')) {
                this.wrapper.querySelectorAll('.action-menu-content').forEach(dropdown => {
                    dropdown.style.display = 'none';
                });
            }
        });
    }

    async handleEditNote(noteName) {
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

            // Clear and use the create form container for editing
            const formContainer = this.wrapper.querySelector('#create-form');
            formContainer.innerHTML = ''; // Clear existing form

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
                $(control.label_area).remove();

                const formControl = control.wrapper.querySelector('.form-control');
                if (formControl) {
                    formControl.style.backgroundColor = 'white';
                    formControl.style.marginBottom = '0px';
                    formControl.style.border = 'none';

                    formControl.addEventListener('focus', () => {
                        formControl.style.backgroundColor = 'white';
                        formControl.style.boxShadow = 'none';
                        formControl.style.border = 'none';
                    });
                }

                control.refresh();

                if (latestNote[f.fieldname]) {
                    control.set_value(latestNote[f.fieldname]);
                }

                fieldControls.push(control);
            });

            // Add button container
            const buttonContainer = document.createElement('div');
            buttonContainer.classList.add('button-container', 'pb-4');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'flex-end';
            buttonContainer.style.gap = '10px';
            formContainer.appendChild(buttonContainer);

            // Add cancel button
            const cancelButton = document.createElement('button');
            cancelButton.classList.add('btn', 'btn-secondary');
            cancelButton.textContent = 'Cancel';
            buttonContainer.appendChild(cancelButton);

            // Add update button
            const updateButton = document.createElement('button');
            updateButton.classList.add('btn', 'btn-primary');
            updateButton.textContent = 'Update';
            buttonContainer.appendChild(updateButton);

            // Cancel button handler
            cancelButton.addEventListener('click', async () => {
                // Reset form to create mode
                formContainer.innerHTML = '';
                this.createNoteForm();
            });

            // Update button handler
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

                if (validationFailed) return;

                try {
                    await frappe.db.set_value('Notes', noteName, updatedValues);
                    frappe.show_alert({ message: 'Note updated successfully', indicator: 'green' });

                    // Refresh notes list
                    await this.fetchNotes();
                    const listSection = this.wrapper.querySelector('.title_links');
                    listSection.innerHTML = this.renderNotesList();
                    this.setupEventListeners();

                    // Reset form to create mode
                    formContainer.innerHTML = '';
                    this.createNoteForm();
                } catch (err) {
                    frappe.show_alert({ message: `Error: ${err.message}`, indicator: 'red' });
                }
            });

        } catch (err) {
            frappe.msgprint({ message: `Error: ${err.message}`, indicator: 'red' });
        }
    }

    async handleDeleteNote(noteName) {
        frappe.confirm('Are you sure you want to delete this Note?',
            async () => {
                try {
                    await frappe.db.delete_doc('Notes', noteName);
                    frappe.show_alert({ message: 'Note deleted successfully', indicator: 'green' });
                    await this.fetchNotes();
                    const listSection = this.wrapper.querySelector('.title_links');
                    listSection.innerHTML = this.renderNotesList();
                    this.setupEventListeners();
                } catch (error) {
                    frappe.show_alert({ message: `Error: ${error.message}`, indicator: 'red' });
                }
            }
        );
    }

    async createNoteForm() {
        try {
            const { message: meta } = await frappe.call({
                method: 'mgrant.apis.api.get_doctype_meta',
                args: { doctype: 'Notes' }
            });

            if (!meta || !meta.fields) {
                frappe.show_alert({ message: 'Failed to fetch metadata', indicator: 'red' });
                return;
            }

            const formContainer = this.wrapper.querySelector('#create-form');
            const fieldControls = [];

            meta.fields.forEach(f => {
                if (f.hidden) return;

                const fieldWrapper = document.createElement('div');
                fieldWrapper.classList.add('my-control', 'mb-3');
                formContainer.appendChild(fieldWrapper);

                if (f.fieldname === 'reference_doctype') {
                    f.default = this.frm.doc.doctype;
                }
                if (f.fieldname === 'related_to') {
                    f.default = this.frm.doc.name;
                    if (f.fieldtype === "Dynamic Link") {
                        f.options = "Your Target Doctype";
                    }
                }

                const control = frappe.ui.form.make_control({
                    parent: fieldWrapper,
                    df: {
                        label: f.label || f.fieldname,
                        fieldname: f.fieldname,
                        fieldtype: f.fieldtype || 'Data',
                        options: f.fieldtype === 'Link' ? f.options : undefined,
                        default: f.default || '',
                        read_only: f.read_only || 0,
                        hidden: f.hidden || 0,
                        placeholder: f.placeholder || '',
                    },
                    render_input: true
                });
                $(control.label_area).remove();

                const formControl = control.wrapper.querySelector('.form-control');
                if (formControl) {
                    formControl.style.backgroundColor = 'white';
                    formControl.style.marginBottom = '0px';
                    formControl.style.border = 'none';

                    formControl.addEventListener('focus', () => {
                        formControl.style.backgroundColor = 'white';
                        formControl.style.boxShadow = 'none';
                        formControl.style.border = 'none';
                    });
                }

                if (f.fieldtype === 'Dynamic Link' && f.options) {
                    control.df.options = f.options;
                }

                control.refresh();

                if (f.default) {
                    control.set_value(f.default);
                }

                fieldControls.push(control);
            });

            const submitButton = document.createElement('button');
            submitButton.classList.add('btn', 'btn-primary');
            submitButton.textContent = 'Save';
            submitButton.style.float = 'right';
            submitButton.style.marginLeft = 'auto';
            formContainer.appendChild(submitButton);

            const clearfix = document.createElement('div');
            clearfix.style.clear = 'both';
            formContainer.appendChild(clearfix);

            submitButton.addEventListener('click', async () => {
                const newNoteValues = {};
                let validationFailed = false;

                fieldControls.forEach(control => {
                    const value = control.get_value();
                    if (control.df.reqd && !value) {
                        validationFailed = true;
                        frappe.msgprint({ message: `Field "${control.df.label}" is mandatory`, indicator: 'red' });
                    }
                    newNoteValues[control.df.fieldname] = value;
                });

                if (validationFailed) return;

                newNoteValues['reference_doctype'] = this.frm.doc.doctype;
                newNoteValues['related_to'] = this.frm.doc.name;

                try {
                    const { message } = await frappe.call({
                        method: 'frappe.client.insert',
                        args: { doc: { doctype: 'Notes', ...newNoteValues } }
                    });

                    if (message) {
                        frappe.show_alert({ message: 'Note Created Successfully', indicator: 'green' });

                        // Clear form fields except reference fields
                        fieldControls.forEach(control => {
                            if (!['reference_doctype', 'related_to'].includes(control.df.fieldname)) {
                                control.set_value('');
                            }
                        });

                        // Refresh notes list
                        await this.fetchNotes();
                        const listSection = this.wrapper.querySelector('.title_links');
                        listSection.innerHTML = this.renderNotesList();
                        this.setupEventListeners();
                    }
                } catch (error) {
                    frappe.show_alert({ message: `Error: ${error.message}`, indicator: 'red' });
                }
            });

        } catch (error) {
            frappe.msgprint({ message: `Error: ${error.message}`, indicator: 'red' });
        }
    }
}

// Usage in form field
function render_note(frm, wrapper) {
    try {
        return new NotesManager(frm, wrapper);
    } catch (error) {
        console.error('Error rendering notes:', error);
        wrapper.innerHTML = `
            <div class="note_message">Error initializing notes. Please refresh the page.</div>
        `;
        return wrapper;
    }
}