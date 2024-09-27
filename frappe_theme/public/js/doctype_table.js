
class DoctypeTable {
    constructor(wrapper, options) {
        this.wrapper = wrapper;
        this.doctype = options.doctype;
        this.filters = options?.filters || [];
        this.defaults = options?.defaults || {};
        this.frm = options.frm;
        this.fields = options?.fields || ['*'];
        this.setup();
    }

    setup() {
        this.make();
        this.get_data();
    }

    make() {
        this.wrapper.innerHTML = `
            <div id="create-form"></div>
            <table class="table table-bordered">
                <thead>
                    <tr>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
            <button class="btn btn-primary" id="create-record">Create New Record</button>`;
        this.bind_create_event();
    }

    bind_create_event() {
        const createBtn = this.wrapper.querySelector("#create-record");
        createBtn.addEventListener("click", () => {
            this.show_form('create');
        });
    }

    async show_form(mode, record = {}) {
        let formControls = {};
        const formContainer = this.wrapper.querySelector("#create-form");
        formContainer.innerHTML = '';
        let doctype = await frappe.db.get_doc("DocType", this.doctype);

        for (let field of doctype.fields) {
            if (this.defaults[field.fieldname]) {
                field.default = this.defaults[field.fieldname];
            }
            let control = frappe.ui.form.make_control({
                df: {
                    fieldname: field.fieldname,
                    label: field.label,
                    fieldtype: field.fieldtype,
                    options: field.options,
                    reqd: field.reqd,
                    default: field.default || '',
                    read_only: field.read_only,
                    hidden: field.hidden,
                },
                parent: formContainer,
                render_input: true,
            });

            formControls[field.fieldname] = control;
            formControls[field.fieldname].refresh();
        }
        // Add a submit button
        formContainer.innerHTML += `<button class="btn btn-success" id="submit-record">${mode === 'create' ? 'Create' : 'Update'} Record</button>`;

        // Handle submit event for create or update
        const submitBtn = formContainer.querySelector("#submit-record");
        submitBtn.addEventListener("click", () => {
            const newRecord = {};
            formContainer.querySelectorAll('.form-control').forEach(input => {
                const fieldname = input.getAttribute('data-fieldname');
                newRecord[fieldname] = input.value;
            });

            if (mode === 'create') {
                this.create(newRecord);
            } else if (mode === 'edit') {
                this.update(record.name, newRecord);
            }
        });
    }


    get_data() {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: this.doctype,
                fields: this.fields,
                filters: this.filters
            },
            callback: async (r) => {
                await this.render(r.message);
            }
        });
    }

    async render(data) {
        let thead = this.wrapper.querySelector('thead tr');
        let tbody = this.wrapper.querySelector('tbody');
        if (data.length > 0) {
            let fields = Object.keys(data[0]);

            // Clear previous headers
            thead.innerHTML = '';

            // Create headers with an additional action column
            fields.forEach(field => {
                thead.innerHTML += `<th>${field}</th>`;
            });
            thead.innerHTML += `<th>Actions</th>`;

            // Clear previous rows
            tbody.innerHTML = '';

            // Render data rows
            data.forEach(row => {
                let tr = document.createElement('tr');
                tr.setAttribute('id', row.name);
                fields.forEach(field => {
                    tr.innerHTML += `<td>${row[field]}</td>`;
                });

                // Add action buttons (Edit, Delete)
                tr.innerHTML += `
                    <td>
                        <button class="btn btn-sm btn-warning edit-record">Edit</button>
                        <button class="btn btn-sm btn-danger delete-record">Delete</button>
                    </td>`;
                tbody.appendChild(tr);

                // Bind edit and delete events
                tr.querySelector('.edit-record').addEventListener('click', () => this.show_form('edit', row));
                tr.querySelector('.delete-record').addEventListener('click', () => this.delete(row.name));
            });
        } else {
            console.log(`No Data for {${this.doctype}}`)
        }
    }

    refresh() {
        this.wrapper.innerHTML = '';
        this.setup();
    }

    set_filters(filters) {
        this.filters = filters;
        this.refresh();
    }

    set_fields(fields) {
        this.fields = fields;
        this.refresh();
    }

    set_doctype(doctype) {
        this.doctype = doctype;
        this.refresh();
    }

    // CRUD Operations
    create(record) {
        frappe.call({
            method: 'frappe.client.insert',
            args: {
                doc: {
                    doctype: this.doctype,
                    ...record
                }
            },
            callback: (r) => {
                if (r.message) {
                    frappe.msgprint("Record created successfully");
                    this.refresh();
                }
            }
        });
    }

    update(name, updatedRecord) {
        frappe.call({
            method: 'frappe.client.update',
            args: {
                doc: {
                    doctype: this.doctype,
                    name: name,
                    ...updatedRecord
                }
            },
            callback: (r) => {
                if (r.message) {
                    frappe.msgprint("Record updated successfully");
                    this.refresh();
                }
            }
        });
    }

    delete(name) {
        if (confirm("Are you sure you want to delete this record?")) {
            frappe.call({
                method: 'frappe.client.delete',
                args: {
                    doctype: this.doctype,
                    name: name
                },
                callback: (r) => {
                    if (r.message) {
                        frappe.msgprint("Record deleted successfully");
                        this.refresh();
                    }
                }
            });
        }
    }
}
