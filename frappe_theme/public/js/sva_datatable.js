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
        this.wrapper = this.setupWrapper(wrapper);
        this.uniqueness = this.options?.uniqueness || { row: [], column: [] };
        this.noDataFound = this.createNoDataFoundPage();
        this.table_wrapper = document.createElement('div');
        this.table_wrapper.id = 'table_wrapper';
        this.table = this.createTable(this.crud);
        if (!this.table_wrapper.querySelector('table')) {
            this.table_wrapper.appendChild(this.table);
        }
        this.table_wrapper = this.setupTableWrapper(this.table_wrapper, this.crud);
        if (!this.wrapper.querySelector('#table_wrapper')) {
            this.wrapper.appendChild(this.table_wrapper);
        }
        this.setupCreateButton(this.wrapper, this.crud);
        this.tBody = this.table.querySelector('tbody');
        return this.wrapper;
    }

    setupWrapper(wrapper) {
        wrapper.style = `max-width:${this.options?.style?.width || '100%'}; width:${this.options?.style?.width || '100%'};max-height:${this.options?.style?.height || '500px'}; height:${this.options?.style?.height || '500px'};`;
        return wrapper;
    }
    setupTableWrapper(tableWrapper) {
        tableWrapper.style = `max-width:${this.options?.style?.width || '100%'}; width:${this.options?.style?.width || '100%'};max-height:90%;min-height:110px;margin:0; padding:0;box-sizing:border-box; overflow:auto;scroll-behavior:smooth;`;
        return tableWrapper;
    }
    async setupCreateButton(wrapper, crud) {
        if (crud) {
            if (!wrapper.querySelector('button#create')) {
                const create_button = document.createElement('button');
                create_button.id = 'create';
                create_button.textContent = "Create";
                create_button.classList.add('btn', 'btn-primary');
                create_button.style = 'width:fit-content;margin-top:10px;margin-bottom:5px;';
                create_button.addEventListener('click', async () => {
                    await this.createFormDialog(this.doctype);
                });
                let perms = await this.get_permissions(this.doctype);
                if (perms.length && perms.includes('create')) {
                    wrapper.appendChild(create_button);
                }
            }
        }
    }
    async get_permissions(doctype) {
        if (!this.crud) {
            return [];
        }
        let res = await frappe.call({
            method: 'frappe_theme.api.get_permissions',
            args: { doctype },
            callback: function (response) {
                return response.message
            },
            error: (err) => {
                console.error(err);
            }
        });
        return res?.message ?? [];
    }

    async createFormDialog(doctype, name = undefined) {
        let res = await frappe.call('frappe_theme.api.get_meta_fields', { doctype: this.doctype });
        let fields = res?.message;
        if (name) {
            let doc = await frappe.db.get_doc(doctype, name);
            fields.forEach(async f => {
                if (doc[f.fieldname]) {
                    f.default = doc[f.fieldname];
                }
            })
        } else {
            await fields.forEach(async f => {
                if (this.frm.parentRow) {
                    if (this.frm.parentRow[f.fieldname]) {
                        f.default = this.frm.parentRow[f.fieldname];
                        f.read_only = 1;
                    }
                }
                if (this.frm.doctype == f.options) {
                    f.default = this.frm.doc.name;
                    f.read_only = 1;
                }
                if (f.fieldtype === 'Link') {
                    f.get_query = () => {
                        const filters = []
                        if (this.uniqueness.column.length) {
                            if (this.uniqueness.column.includes(f.fieldname)) {
                                let existing_options = this.rows?.map((item) => { return item[f.fieldname] })
                                filters.push([f.options, 'name', 'not in', existing_options])
                            }
                        }
                        if (f.link_filter) {
                            const [parentfield, filter_key] = f.link_filter.split("->");
                            filters.push([
                                f.options, filter_key, '=', dialog.fields_dict[parentfield]?.value || `Please select ${parentfield}`
                            ])
                        }
                        return { filters }
                    }
                }
            })
        }
        const dialog = new frappe.ui.Dialog({
            title: `Create ${doctype}`,
            fields: fields || [],
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
                    let response = await frappe.xcall('frappe.client.set_value', { doctype: doctype, name, fieldname: values });
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
            th.textContent = column.label || column.name;

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
        th.addEventListener('click', () => {
            const direction = this.currentSort?.column === column.fieldname && this.currentSort?.direction === 'asc' ? 'desc' : 'asc';
            this.sortByColumn(column, direction);
            if (direction === 'asc') {
                sortIcon.innerHTML = '&uarr;'; // Up arrow for ascending
            } else {
                sortIcon.innerHTML = '&darr;'; // Down arrow for descending
            }
        });
    }

    createTableBody(crud) {
        if (this.rows.length === 0) {
            return this.noDataFound;
        }
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
        const renderBatch = async () => {
            let perms = await this.get_permissions(this.doctype);
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
                    const dropdown = document.createElement('div');
                    dropdown.classList.add('dropdown');

                    const dropdownBtn = document.createElement('span');
                    dropdownBtn.classList.add('h4');
                    dropdownBtn.style = 'cursor:pointer;';
                    dropdownBtn.setAttribute('data-toggle', 'dropdown');
                    dropdownBtn.innerHTML = "&#8942;";

                    const dropdownMenu = document.createElement('div');
                    dropdownMenu.classList.add('dropdown-menu');

                    if (perms.length && perms.includes('write')) {
                        const editOption = document.createElement('a');
                        editOption.classList.add('dropdown-item');
                        editOption.textContent = "Edit";
                        editOption.addEventListener('click', async () => {
                            await this.createFormDialog(this.doctype, primaryKey);
                        });
                        dropdownMenu.appendChild(editOption);
                    }
                    if (perms.length && perms.includes('delete')) {
                        const deleteOption = document.createElement('a');
                        deleteOption.classList.add('dropdown-item');
                        deleteOption.textContent = "Delete";
                        deleteOption.addEventListener('click', async () => {
                            await this.deleteRecord(this.doctype, primaryKey);
                        });
                        dropdownMenu.appendChild(deleteOption);
                    }
                    frappe.call('frappe_theme.api.get_doctype_fields', { doctype: this.doctype }).then(response => {
                        let doctypeInfo = response?.message;
                        if (doctypeInfo?.links?.length) {
                            doctypeInfo.links.forEach(async link => {
                                const linkOption = document.createElement('a');
                                linkOption.classList.add('dropdown-item');
                                linkOption.textContent = link.link_doctype;
                                linkOption.addEventListener('click', async () => {
                                    await this.childTableDialog(link.link_doctype, link.link_fieldname, primaryKey, row);
                                });
                                let perms = await this.get_permissions(link.link_doctype);
                                if(perms.length && perms.includes('read')){
                                    dropdownMenu.appendChild(linkOption);
                                }
                            });
                        }
                    });
                    dropdown.appendChild(dropdownBtn);
                    dropdown.appendChild(dropdownMenu);
                    action_td.appendChild(dropdown);
                    if(dropdownMenu.children?.length > 0){
                        tr.appendChild(action_td);
                    }
                }

                this.tBody.appendChild(tr);
                rowIndex++;
            }
        };

        const handleScroll = () => {
            const scrollTop = this.table_wrapper.scrollTop;
            if (scrollTop > this.lastScrollTop) {
                if (this.table_wrapper.scrollTop + this.table_wrapper.clientHeight >= this.table_wrapper.scrollHeight) {
                    renderBatch();
                }
            }
            this.lastScrollTop = scrollTop;
        };

        this.table_wrapper.addEventListener('scroll', handleScroll);
        renderBatch();
        return tbody;
    }
    async childTableDialog(doctype, primaryKey, primaryKeyValue, parentRow) {
        const dialog = new frappe.ui.Dialog({
            title: doctype,
            fields: [{
                fieldname: 'table',
                fieldtype: 'HTML',
                options: `<div id="${doctype?.split(' ').length > 1 ? doctype?.split(' ')?.join('-')?.toLowerCase() : doctype.toLowerCase()}"></div>`,
            }],
        });
        dialog.onhide = async function () {
            let updated_doc = await frappe.db.get_doc(this.doctype, parentRow.name);
            let idx = this.rows.findIndex(r => r.name === parentRow.name);
            this.rows[idx] = updated_doc;
            this.updateTableBody();
        }.bind(this);
        let dialog_width = await frappe.db.get_single_value('My Theme', 'dialog_width');
        $(dialog.$wrapper).find('.modal-dialog').css('max-width', dialog_width ?? '70%');
        dialog.show();
        let settings = await this.getViewSettings(doctype);
        if (settings?.fields) {
            let fields = JSON.parse(settings.fields)?.map(e => e.fieldname);
            let columns = await frappe.call('frappe_theme.api.get_meta_fields', { doctype: doctype });
            let _columns = [{
                fieldname: 'name',
                label: 'ID'
            }, ...columns?.message?.filter(f => fields.includes(f.fieldname))]
            let rows = await this.getDocList(doctype, [
                [doctype, primaryKey, '=', primaryKeyValue]
            ], ['*'])

            let datatable = new SvaDataTable({
                wrapper: dialog.body.querySelector(`#${doctype?.split(' ').length > 1 ? doctype?.split(' ')?.join('-')?.toLowerCase() : doctype.toLowerCase()}`), // Wrapper element
                columns: _columns,
                rows: rows,
                doctype: doctype,
                crud: true,
                frm: { doctype: this.doctype, doc: { name: primaryKeyValue }, parentRow },
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
        if (this.rows.length === 0) {
            this.table.replaceChild(this.noDataFound, this.tBody);
            return;
        }
        const oldTbody = this.table.querySelector('tbody');
        const newTbody = this.createTableBody(this.crud);
        this.table.replaceChild(newTbody, oldTbody || this.noDataFound); // Replace old tbody with new sorted tbody
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
        if (['Link', 'HTML'].includes(columnField.fieldtype)) {
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
            if (columnField?.has_link) {
                let [doctype, link_field] = columnField.has_link.split('->');
                td.addEventListener('click', async () => {
                    let perms = await this.get_permissions(doctype);
                    if (perms.length && perms.includes('read')) {
                        await this.childTableDialog(doctype, link_field, row?.name, row);
                    }else{
                        frappe.msgprint('You do not have permission to access this resource.');
                    }
                })
                $(td).css({ height: '35px', padding: "6px 10px", cursor: 'pointer',color:'blue' });
            } else {
                $(td).css({ height: '35px', padding: "6px 10px" });
            }
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
    createNoDataFoundPage() {
        const noDataFoundPage = document.createElement('tr');
        noDataFoundPage.id = 'noDataFoundPage';
        noDataFoundPage.style.height = '300px'; // Use viewport height to set a more responsive height
        noDataFoundPage.style.fontSize = '20px';
        const noDataFoundText = document.createElement('td');
        noDataFoundText.colSpan = this.columns.length + ((this.options?.serialNumberColumn ? 1 : 0) + (this.crud ? 1 : 0)); // Ensure columns are defined properly
        noDataFoundText.style.textAlign = 'center'; // Center the text horizontally
        noDataFoundText.style.paddingTop = '30px';
        noDataFoundText.style.color = 'grey';
        noDataFoundText.textContent = "No data found!";
        noDataFoundPage.appendChild(noDataFoundText);
        return noDataFoundPage;
    }
}

