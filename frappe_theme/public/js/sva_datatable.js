class SvaDataTable {
    /**
     * Constructor for initializing the table with provided options.
     *
     * @param {Object} params - Configuration parameters for the table.
     * @param {HTMLElement} params.wrapper - The wrapper element to contain the table.
     * @param {Array} params.columns - Array of column definitions.
     * @param {Array} params.rows - Array of row data.
     * @param {Object} params.options - Additional options for table configuration.
     * @param {Object} params.frm - Form object related to the table.
     * @param {string} params.cdtfname - Field name for the child table.
     * @param {Object} params.options - Options to customize the table behavior and appearance.
     * @param {boolean} params.options.serialNumberColumn - Whether to include a serial number column in the table.
     * @param {Object} params.options.defaultSort - Default sorting configuration for the table.
     * @param {string} params.options.defaultSort.column - Default column to sort by.
     * @param {string} params.options.defaultSort.direction - Default sorting direction ('asc' or 'desc').
     * @param {number} params.options.freezeColumnsAtLeft - Number of columns to freeze on the left side of the table.
     * @param {number} params.options.pageLimit - Limit for the number of rows per page.
     * @param {boolean} params.options.editable - Whether the table rows are editable.
     * @param {Object} params.options.style - Inline styles to apply to the table.
     * @param {string} params.options.style.width - Width of the table (e.g., '100%').
     * @param {string} params.options.style.height - Height of the table (e.g., '700px').
     * @param {Array<string>} params.options.additionalTableHeader - Additional HTML table headers to be added.
     */

    constructor({ wrapper, columns, rows, options, frm, cdtfname, doctype, crud = false }) {
        this.rows = rows;
        this.columns = columns;
        this.options = options;
        this.currentSort = this?.options?.defaultSort || null; // Track sort state
        this.frm = frm;
        this.crud = crud;
        this.doctype = doctype;
        this.childTableFieldName = cdtfname;
        this.uniqueness = this.options?.uniqueness || { row: [], column: [] };
        this.wrapper = this.setupWrapper(wrapper, this.crud);
        this.table = this.createTable(this.crud);
        if (!this.wrapper.querySelector('table')) {
            this.wrapper.appendChild(this.table);
        }
        this.tBody = this.table.querySelector('tbody');
        return this.wrapper;
    }

    setupWrapper(wrapper, crud) {
        if (crud) {
            if (!wrapper.querySelector('button#create')) {
                const create_button = document.createElement('button');
                create_button.id = 'create';
                create_button.textContent = "Create";
                create_button.classList.add('btn', 'btn-primary');
                create_button.style = 'margin-bottom:20px;float:right;margin-right:10px;';
                create_button.addEventListener('click', async () => {
                    await this.createFormDialog(this.doctype);
                });
                wrapper.appendChild(create_button);
            }
        }
        wrapper.style = `max-width:${this.options?.style?.width || '100%'}; width:${this.options?.style?.width || '100%'};max-height:${this.options?.style?.height || '500px'}; height:${this.options?.style?.height || 'auto'};margin:0; padding:0;box-sizing:border-box; overflow:auto;scroll-behavior:smooth;margin-bottom:20px;`;
        return wrapper;
    }

    async createFormDialog(doctype, name = undefined) {
        let res = await frappe.call('frappe_theme.api.get_doctype_fields',{doctype:this.doctype});
        let dt = res?.message;
        if (name) {
            let doc = await frappe.db.get_doc(doctype, name);
            if (this.frm) {
                dt.fields.forEach(f => {
                    if (this.frm.doctype == f.options) {
                        f.default = this.frm.doc.name;
                        f.read_only = 1;
                    } else if (doc[f.fieldname]) {
                        f.default = doc[f.fieldname];
                    }
                });
            } else {
                dt.fields.forEach(f => {
                    if (doc[f.fieldname]) {
                        f.default = doc[f.fieldname];
                    }
                });
            }
        } else {
            dt.fields.forEach(f => {
                if (this.frm.doctype == f.options) {
                    f.default = this.frm.doc.name;
                    f.read_only = 1;
                }
            });
        }
        const dialog = new frappe.ui.Dialog({
            title: `Create ${doctype}`,
            fields: dt?.fields || [],
            primary_action_label: name ? 'Update' : 'Create',
            primary_action: async (values) => {
                if (!name) {
                    let response = await frappe.xcall('frappe.client.insert', {
                        doc: {
                            doctype: doctype,
                            ...values
                        }
                    });
                    if (response) {
                        this.rows.push(response);
                        this.updateTableBody();
                    }
                } else {
                    let response = await frappe.xcall('frappe.client.set_value', { doctype, name, fieldname: values });
                    if (response) {
                        let rowIndex = this.rows.findIndex(r => r.name === name);
                        this.rows[rowIndex] = response;
                        this.updateTableBody();
                    }
                }
                dialog.clear();
                dialog.hide();
            },
            secondary_action_label: 'Cancel',
            secondary_action: () => {
                dialog.clear();
                dialog.hide();
            }
        });
        dialog.show();
    }
    async deleteRecord(doctype, name) {
        frappe.confirm(`Are you sure you want to delete this ${doctype}?`, async () => {
            await frappe.xcall('frappe.client.delete', { doctype, name });
            let rowIndex = this.rows.findIndex(r => r.name === name);
            console.log(rowIndex, 'rowIndex');
            this.rows.splice(rowIndex, 1);
            this.updateTableBody();
        });
    }
    createTable(crud) {
        const table = document.createElement('table');
        table.classList.add('table', 'table-bordered');
        table.style = 'width:100%; font-size:13px; margin-top:0px !important; position:relative;';
        table.appendChild(this.createTableHead(crud));
        table.appendChild(this.createTableBody(crud));
        return table;
    }

    createTableHead(crud) {
        const thead = document.createElement('thead');
        if (this.options?.additionalTableHeader) {
            thead.innerHTML = this.options?.additionalTableHeader?.join('') || '';
        }
        thead.style = `
            color:${this.options?.style?.tableHeader?.color || 'black'};
            font-size:${this.options?.style?.tableHeader?.fontSize || '12px'};
            font-weight:${this.options?.style?.tableHeader?.fontWeight || 'normal'};
            position:sticky; top: 0px; background-color:#F3F3F3; 
            text-align:center; z-index:3; font-weight:200 !important;`
            ;
        const tr = document.createElement('tr');

        if (this.options.serialNumberColumn) {
            const serialTh = document.createElement('th');
            serialTh.style = 'width:40px';
            tr.appendChild(serialTh);
        }

        let left = 0;
        let freezeColumnsAtLeft = 1;

        this.columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.name || column.label;

            if (column.sortable) {
                this.createSortingIcon(th, column); // Create the sorting dropdown
                th.style = 'cursor:pointer'; // Add pointer cursor to indicate clickable
            }

            if (this.options.freezeColumnsAtLeft && this.options.freezeColumnsAtLeft >= freezeColumnsAtLeft) {
                th.style = `position:sticky; left:${left}px; z-index:2; background-color:#F3F3F3;cursor:${column.sortable ? 'pointer' : 'default'}`;
                left += column.width;
                freezeColumnsAtLeft++;
            }

            tr.appendChild(th);
        });

        if (crud) {
            const action_th = document.createElement('th');
            action_th.style.width = '30px';
            // action_th.textContent = "Actions";
            tr.appendChild(action_th);
        }
        thead.appendChild(tr);
        return thead;
    }

    createSortingIcon(th, column) {
        const sortIcon = document.createElement('span');
        sortIcon.className = 'sort-icon';
        sortIcon.style = 'margin-left:5px; cursor:pointer;';
        sortIcon.innerHTML = (this?.currentSort?.direction == 'desc' && this?.currentSort?.column == column.fieldname) ? '&darr;' : '&uarr;';  // Default icon (up arrow)
        th.appendChild(sortIcon);

        // Attach click event to toggle sorting direction and update the icon
        th.addEventListener('click', () => {
            const direction = this.currentSort.column === column.fieldname && this.currentSort.direction === 'asc' ? 'desc' : 'asc';
            this.sortByColumn(column, direction);

            if (direction === 'asc') {
                sortIcon.innerHTML = '&uarr;'; // Up arrow for ascending
            } else {
                sortIcon.innerHTML = '&darr;'; // Down arrow for descending
            }
        });
    }

    createTableBody(crud) {
        const tbody = document.createElement('tbody');
        this.tBody = tbody;
        let rowIndex = 0;
        const batchSize = this.options?.pageLimit || 30;
        tbody.style = `
            font-size:${this.options?.style?.tableBody?.fontSize || '12px'};
            font-weight:${this.options?.style?.tableBody?.fontWeight || 'normal'};
            color:${this.options?.style?.tableBody?.color || 'black'};
            background-color:${this.options?.style?.tableBody?.backgroundColor || 'transparent'};`
            ;
        if (this.currentSort) {
            this.sortByColumn(this.currentSort.column, this.currentSort.direction, false);
        }
        const renderBatch = () => {
            for (let i = 0; i < batchSize && rowIndex < this.rows.length; i++) {
                const row = this.rows[rowIndex];
                row.rowIndex = rowIndex;
                const tr = document.createElement('tr');
                let primaryKey = row?.name || row?.rowIndex || rowIndex?.id || rowIndex;
                tr.style = 'max-height:25px !important; height:25px !important;';

                if (this.options.serialNumberColumn) {
                    const serialTd = document.createElement('td');
                    serialTd.style = 'min-width:40px; text-align:center;';
                    serialTd.textContent = rowIndex + 1;
                    tr.appendChild(serialTd);
                }

                let left = 0;
                let freezeColumnsAtLeft = 1;

                this.columns.forEach((column) => {
                    const td = document.createElement('td');
                    td.style = this.getCellStyle(column, freezeColumnsAtLeft, left);

                    if (this.options.freezeColumnsAtLeft >= freezeColumnsAtLeft) {
                        left += column.width;
                        freezeColumnsAtLeft++;
                    }

                    td.textContent = row[column.fieldname] || "";
                    if (this.options.editable) {
                        this.createEditableField(td, column, row);
                    } else {
                        this.createNonEditableField(td, column, row);
                    }
                    tr.appendChild(td);
                });

                if (crud) {
                    const action_td = document.createElement('td');
                    action_td.style = 'min-width:100px; text-align:center;';

                    // Create dropdown for actions
                    const dropdown = document.createElement('div');
                    dropdown.classList.add('dropdown');

                    const dropdownBtn = document.createElement('span');
                    dropdownBtn.classList.add('h4');
                    dropdownBtn.style = 'cursor:pointer;';
                    dropdownBtn.setAttribute('data-toggle', 'dropdown');
                    dropdownBtn.innerHTML = "&#8942;";

                    const dropdownMenu = document.createElement('div');
                    dropdownMenu.classList.add('dropdown-menu');

                    const editOption = document.createElement('a');
                    editOption.classList.add('dropdown-item');
                    editOption.textContent = "Edit";
                    editOption.addEventListener('click', async () => {
                        await this.createFormDialog(this.doctype, primaryKey);
                    });

                    const deleteOption = document.createElement('a');
                    deleteOption.classList.add('dropdown-item');
                    deleteOption.textContent = "Delete";
                    deleteOption.addEventListener('click', async () => {
                        await this.deleteRecord(this.doctype, primaryKey);
                    });
                    frappe.call('frappe_theme.api.get_doctype_fields',{doctype:this.doctype}).then(response => {
                        let doctypeInfo = response?.message;
                        if (doctypeInfo?.links?.length) {
                            doctypeInfo.links.forEach(link => {
                                const linkOption = document.createElement('a');
                                linkOption.classList.add('dropdown-item');
                                linkOption.textContent = link.link_doctype;
                                linkOption.addEventListener('click', async () => {
                                    await this.childTableDialog(link.link_doctype, link.link_fieldname, primaryKey);
                                });
                                dropdownMenu.appendChild(linkOption);
                            });
                        }
                    });
                    dropdownMenu.appendChild(editOption);
                    dropdownMenu.appendChild(deleteOption);
                    dropdown.appendChild(dropdownBtn);
                    dropdown.appendChild(dropdownMenu);
                    action_td.appendChild(dropdown);

                    tr.appendChild(action_td);
                }

                this.tBody.appendChild(tr);
                rowIndex++;
            }
        };

        const handleScroll = () => {
            const scrollTop = this.wrapper.scrollTop;

            if (scrollTop > this.lastScrollTop) {
                if (this.wrapper.scrollTop + this.wrapper.clientHeight >= this.wrapper.scrollHeight) {
                    renderBatch();
                }
            }
            this.lastScrollTop = scrollTop;
        };

        this.wrapper.addEventListener('scroll', handleScroll);
        renderBatch();
        return tbody;
    }

    async childTableDialog(doctype, primaryKey, primaryKeyValue) {
        const dialog = new frappe.ui.Dialog({
            title: doctype,
            fields: [{
                fieldname: 'table',
                fieldtype: 'HTML',
                options: `<div id="${doctype?.split(' ').length > 1 ? doctype?.split(' ')?.join('-')?.toLowerCase() : doctype.toLowerCase()}"></div>`,
            }],
        });
        dialog.show();
        let settings = await this.getViewSettings(doctype);
        if (settings?.fields) {
            let fields = JSON.parse(settings.fields);
            let rows = await this.getDocList(doctype, [
                [doctype, primaryKey, '=', primaryKeyValue]
            ], fields.map(e => e.fieldname))

            let datatable = new SvaDataTable({
                wrapper: dialog.body.querySelector(`#${doctype?.split(' ').length > 1 ? doctype?.split(' ')?.join('-')?.toLowerCase() : doctype.toLowerCase()}`), // Wrapper element
                columns: fields,
                rows: rows,
                doctype: doctype,
                crud: true,
                frm: { doctype: this.doctype, doc: { name: primaryKeyValue } },
                options: {
                    serialNumberColumn: true,
                    editable: false,
                }
            });
        }
    }

    sortByColumn(column, direction, updateTable = true) {
        const columnName = column.fieldname || column;
        let sorted_rows = this.rows.sort((a, b) => {
            const valueA = a[columnName];
            const valueB = b[columnName];
            if (valueA === valueB) return 0;
            if (Number.isInteger(parseFloat(valueA)) && Number.isInteger(parseFloat(valueB))) {
                return direction === 'asc' ? Number(valueA) - Number(valueB) : Number(valueB) - Number(valueA);
            }
            if (direction === 'asc') {
                return valueA > valueB ? 1 : -1;
            } else {
                return valueA < valueB ? 1 : -1;
            }
        });

        this.currentSort = { column: columnName, direction };
        if (updateTable) {
            this.updateTableBody();
        } else {
            return sorted_rows;
        }
    }

    updateTableBody() {
        const oldTbody = this.table.querySelector('tbody');
        const newTbody = this.createTableBody(this.crud);
        this.table.replaceChild(newTbody, oldTbody); // Replace old tbody with new sorted tbody
    }

    getCellStyle(column, freezeColumnsAtLeft, left) {
        return this.options.freezeColumnsAtLeft >= freezeColumnsAtLeft
            ? `position:sticky; left:${left}px; z-index:2; background-color:white; min-width:${column.width}px; max-width:${column.width}px; padding:0px`
            : `min-width:${column.width}px; max-width:${column.width}px; padding:0px;`;
    }

    createEditableField(td, column, row) {
        const frm = this.frm;
        const childTableFieldName = this.childTableFieldName;
        td.textContent = "";

        let columnField = {
            ...column,
            onchange: function () {
                let changedValue = control.get_input_value();
                if (column.fieldtype === 'Percent') {
                    changedValue = parseFloat(changedValue);
                }
                if (row[column.fieldname] !== changedValue) {
                    let rowIndex = frm.doc[childTableFieldName].findIndex(r => r.name === row.name);
                    frm.doc[childTableFieldName][rowIndex][column.fieldname] = control.get_input_value();
                    frm.dirty();
                }
            }
        };

        columnField.get_query = () => {
            const filters = []
            if (column.additional_filters) {
                filters.push(...column.additional_filters);
            }
            if (column.link_filter) {
                const [parentfield, filter_key] = column.link_filter.split("->");
                let rowIndex = frm.doc[childTableFieldName].findIndex(r => r.name === row.name);
                filters.push([
                    column.options, filter_key, '=', frm.doc[childTableFieldName][rowIndex][parentfield]
                ])
            }
            if (column.doc_link_filters) {
                filters.push(...JSON.parse(column.doc_link_filters));
            }
            let keys = this.uniqueness?.row?.find(r => r.includes(column.fieldname));
            if (keys) {
                let rowIndex = frm.doc[childTableFieldName].findIndex(r => r.name === row.name);
                let _row = frm.doc[childTableFieldName][rowIndex]
                filters.push([
                    column.options,
                    'name',
                    'not in',
                    keys.map(k => _row[k]).filter(k => (k && k != columnField.fieldname))
                ]);
            }
            return { filters }
        };

        const control = frappe.ui.form.make_control({
            parent: td,
            df: columnField,
            render_input: true,
            only_input: true,
        });

        $(control.input).css({ width: '100%', height: '35px', backgroundColor: 'white', margin: '0px', boxShadow: 'none' });
        if (row[column.fieldname]) {
            control.set_value(row[column.fieldname]);
        }
        control.refresh();
    }

    createNonEditableField(td, column, row) {
        td.textContent = "";
        let columnField = {
            ...column,
            read_only: 1
        };
        if (columnField.fieldtype === 'Link') {
            const control = frappe.ui.form.make_control({
                parent: td,
                df: columnField,
                render_input: true,
                only_input: true,
            });
            $(control.input).css({ width: '100%', height: '35px', backgroundColor: 'white', margin: '0px', boxShadow: 'none' });
            if (row[column.fieldname]) {
                control.set_value(row[column.fieldname]);
            }
            control.refresh();
        } else {
            td.textContent = row[column.fieldname] || "";
            $(td).css({ height: '35px', padding: "6px 10px" });
        }
    }
    getDocList(doctype, filters, fields = ['*']) {
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype,
                    filters,
                    fields
                },
                callback: function (response) {
                    resolve(response.message);
                },
                error: (err) => {
                    reject(err)
                }
            });
        })
    }

    getViewSettings(doctype) {
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "frappe.desk.listview.get_list_settings",
                args: { doctype: doctype },
                callback: function (response) {
                    resolve(response.message)
                },
                error: (err) => {
                    reject(err)
                }
            });
        });
    }
}

