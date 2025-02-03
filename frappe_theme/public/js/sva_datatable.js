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

    constructor({
        label = "",
        wrapper, columns = [], rows = [], limit = 10,
        childLinks = [], connection, options,
        frm, cdtfname, doctype, render_only = false,
        onFieldClick = () => { }, onFieldValueChange = () => { }
    }) {
        // console.log("SVA DataTable constructor",doctype);
        this.label = label
        wrapper.innerHTML = '';
        this.rows = rows;
        this.columns = columns;

        // pagination
        this.page = 1;
        this.limit = limit;
        this.total = this.rows.length;
        // pagination

        this.options = options;
        this.currentSort = this?.options?.defaultSort || null; // Track sort state
        this.frm = frm;
        this.doctype = doctype;
        this.childTableFieldName = cdtfname;
        this.connection = connection;
        this.conf_perms = JSON.parse(this.connection?.crud_permissions ?? '[]');
        this.header = JSON.parse(this.connection?.listview_settings ?? '[]');
        this.childLinks = childLinks;
        this.wrapper = this.setupWrapper(wrapper);
        this.uniqueness = this.options?.uniqueness || { row: [], column: [] };
        this.table_wrapper = document.createElement('div');
        this.table_wrapper.id = 'table_wrapper';
        this.table = null;
        this.permissions = [];
        this.mgrant_settings = frappe.boot.mgrant_settings || null;
        this.workflow = []
        this.workflow_state_bg = []
        this.render_only = render_only;
        this.additional_list_filters = [];
        this.onFieldValueChange = onFieldValueChange;
        this.onFieldClick = onFieldClick;
        this.reloadTable();
        return this.wrapper;
    }
    reloadTable(reset = false) {
        // console.log("SVA DataTable reloadTable",this.doctype,this.render_only);

        if (!this.render_only) {
            if (this.conf_perms.length && this.conf_perms.includes('read')) {
                isLoading(true, this.wrapper);
                this.get_permissions(this.doctype).then(async perms => {
                    this.permissions = perms;
                    // ================================ Workflow Logic  ================================
                    this.workflow = await frappe.db.get_value("Workflow", { "document_type": this.doctype }, ['*'])
                    if (this.workflow.message.name) {
                        this.workflow = await frappe.db.get_doc("Workflow", this.workflow.message.name)
                        this.workflow_state_bg = await frappe.db.get_list("Workflow State", {
                            fields: ['name', 'style']
                        });
                    }
                    // ================================ Workflow End ================================
                    try {
                        if (this.mgrant_settings != null && this.frm.doctype == "Grant" && await frappe.db.exists("mGrant Settings Grant Wise", this.frm.doc.name)) {
                            let msgw = await frappe.db.get_doc("mGrant Settings Grant Wise", this.frm.doc.name)
                            if (msgw) {
                                this.mgrant_settings = msgw
                            }
                        }
                    } catch (e) {
                        this.mgrant_settings = {}
                        console.log(e)
                    }

                    if (perms.length && perms.includes('read')) {
                        let columns = await frappe.call('frappe_theme.api.get_meta_fields', { doctype: this.doctype });
                        if (this.header.length) {
                            this.columns = [];
                            for (let h of this.header) {
                                if (h.fieldname === 'name') {
                                    this.columns.push({ fieldname: 'name', label: 'ID' });
                                    continue;
                                } else {
                                    let field = columns.message.find(f => f.fieldname === h.fieldname);
                                    if (field) {
                                        this.columns.push(field);
                                    }
                                }
                            }
                        } else {
                            this.columns = [...columns.message.filter(f => f.in_list_view)];
                        }
                        this.rows = await this.getDocList()
                        this.table = this.createTable();
                        if (!this.table_wrapper.querySelector('table') && !reset) {
                            this.table_wrapper.appendChild(this.table);
                        } else {
                            this.table_wrapper.querySelector('table').replaceWith(this.table);
                        }
                        this.table_wrapper = this.setupTableWrapper(this.table_wrapper);
                        if (!this.wrapper.querySelector('#table_wrapper') && !reset) {
                            this.wrapper.appendChild(this.table_wrapper);
                        } else {
                            this.wrapper.querySelector('#table_wrapper').replaceWith(this.table_wrapper);
                        }
                        this.tBody = this.table.querySelector('tbody');
                        this.setupFooter(this.wrapper);
                    } else {
                        this.handleNoPermission();
                    }
                    isLoading(false, this.wrapper);
                })
            }else{
                console.log("Permission issues",this.doctype);
            }
        } else {
            isLoading(true, this.wrapper);
            this.table = this.createTable();
            if (!this.table_wrapper.querySelector('table')) {
                this.table_wrapper.appendChild(this.table);
            }
            this.table_wrapper = this.setupTableWrapper(this.table_wrapper);
            if (!this.wrapper.querySelector('#table_wrapper')) {
                this.wrapper.appendChild(this.table_wrapper);
            }
            this.tBody = this.table.querySelector('tbody');
            isLoading(false, this.wrapper);
        }
    }
    setupHeader() {
        let row = document.createElement('div');
        row.setAttribute('class', 'row');
        // add button to import data
        // if (this.permissions?.length && this.permissions.includes('create')) {
        let import_button = document.createElement('button');
        import_button.id = 'import_button';
        import_button.classList.add('btn', 'btn-secondary', 'btn-sm');
        import_button.textContent = 'Import';
        import_button.style = 'margin-bottom:10px; margin-left: auto; margin-right: 14px;';

        import_button.onclick = async () => {
            let dialog = new CustomListView({
                frm: this.frm,
                connection: this.connection
            });
            dialog.custom_import();
        }
        // row.appendChild(import_button);
        // }
        let leftAlignedColumns = [];
        let rightAlignedColumns = [];

        if (this.label) {
            let label_wrapper = document.createElement('div');
            label_wrapper.id = 'label-wrapper';
            label_wrapper.setAttribute('class', 'col-md-3');
            label_wrapper.innerHTML = `<p style="font-weight:bold;">${this.label}</p>`
            leftAlignedColumns.push(label_wrapper)
        }

        let count_wrapper = document.createElement('div');
        count_wrapper.id = 'count-wrapper';
        rightAlignedColumns.push(count_wrapper)

        let options_wrapper = document.createElement('div');
        options_wrapper.id = 'options-wrapper';
        options_wrapper.style = 'display:flex;justify-content:space-between;align-items:center;padding:0px 0px 5px 0px;gap:5px;';
        rightAlignedColumns.push(options_wrapper);

        [...leftAlignedColumns, ...rightAlignedColumns].forEach(e => {
            row.appendChild(e)
        })
        return row;
    }
    setupWrapper(wrapper) {
        wrapper.style = `max-width:${this.options?.style?.width || '100%'}; width:${this.options?.style?.width || '100%'};};margin:0px !important;`;
        wrapper.appendChild(this.setupHeader())
        // create a createWrapperHeader function



        // if (!wrapper.querySelector('div#options-wrapper').querySelector('div#list_filter')) {
        //     let list_filter = document.createElement('div');
        //     list_filter.id = 'list_filter';
        //     new CustomFilterArea({
        //         wrapper: list_filter,
        //         doctype: this.doctype,
        //         on_change: (filters) => {
        //             if (filters.length == 0) {
        //                 if (this.additional_list_filters.length) {
        //                     this.additional_list_filters = []
        //                     this.reloadTable(true);
        //                 }
        //             } else {
        //                 this.additional_list_filters = filters
        //                 this.reloadTable(true);
        //             }
        //         }
        //     })
        //     wrapper.querySelector('div#options-wrapper').appendChild(list_filter);
        // }
        return wrapper;
    }
    createSettingsButton() {
        let list_view_settings = document.createElement('button');
        list_view_settings.id = 'list_view_settings';
        list_view_settings.classList.add('btn', 'btn-secondary', 'btn-sm');
        list_view_settings.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-gear" viewBox="0 0 16 16">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"/>
        </svg>`;
        list_view_settings.onclick = async () => {
            list_view_settings.disabled = true;
            await this.setupListviewSettings();
            list_view_settings.disabled = false;
        }
        return list_view_settings;
    }
    async setupListviewSettings() {
        let dtmeta = await frappe.call({
            method: 'frappe_theme.api.get_meta',
            args: { doctype: this.doctype },
        });
        new ListSettings({
            doctype: this.doctype,
            meta: dtmeta.message,
            settings: this.connection,
            dialog_primary_action: async (listview_settings) => {
                await frappe.xcall('frappe.client.set_value', {
                    doctype: this.connection.doctype,
                    name: this.connection.name,
                    fieldname: 'listview_settings',
                    value: JSON.stringify(listview_settings ?? []),
                });
                this.header = listview_settings;
                this.reloadTable(true);
                frappe.show_alert({ message: __('Listview settings updated'), indicator: 'green' });
            }
        });
    }
    setupTableWrapper(tableWrapper) {
        tableWrapper.style = `
            max-width: ${this.options?.style?.width || '100%'};
            width: ${this.options?.style?.width || '100%'};
            height: auto;
            margin-bottom: 10px;
            margin-top: 0px;
            margin-left: 0px;
            margin-right: 0px;
            padding: 0;
            box-sizing: border-box;
            overflow-x: scroll;
            scroll-behavior: smooth;
            border-spacing: none;
        `;

        // Add CSS to overwrite Bootstrap's table styles
        const style = document.createElement('style');
        style.innerHTML = `
            .table-bordered thead th,
            .table-bordered thead td {
                border-bottom-width: 2px;
                padding-top: 0px !important;
                padding-bottom: 0px !important;
                vertical-align: middle;
                min-height: 32px !important;
                height: 32px;
                max-height: 32px !important;
            }
            .table th,
            .table td {
                padding: 0px 8px !important;
                vertical-align: middle;
            }
        `;
        tableWrapper.appendChild(style);

        return tableWrapper;
    }
    // async setupTotalCount() {
    //     if (!this.wrapper.querySelector('#header-element').querySelector('#count-wrapper').querySelector('#count-element')) {
    //         let filters = []
    //         if (this.connection?.connection_type === 'Referenced') {
    //             filters.push([this.doctype, this.connection.dt_reference_field, '=', this.frm.doc.doctype]);
    //             filters.push([this.doctype, this.connection.dn_reference_field, '=', this.frm.doc.name]);
    //         } else {
    //             filters.push([this.doctype, this.connection.link_fieldname, '=', this.frm.doc.name]);
    //         }
    // this.total = await frappe.db.count(this.doctype, { filters: filters });
    //         let count = document.createElement('span');
    //         count.id = 'count-element';
    //         count.innerHTML = `<span>Total records: ${this.total}</span>`;
    //         count.style = 'font-size:12px;';
    //         this.wrapper.querySelector('#header-element').querySelector('#count-wrapper').appendChild(count);
    //     } else {
    //         let filters = []
    //         if (this.connection?.connection_type === 'Referenced') {
    //             filters.push([this.doctype, this.connection.dt_reference_field, '=', this.frm.doc.doctype]);
    //             filters.push([this.doctype, this.connection.dn_reference_field, '=', this.frm.doc.name]);
    //         } else {
    //             filters.push([this.doctype, this.connection.link_fieldname, '=', this.frm.doc.name]);
    //         }
    //         this.total = await frappe.db.count(this.doctype, { filters: filters });
    //         this.wrapper.querySelector('#header-element').querySelector('#count-wrapper').querySelector('#count-element').innerHTML = `<span>Total records: ${this.total}</span>`;
    //     }
    // }
    async setupFooter(wrapper) {
        let footer = document.createElement('div');
        footer.id = 'footer-element';
        footer.style = 'display:flex;width:100%;height:fit-content;justify-content:space-between;';
        if (!wrapper.querySelector('div#footer-element')) {
            wrapper.appendChild(footer);
        }
        let buttonContainer = document.createElement('div');
        buttonContainer.id = 'create-button-container';
        if (!wrapper.querySelector('div#footer-element').querySelector('div#create-button-container')) {
            wrapper.querySelector('div#footer-element').appendChild(buttonContainer);
        }
        if (this.frm.doc.docstatus == 0 && this.conf_perms.length && this.conf_perms.includes('create')) {
            if (this.permissions.length && this.permissions.includes('create')) {
                if (!wrapper.querySelector('div#footer-element').querySelector('div#create-button-container').querySelector('button#create')) {
                    const create_button = document.createElement('button');
                    create_button.id = 'create';
                    create_button.textContent = "Add row";
                    create_button.classList.add('btn', 'btn-secondary', 'btn-sm');
                    create_button.style = 'width:fit-content;height:fit-content; margin-bottom:10px;';
                    create_button.addEventListener('click', async () => {
                        await this.createFormDialog(this.doctype);
                    });
                    wrapper.querySelector('div#footer-element').querySelector('div#create-button-container').appendChild(create_button);
                }
            }
        }
        if (this.total > this.limit) {
            if (!wrapper.querySelector('div#footer-element').querySelector('div#pagination-element')) {
                wrapper.querySelector('div#footer-element').appendChild(this.setupPagination());
            }
        }
    }
    setupPagination() {
        let pagination = document.createElement('div');
        pagination.id = 'pagination-element';
        pagination.setAttribute('aria-label', 'Page navigation');
        pagination.setAttribute('style', 'font-size:12px !important;height:30px !important;');

        let paginationList = document.createElement('ul');
        paginationList.classList.add('pagination', 'justify-content-center');
        // Previous button
        let prevBtnItem = document.createElement('li');
        prevBtnItem.id = 'prevBtnItem';
        prevBtnItem.classList.add('page-item');
        let prevBtn = document.createElement('button');
        prevBtn.classList.add('page-link');
        prevBtn.textContent = 'Prev';
        prevBtn.addEventListener('click', async () => {
            if (this.page > 1) {
                this.page -= 1;
                this.rows = await this.getDocList();
                this.updateTableBody();
                this.updatePageButtons();
            }
        });
        prevBtnItem.appendChild(prevBtn);
        paginationList.appendChild(prevBtnItem);

        // Page numbers container
        this.pageButtonsContainer = paginationList;
        this.updatePageButtons();

        // Next button
        let nextBtnItem = document.createElement('li');
        nextBtnItem.id = 'nextBtnItem';
        nextBtnItem.classList.add('page-item');
        let nextBtn = document.createElement('button');
        nextBtn.classList.add('page-link');
        nextBtn.textContent = 'Next';
        nextBtn.addEventListener('click', async () => {
            if (this.page < Math.ceil(this.total / this.limit)) {
                this.page += 1;
                this.rows = await this.getDocList();
                this.updateTableBody();
                this.updatePageButtons();
            }
        });
        nextBtnItem.appendChild(nextBtn);
        paginationList.appendChild(nextBtnItem);

        pagination.appendChild(paginationList);
        return pagination;
    }

    updatePageButtons() {
        // Clear existing page buttons
        this.pageButtonsContainer.querySelectorAll('.page-item:not(:first-child):not(:last-child)').forEach(el => el.remove());
        if (this.page !== 1) {
            this.pageButtonsContainer.querySelector("#prevBtnItem")?.classList.remove('disabled');  // Disable if on first page
        } else {
            this.pageButtonsContainer.querySelector("#prevBtnItem")?.classList.add('disabled');  // Disable if on first page
        }
        if (this.page === Math.ceil(this.total / this.limit)) {
            this.pageButtonsContainer.querySelector("#nextBtnItem")?.classList.add('disabled');  // Disable if on last page
        } else {
            this.pageButtonsContainer.querySelector("#nextBtnItem")?.classList.remove('disabled');  // Disable if on last page
        }
        let totalPages = Math.ceil(this.total / this.limit);
        for (let i = 1; i <= totalPages; i++) {
            let pageItem = document.createElement('li');
            pageItem.classList.add('page-item');
            if (i === this.page) {
                pageItem.classList.add('active');
            }
            let pageBtn = document.createElement('button');
            pageBtn.classList.add('page-link');
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', async () => {
                if (i !== this.page) {
                    this.page = i;
                    this.rows = await this.getDocList();
                    this.updateTableBody();
                    this.updatePageButtons();
                }
            });
            pageItem.appendChild(pageBtn);
            this.pageButtonsContainer.insertBefore(pageItem, this.pageButtonsContainer.children[i]);
        }
    }
    get_permissions(doctype) {
        return new Promise((rslv, rjct) => {
            frappe.call({
                method: 'frappe_theme.api.get_permissions',
                args: { doctype },
                callback: function (response) {
                    rslv(response.message)
                },
                error: (err) => {
                    rjct(err);
                }
            });
        });
    }
    handleFrequencyField() {
        let frequency = cur_dialog?.fields_dict?.frequency?.value;
        const year_type = this.mgrant_settings?.year_type || "Financial Year";
        if (!frequency) {
            return;
        }
        let start_date = cur_dialog?.fields_dict?.start_date?.value;
        let end_date = cur_dialog?.fields_dict?.end_date?.value;
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        if (cur_dialog) {
            cur_dialog.fields_dict.planning_table.df.data = [];
            cur_dialog.fields_dict.planning_table.grid.refresh();
        }
        if (frequency === "Annually") {
            let start = new Date(start_date);
            let end = new Date(end_date);
            let year = start.getFullYear();
            let index = 0;
            while (start <= end) {
                cur_dialog.fields_dict['planning_table'].grid.add_new_row(index);
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].doc.timespan = `${year}`;
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].doc.year = year;
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].refresh_field('timespan');
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].refresh_field('year');
                start = new Date(year + 1, 0, 1);
                year++;
                index++;
            }
        } else if (frequency === "Monthly") {
            let start = new Date(start_date);
            let end = new Date(end_date);
            let month = start.getMonth();
            let year = start.getFullYear();
            let index = 0;
            while (start <= end) {
                let month_name = monthNames[month];
                cur_dialog.fields_dict['planning_table'].grid.add_new_row(index);
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].doc.timespan = `${month_name} (${year})`;
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].doc.month = month;
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].doc.year = year;
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].refresh_field('timespan');
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].refresh_field('month');
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].refresh_field('year');
                month++;
                if (month > 11) {
                    month = 0;
                    year++;
                }
                start = new Date(year, month, 1);
                index++;
            }
        } else if (frequency === "Quarterly") {
            let start = new Date(start_date);
            const end = new Date(end_date);
            let index = 0;
            const getQuarterLabel = (quarter) => {
                if (year_type === "Financial Year") {
                    switch (quarter) {
                        case 1: return "Q1 (Apr-Jun)";
                        case 2: return "Q2 (Jul-Sep)";
                        case 3: return "Q3 (Oct-Dec)";
                        case 4: return "Q4 (Jan-Mar)";
                    }
                } else if (year_type === "Calendar Year") {
                    switch (quarter) {
                        case 1: return "Q1 (Jan-Mar)";
                        case 2: return "Q2 (Apr-Jun)";
                        case 3: return "Q3 (Jul-Sep)";
                        case 4: return "Q4 (Oct-Dec)";
                    }
                }
                return "";
            };
            const getFiscalQuarter = (date) => {
                const month = date.getMonth(); // getMonth() returns 0-11
                if (month >= 3 && month <= 5) return 1;
                if (month >= 6 && month <= 8) return 2;
                if (month >= 9 && month <= 11) return 3;
                return 4; // January to March
            };
            const getFiscalYear = (date) => {
                const month = date.getMonth();
                const year = date.getFullYear();
                return month >= 3 ? year : year - 1;
            };
            while (start <= end) {
                let quarter, year;
                // actual_year = start.getFullYear();
                if (year_type === "Financial Year") {
                    quarter = getFiscalQuarter(start);
                    year = getFiscalYear(start);
                } else {
                    quarter = Math.floor((start.getMonth() + 3) / 3);
                    year = start.getFullYear();
                }
                const timespan = `${getQuarterLabel(quarter)} (${year})`;
                cur_dialog.fields_dict['planning_table'].grid.add_new_row(index);
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].doc.timespan = timespan;
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].doc.quarter = quarter;
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].doc.year = year;
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].refresh_field('timespan');
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].refresh_field('quarter');
                cur_dialog.fields_dict.planning_table.grid.grid_rows[index].refresh_field('year');
                if (year_type === "Financial Year") {
                    if (quarter === 4) {
                        start = new Date(year + 1, 3, 1);
                    } else {
                        start = new Date(year, (quarter * 3) + 3, 1);
                    }
                } else {
                    if (quarter === 4) {
                        start = new Date(year + 1, 0, 1);
                    } else {
                        start = new Date(year, quarter * 3, 1);
                    }
                }
                index++;
            }
        }
    }
    async createFormDialog(doctype, name = undefined, mode = 'create') {
        let res = await frappe.call('frappe_theme.api.get_meta_fields', { doctype: this.doctype });
        let fields = res?.message;
        if (mode === 'create' || mode === 'write') {
            if (name) {
                let doc = await frappe.db.get_doc(doctype, name);
                for (const f of fields) {
                    f.onchange = this.onFieldValueChange?.bind(this)
                    if (['Input', 'Output', 'Outcome', 'Impact', 'Budget Plan and Utilisation'].includes(doctype)) {
                        if (f.fieldname === 'frequency') {
                            f.onchange = function () {
                                this.handleFrequencyField();
                            }.bind(this);
                            if (doc[f.fieldname]) {
                                f.default = doc[f.fieldname];
                                f.read_only = 1;
                            }
                            continue;
                        }
                    }

                    if (f.fieldtype === "Table") {
                        let res = await frappe.call('frappe_theme.api.get_meta_fields', { doctype: f.options });
                        let tableFields = res?.message;
                        f.fields = tableFields;
                        if (f.fieldname === 'planning_table') {
                            f.cannot_add_rows = 1;
                            f.cannot_delete_rows = 1;
                        }
                        if (doc[f.fieldname].length) {
                            f.data = doc[f.fieldname].map((row) => {
                                let old_name = row.name;
                                delete row.name;
                                return { ...row, old_name };
                            });
                        }
                        // continue;
                    }
                    if (doc[f.fieldname]) {
                        f.default = doc[f.fieldname];
                    }
                    if (f?.fetch_from) {
                        if (!f.default) {
                            let fetch_from = f.fetch_from.split('.');
                            let [parentfield, fieldname] = fetch_from;
                            let parentf = fields.find(f => f.fieldname === parentfield);
                            if (parentf?.options && parentf?.default) {
                                let doc = await frappe.db.get_doc(parentf?.options, parentf?.default);
                                f.default = doc[fieldname];
                            }
                        }
                        f.read_only = 1;
                    }
                    if (f.fieldtype === 'Link') {
                        f.get_query = () => {
                            const filters = [];
                            if (this.uniqueness.column.length) {
                                if (this.uniqueness.column.includes(f.fieldname)) {
                                    let existing_options = this.rows?.map((item) => item[f.fieldname]);
                                    filters.push([f.options, 'name', 'not in', existing_options]);
                                }
                            }
                            if (f.link_filter) {
                                const [parentfield, filter_key] = f.link_filter.split("->");
                                filters.push([
                                    f.options,
                                    filter_key,
                                    '=',
                                    dialog.fields_dict[parentfield]?.value || `Please select ${parentfield}`,
                                ]);
                            }
                            return { filters };
                        };
                    }
                }
            } else {
                for (const f of fields) {
                    f.onchange = this.onFieldValueChange?.bind(this)
                    if (['Input', 'Output', 'Outcome', 'Impact', 'Budget Plan and Utilisation'].includes(doctype)) {
                        if (f.fieldname === 'frequency') {
                            f.onchange = function () {
                                this.handleFrequencyField();
                            }.bind(this);
                        }
                    }
                    if (this.frm.parentRow) {
                        if (this.frm.parentRow[f.fieldname]) {
                            f.default = this.frm.parentRow[f.fieldname];
                            f.read_only = 1;
                        }
                    }
                    if (this.frm.doctype === f.options) {
                        f.default = this.frm.doc.name;
                        f.read_only = 1;
                    }
                    if (this.connection?.connection_type === 'Referenced') {
                        if (f.fieldname === this.connection.dt_reference_field) {
                            f.default = this.frm.doc.doctype;
                            f.read_only = 1;
                        }
                        if (f.fieldname === this.connection.dn_reference_field) {
                            f.default = this.frm.doc.name;
                            f.read_only = 1;
                        }
                    }
                    if (this.connection?.connection_type === 'Direct') {
                        if (f.fieldname === this.connection.link_fieldname) {
                            f.default = this.frm.doc.name;
                            f.read_only = 1;
                        }
                    }

                    if (f.fieldtype === 'Link') {
                        f.get_query = () => {
                            const filters = [];
                            if (this.uniqueness.column.length) {
                                if (this.uniqueness.column.includes(f.fieldname)) {
                                    let existing_options = this.rows?.map((item) => item[f.fieldname]);
                                    filters.push([f.options, 'name', 'not in', existing_options]);
                                }
                            }
                            if (f.link_filter) {
                                const [parentfield, filter_key] = f.link_filter.split("->");
                                filters.push([
                                    f.options,
                                    filter_key,
                                    '=',
                                    dialog.fields_dict[parentfield]?.value || `Please select ${parentfield}`,
                                ]);
                            }
                            return { filters };
                        };
                    }
                    if (f.fieldtype === "Table") {
                        let res = await frappe.call('frappe_theme.api.get_meta_fields', { doctype: f.options });
                        let tableFields = res?.message;
                        f.fields = tableFields;
                        if (f.fieldname === 'planning_table') {
                            f.cannot_add_rows = 1;
                            f.cannot_delete_rows = 1;
                        }
                        continue;
                    }
                    if (f?.fetch_from) {
                        let fetch_from = f.fetch_from.split('.');
                        let [parentfield, fieldname] = fetch_from;
                        let parentf = fields.find(f => f.fieldname === parentfield);
                        if (parentf?.options && parentf?.default) {
                            let doc = await frappe.db.get_doc(parentf?.options, parentf?.default);
                            f.default = doc[fieldname];
                        }
                        f.read_only = 1;
                    }
                }
            }
        } else {
            let doc = await frappe.db.get_doc(doctype, name);
            for (const f of fields) {
                if (f.fieldtype === 'Table MultiSelect') {
                    continue;
                }
                if (f.fieldtype === "Table") {
                    let res = await frappe.call('frappe_theme.api.get_meta_fields', { doctype: f.options });
                    let tableFields = res?.message;
                    f.fields = tableFields;
                    f.cannot_add_rows = 1;
                    f.cannot_delete_rows = 1;
                    if (doc[f.fieldname].length) {
                        f.data = doc[f.fieldname];
                    }
                    continue;
                }
                if (doc[f.fieldname]) {
                    f.default = doc[f.fieldname];
                    f.read_only = 1;
                } else {
                    f.default = '';
                    f.read_only = 1;
                }
            }
        }

        const dialog = new frappe.ui.Dialog({
            title: `Create ${doctype}`,
            fields: fields || [],
            primary_action_label: ['create', 'write'].includes(mode) ? (name ? 'Update' : 'Create') : 'Close',
            primary_action: async (values) => {
                if (['create', 'write'].includes(mode)) {
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
                            frappe.show_alert({ message: `Successfully created ${doctype}`, indicator: 'green' });
                        }
                    } else {
                        let value_fields = fields.filter((f) => !['Section Break', 'Column Break', 'HTML', 'Button', 'Tab Break'].includes(f.fieldtype))
                        let updated_values = {};
                        for (let field of value_fields) {
                            let key = field.fieldname;
                            if (Array.isArray(values[key])) {
                                updated_values[key] = values[key].map((item) => {
                                    if (item.old_name) {
                                        return { ...item, name: item.old_name };
                                    }
                                    return item;
                                });
                            } else {
                                updated_values[key] = values[key] || '';
                            }
                        }
                        let response = await frappe.xcall('frappe.client.set_value', { doctype: doctype, name, fieldname: updated_values });
                        if (response) {
                            let rowIndex = this.rows.findIndex(r => r.name === name);
                            this.rows[rowIndex] = response;
                            this.updateTableBody();
                            frappe.show_alert({ message: `Successfully updated ${doctype}`, indicator: 'green' });
                        }
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
        if (['create', 'write'].includes(mode)) {
            dialog.get_secondary_btn().show();
        } else {
            dialog.get_secondary_btn().hide();
        }
        dialog.show();
        if (!name) {
            if (['Input', 'Output', 'Outcome', 'Impact', 'Budget Plan and Utilisation'].includes(doctype)) {
                let financial_years_field = dialog?.fields_dict?.financial_years;
                if (financial_years_field) {
                    let start_date = dialog.get_value('start_date');
                    let end_date = dialog.get_value('end_date');
                    let year_type = this.mgrant_settings?.year_type || 'Financial Year'; // Get year type from the dialog
                    let start = new Date(start_date);
                    let end = new Date(end_date);
                    let financial_years = [];
                    while (start <= end) {
                        if (year_type === "Financial Year") {
                            let year = start.getFullYear();
                            let financial_year = start.getMonth() < 3
                                ? `${year - 1}` // Before April
                                : `${year + 1}`; // From April onwards
                            if (!financial_years.includes(financial_year)) {
                                financial_years.push(financial_year);
                            }
                        } else {
                            let year = start.getFullYear();
                            if (!financial_years.includes(year)) {
                                financial_years.push(year);
                            }
                        }
                        start.setMonth(start.getMonth() + 1);
                    }
                    let selected_financial_years = await frappe.db.get_list('Financial Year', {
                        filters: {
                            'financial_year_name': ['in', financial_years]
                        },
                        pluck: 'name'
                    });
                    financial_years_field.value = selected_financial_years?.map(f => {
                        return { 'financial_year': f };
                    });
                    financial_years_field.refresh();
                }
            }
        }
        for (let [fieldname, field] of Object.entries(dialog.fields_dict)?.filter(([fieldname, field]) => field.df.fieldtype == "Date")) {
            if (field?.df?.min_max_depends_on) {
                let splitted = field.df.min_max_depends_on.split('->');
                let fn = splitted[0].split('.')[0];
                let doctype = splitted[0].split('.')[1];
                let min_field = splitted[1];
                let max_field = splitted[2] ? splitted[2] : '';
                if (dialog.get_value(fieldname)) {
                    if (frappe.db.exists(doctype, dialog.get_value(fn))) {
                        let doc = await frappe.db.get_doc(doctype, dialog.get_value(fn));
                        let option = {};
                        if (min_field && doc[min_field]) {
                            option['minDate'] = new Date(doc[min_field]);
                        }
                        if (max_field && doc[max_field]) {
                            option['maxDate'] = new Date(doc[max_field]);
                        }
                        dialog.fields_dict[fieldname].$input.datepicker(option);
                    }
                }
            }
        }
    }
    async deleteRecord(doctype, name) {
        frappe.confirm(`Are you sure you want to delete this ${doctype}?`, async () => {
            await frappe.xcall('frappe.client.delete', { doctype, name });
            let rowIndex = this.rows.findIndex(r => r.name === name);
            this.rows.splice(rowIndex, 1);
            this.updateTableBody();
            frappe.show_alert({ message: `Successfully deleted ${doctype}`, indicator: 'green' });
        });
    }
    createTable() {
        const table = document.createElement('table');
        table.classList.add('table', 'table-bordered');
        table.style = 'width:100%;height:auto; font-size:13px; margin-top:0px !important;margin-bottom: 0px;overflow:auto;';
        table.appendChild(this.createTableHead());
        table.appendChild(this.createTableBody());
        return table;
    }

    createTableHead() {
        const thead = document.createElement('thead');
        if (this.options?.additionalTableHeader) {
            thead.innerHTML = this.options?.additionalTableHeader?.join('') || '';
        }
        thead.style = `
            color:${this.options?.style?.tableHeader?.color || '#525252'};
            font-size:${this.options?.style?.tableHeader?.fontSize || '12px'};
            font-weight:${this.options?.style?.tableHeader?.fontWeight || 'normal'};
            background-color:#F3F3F3;
            z-index:3; font-weight:200 !important;white-space: nowrap;`
            ;
        const tr = document.createElement('tr');

        if (this.options.serialNumberColumn) {
            const serialTh = document.createElement('th');
            serialTh.textContent = '#';
            serialTh.style = 'width:40px;text-align:center;position:sticky;left:0px;background-color:#F3F3F3;';
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
        // ========================= Workflow Logic ======================
        if (this.workflow && this.workflow?.transitions?.some(tr => frappe.user_roles.includes(tr?.allowed))) {
            const addColumn = document.createElement('th');
            addColumn.textContent = 'Approval';
            addColumn.style = 'background-color:#F3F3F3; cursor:pointer; text-align:center;';
            tr.appendChild(addColumn);
        }
        // ========================= Workflow End ======================
        if (((this.frm.doc.docstatus == 0 && this.conf_perms.length && (this.conf_perms.includes('delete') || this.conf_perms.includes('write')))) || this.childLinks?.length) {
            const action_th = document.createElement('th');
            action_th.style = 'width:5px; text-align:center;position:sticky;right:0px;background-color:#F3F3F3;';
            if (frappe.user_roles.includes("Administrator")) {
                action_th.appendChild(this.createSettingsButton());
                tr.appendChild(action_th);
            } else {
                if (this.conf_perms.length || this.childLinks?.length) {
                    tr.appendChild(action_th);
                    action_th.textContent = 'Actions'
                }
            }
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
    createActionColumn(row, primaryKey) {
        const dropdown = document.createElement('div');
        dropdown.classList.add('dropdown');

        const dropdownBtn = document.createElement('span');
        dropdownBtn.classList.add('h4');
        dropdownBtn.style = 'cursor:pointer;';
        dropdownBtn.setAttribute('data-toggle', 'dropdown');
        dropdownBtn.innerHTML = "&#8942;";

        const dropdownMenu = document.createElement('div');
        dropdownMenu.classList.add('dropdown-menu');
        dropdownMenu.style.position = 'absolute !important';
        dropdownMenu.style.zIndex = '9999 !important';
        // View Button
        if (this.conf_perms.length && this.permissions.length) {
            if (this.permissions.includes('read')) {
                const viewOption = document.createElement('a');
                viewOption.classList.add('dropdown-item');
                viewOption.textContent = "View";
                viewOption.addEventListener('click', async () => {
                    await this.createFormDialog(this.doctype, primaryKey, 'view');
                });
                dropdownMenu.appendChild(viewOption);
            }
            if (!['1', '2'].includes(row.docstatus) && this.frm?.doc?.docstatus == 0) {
                if (this.permissions.includes('write')) {
                    const editOption = document.createElement('a');
                    editOption.classList.add('dropdown-item');
                    editOption.textContent = "Edit";
                    editOption.addEventListener('click', async () => {
                        await this.createFormDialog(this.doctype, primaryKey, 'write');
                    });
                    dropdownMenu.appendChild(editOption);
                }
                if (this.permissions.includes('delete')) {
                    const deleteOption = document.createElement('a');
                    deleteOption.classList.add('dropdown-item');
                    deleteOption.textContent = "Delete";
                    deleteOption.addEventListener('click', async () => {
                        await this.deleteRecord(this.doctype, primaryKey);
                    });
                    dropdownMenu.appendChild(deleteOption);
                }
            }
        }
        if (this.childLinks?.length) {
            this.childLinks.forEach(async link => {
                const linkOption = document.createElement('a');
                linkOption.classList.add('dropdown-item');
                linkOption.textContent = link.link_doctype;
                linkOption.addEventListener('click', async () => {
                    await this.childTableDialog(link.link_doctype, primaryKey, row, link);
                });
                dropdownMenu.appendChild(linkOption);
            });
        }
        dropdown.appendChild(dropdownBtn);
        dropdown.appendChild(dropdownMenu);
        return dropdown;
    }
    createActionColumn(row, primaryKey) {
        const dropdown = document.createElement('div');
        dropdown.classList.add('dropdown');

        const dropdownBtn = document.createElement('span');
        dropdownBtn.classList.add('h4');
        dropdownBtn.style = 'cursor:pointer;';
        dropdownBtn.setAttribute('data-toggle', 'dropdown');
        dropdownBtn.innerHTML = "&#8942;";

        const dropdownMenu = document.createElement('div');
        dropdownMenu.classList.add('dropdown-menu');
        dropdownMenu.style.position = 'fixed';
        dropdownMenu.style.zIndex = '9999';
        dropdownMenu.style.display = 'none';

        // View Button
        if (this.conf_perms.length && this.permissions.length) {
            if (this.permissions.includes('read')) {
                const viewOption = document.createElement('a');
                viewOption.classList.add('dropdown-item');
                viewOption.textContent = "View";
                viewOption.addEventListener('click', async () => {
                    await this.createFormDialog(this.doctype, primaryKey, 'view');
                });
                dropdownMenu.appendChild(viewOption);
            }
            if (!['1', '2'].includes(row.docstatus) && this.frm?.doc?.docstatus == 0) {
                if (this.permissions.includes('write')) {
                    const editOption = document.createElement('a');
                    editOption.classList.add('dropdown-item');
                    editOption.textContent = "Edit";
                    editOption.addEventListener('click', async () => {
                        await this.createFormDialog(this.doctype, primaryKey, 'write');
                    });
                    dropdownMenu.appendChild(editOption);
                }
                if (this.permissions.includes('delete')) {
                    const deleteOption = document.createElement('a');
                    deleteOption.classList.add('dropdown-item');
                    deleteOption.textContent = "Delete";
                    deleteOption.addEventListener('click', async () => {
                        await this.deleteRecord(this.doctype, primaryKey);
                    });
                    dropdownMenu.appendChild(deleteOption);
                }
            }
        }
        if (this.childLinks?.length) {
            this.childLinks.forEach(async link => {
                const linkOption = document.createElement('a');
                linkOption.classList.add('dropdown-item');
                linkOption.textContent = link.link_doctype;
                linkOption.addEventListener('click', async () => {
                    await this.childTableDialog(link.link_doctype, primaryKey, row, link);
                });
                dropdownMenu.appendChild(linkOption);
            });
        }

        dropdown.appendChild(dropdownBtn);
        document.body.appendChild(dropdownMenu);

        dropdownBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            const rect = dropdownBtn.getBoundingClientRect();

            const dropdownWidth = dropdownMenu.offsetWidth || 150; // Default width in case offsetWidth is 0
            dropdownMenu.style.top = `${rect.bottom}px`;
            dropdownMenu.style.left = `${rect.left - dropdownWidth}px`; // Adjust position for left-side popup
            dropdownMenu.style.display = dropdownMenu.style.display === 'none' ? 'block' : 'none';
        });

        document.addEventListener('click', () => {
            dropdownMenu.style.display = 'none';
        });

        return dropdown;
    }
    createTableBody() {
        if (this.rows.length === 0) {
            return this.createNoDataFoundPage();
        }
        const tbody = document.createElement('tbody');
        this.tBody = tbody;
        let rowIndex = 0;
        const batchSize = this.options?.pageLimit || 30;
        tbody.style = `
            white-space: nowrap;`
            ;
        if (this.currentSort) {
            this.sortByColumn(this.currentSort.column, this.currentSort.direction, false);
        }
        const renderBatch = async () => {
            for (let i = 0; i < batchSize && rowIndex < this.rows.length; i++) {
                const row = this.rows[rowIndex];
                row.rowIndex = rowIndex;
                const tr = document.createElement('tr');
                let primaryKey = row?.name || row?.rowIndex || rowIndex?.id || rowIndex;
                tr.style = 'max-height:32px !important; height:32px !important;';

                if (this.options.serialNumberColumn) {
                    const serialTd = document.createElement('td');
                    serialTd.style = 'min-width:40px; text-align:center;position:sticky;left:0px;background-color:#fff;';
                    if (this.page > 1) {
                        serialTd.innerHTML = `<a href = "/app/${this.doctype?.split(' ').length > 1 ? this.doctype?.split(' ')?.join('-')?.toLowerCase() : this.doctype.toLowerCase()}/${row['name']}" >${((this.page - 1) * this.limit) + (rowIndex + 1)}</a>`;
                    } else {
                        serialTd.innerHTML = `<a href = "/app/${this.doctype?.split(' ').length > 1 ? this.doctype?.split(' ')?.join('-')?.toLowerCase() : this.doctype.toLowerCase()}/${row['name']}" >${rowIndex + 1}</a>`;
                    }
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
                // ========================= Workflow Logic ===================
                if (this.workflow?.transitions?.some(tr => frappe.user_roles.includes(tr.allowed))) {
                    const wf_select = document.createElement('select');
                    wf_select.classList.add('form-select', 'rounded');
                    wf_select.setAttribute('title', row['workflow_state'] || 'No state available');
                    // wf_select.disabled = ['Approved', 'Rejected'].includes(row['workflow_state']);

                    wf_select.disabled = this.frm?.doc?.docstatus != 0 || ['Approved', 'Rejected'].includes(row['workflow_state']) ||
                        this.workflow?.transitions?.some(tr => frappe.user_roles.includes(tr.allowed) && tr.state && tr.state !== row['workflow_state']) === true;

                    wf_select.style = 'width:100px; min-width:100px;  padding:2px 5px;';

                    const bg = this.workflow_state_bg?.find(bg => bg.name === row['workflow_state'] && bg.style);
                    wf_select.classList.add(bg ? `bg-${bg.style.toLowerCase()}` : 'pl-[20px]', ...(bg ? ['text-white'] : []));
                    let me = this;
                    wf_select.innerHTML = `<option value="" style=" color:black" selected disabled>${row['workflow_state']}</option>` +
                        this.workflow.transitions
                            .filter(link => frappe.user_roles.includes(link.allowed))
                            .map(link => `<option value="${link.action}" style="background-color:white; color:black; cursor:pointer;" class="rounded p-1">${link.action}</option>`)
                            .join('');

                    wf_select.addEventListener('change', async (event) => {
                        const action = event.target.value;
                        const link = this.workflow.transitions.find(l => l.action === action && frappe.user_roles.includes(l.allowed));
                        // Store the current state to reset later if needed
                        const originalState = wf_select.getAttribute('title');
                        if (link) {
                            if(window.onWorkflowStateChange){
                                await window.onWorkflowStateChange(this, link, primaryKey, wf_select, originalState);
                            }else{
                                await this.wf_action(link, primaryKey, wf_select, originalState)
                            }
                            wf_select.value = "";
                            wf_select.title = originalState;
                        }
                    });

                    const wf_action_td = document.createElement('td');
                    wf_action_td.style = "text-align: center;";
                    wf_action_td.appendChild(wf_select);
                    tr.appendChild(wf_action_td);
                }

                // ========================= Workflow End ===================
                if (this.conf_perms.length || this.childLinks?.length) {
                    const action_td = document.createElement('td');
                    action_td.style = 'min-width:100px; text-align:center;position:sticky;right:0px;background-color:#fff;';
                    action_td.appendChild(this.createActionColumn(row, primaryKey));
                    tr.appendChild(action_td);
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
    // ================================ Workflow Action  Logic ================================
    async wf_action(selected_state_info, docname, wf_select_el, prevState) {
        let me = this;
        const bg = me.workflow_state_bg?.find(bg => bg.name === selected_state_info.next_state && bg?.style);
        let meta = await frappe.call({
            method: 'frappe_theme.api.get_meta',
            args: { doctype: me.doctype },
        });
        const fields = meta?.message?.fields?.filter(field => {
            return field?.wf_state_field == selected_state_info.action
        })?.map(field => { return { label: field.label, fieldname: field.fieldname, fieldtype: field.fieldtype, reqd: 1 } });
        const popupFields = [
            {
                label: "Action Test",
                fieldname: "action_test",
                fieldtype: "HTML",
                options: `<p>Action:  <span style="padding: 4px 8px; border-radius: 100px; color:white;  font-size: 12px; font-weight: 400;" class="bg-${bg?.style?.toLowerCase() || 'secondary'}">${selected_state_info.action}</span></p>`,
            },
            ...(fields ? fields : []),
        ];
        const workflowFormValue = await new Promise((resolve) => {
            const dialog = new frappe.ui.Dialog({
                title: "Confirm",
                fields: popupFields,
                primary_action_label: "Proceed",
                primary_action: (values) => {
                    dialog.hide();
                    resolve(values);
                },
                secondary_action_label: "Cancel",
                secondary_action: () => {
                    dialog.hide();
                    wf_select_el.value = ""; // Reset dropdown value
                    wf_select_el.title = prevState;
                    frappe.show_alert({ message: `${selected_state_info.action} Action has been cancelled.`, indicator: "orange" });
                },
            });
            dialog.show();
        });
        try {
            const updateFields = {
                [me.workflow.workflow_state_field]: selected_state_info.next_state,
                ...(workflowFormValue && workflowFormValue),
            };
            const response = await frappe.db.set_value(me.doctype, docname, updateFields);
            if (response?.exc) throw new Error("Update failed");
            const row = me.rows.find((r) => r.name === docname);
            row[me.workflow.workflow_state_field] = selected_state_info.next_state;
            if(workflowFormValue?.wf_comment){
                row.wf_comment = workflowFormValue.wf_comment;
            }else{
                const comment = `${me.workflow.workflow_state_field} changed to ${selected_state_info.next_state}`;
                row.wf_comment = comment;
            }
            Object.assign(row, workflowFormValue);
            me.rows[row.rowIndex] = row;
            me.updateTableBody();
            frappe.show_alert({ message: `${selected_state_info.next_state} successfully`, indicator: "green" });
        } catch (error) {
            frappe.show_alert({ message: "An error occurred.", indicator: "red" });
            console.error(error);
        }
    }

    // ================================ Workflow Action End ================================
    async childTableDialog(doctype, primaryKeyValue, parentRow, link) {
        const dialog = new frappe.ui.Dialog({
            title: doctype,
            fields: [{
                fieldname: 'table',
                fieldtype: 'HTML',
                options: `<div id = "${doctype?.split(' ').length > 1 ? doctype?.split(' ')?.join('-')?.toLowerCase() : doctype.toLowerCase()}" ></div > `,
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
        new SvaDataTable({
            wrapper: dialog.body.querySelector(`#${doctype?.split(' ').length > 1 ? doctype?.split(' ')?.join('-')?.toLowerCase() : doctype.toLowerCase()}`), // Wrapper element
            doctype: doctype,
            connection: link,
            frm: { doctype: this.doctype, doc: { name: primaryKeyValue, docstatus: parentRow.docstatus }, parentRow },
            options: {
                serialNumberColumn: true,
                editable: false,
            },
        });
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
            this.table.replaceChild(this.createNoDataFoundPage(), this.tBody);
            return;
        }
        const oldTbody = this.table.querySelector('tbody');
        const newTbody = this.createTableBody();
        this.table.replaceChild(newTbody, oldTbody || this.table.querySelector('#noDataFoundPage')); // Replace old tbody with new sorted tbody
    }

    getCellStyle(column, freezeColumnsAtLeft, left) {
        return this.options.freezeColumnsAtLeft >= freezeColumnsAtLeft
            ? `position: sticky; left:${left} px; z-index: 2; background-color: white; min-width:${column.width} px; max-width:${column.width} px; padding: 0px`
            : `min-width:${column.width || 150} px; max-width:${column.width} px; padding: 0px !important; `;
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

        $(control.input).css({ width: '100%', height: '32px', backgroundColor: 'white', margin: '0px', boxShadow: 'none' });
        if (row[column.fieldname]) {
            control.set_value(row[column.fieldname]);
        }
        control.refresh();
    }

    createNonEditableField(td, column, row) {
        td.textContent = "";
        let columnField = {
            ...column,
            read_only: 1,
            description: ''
        };
        if (['Link', 'HTML'].includes(columnField.fieldtype)) {
            const control = frappe.ui.form.make_control({
                parent: td,
                df: columnField,
                render_input: true,
                only_input: true,
            });
            setTimeout(() => {
                control.input?.classList?.remove('bold');
            }, 0);
            $(control.input).css({ width: '100%', minWidth: '150px', height: '32px', backgroundColor: 'white', margin: '0px', fontSize: '12px', color: 'black', boxShadow: 'none', padding: '0px 5px', cursor: 'normal' });
            $(td).css({ height: '32px !important' });
            if (row[column.fieldname]) {
                control.set_value(row[column.fieldname]);
            }
            control.refresh();
            return;
        } else {
            if (columnField?.has_link) {
                let [doctype, link_field] = columnField.has_link.split('->');
                td.addEventListener('click', async () => {
                    await this.childTableDialog(doctype, link_field, row?.name, row);
                })
                $(td).css({ height: '32px', cursor: 'pointer', color: 'blue', padding: '0px 5px' });
            } else {
                $(td).css({ height: '32px', padding: '0px 5px' });
            }
            if (columnField.fieldtype === 'Currency') {
                td.innerHTML = formatCurrency(row[column.fieldname], frappe.sys_defaults.currency);
                $(td).css({ textAlign: 'right' });
                return;
            }
            if (columnField.fieldtype === 'Attach') {
                td.innerHTML = `<a href = "${row[column.fieldname]}" target = "_blank" >${row[column.fieldname]}</a> `;
                return;
            }
            if (columnField.fieldtype === 'Attach Image') {
                if (row[column.fieldname]) {
                    td.innerHTML = `<img src = "${row[column.fieldname]}" style = "width:30px;border-radius:50%;height:30px;object-fit:cover;" /> `;
                    return;
                }
            }
            if (['Int', 'Float'].includes(columnField.fieldtype)) {
                td.innerText = row[column.fieldname].toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }) || 0;
                td.style = 'text-align:right;';
                return;
            }
            if (['Date'].includes(columnField.fieldtype)) {
                td.innerText = row[column.fieldname] ? formaDate(row[column.fieldname]) : '';
                return;
            }
            if (columnField.fieldname == 'name') {
                td.innerHTML = `<a href = "/app/${this.doctype?.split(' ').length > 1 ? this.doctype?.split(' ')?.join('-')?.toLowerCase() : this.doctype.toLowerCase()}/${row[column.fieldname]}" > ${row[column.fieldname]}</a> `;
                return;
            }
            if (columnField.fieldtype == 'Button') {
                let btn = document.createElement('button');
                btn.classList.add('btn', 'btn-secondary', 'btn-sm');
                btn.setAttribute('data-dt', this.doctype);
                btn.setAttribute('data-dn', row.name);
                btn.setAttribute('data-fieldname', columnField.fieldname);
                btn.onclick = this.onFieldClick;
                btn.textContent = columnField.label;
                td.appendChild(btn)
                return;
            }
            td.textContent = row[column.fieldname] || "";
        }
    }
    async getDocList() {
        try {
            let filters = []
            if (this.connection?.extended_condition && this.connection?.extended_condition) {
                try {
                    let cond = JSON.parse(this.connection.extended_condition)
                    if (Array.isArray(cond) && cond?.length) {
                        filters.push(cond);
                    }
                } catch (error) {
                    console.log("Exception: while parsing extended_condition", error);
                }
            }
            if (this.connection?.connection_type === 'Referenced') {
                filters.push([this.doctype, this.connection.dt_reference_field, '=', this.frm.doc.doctype]);
                filters.push([this.doctype, this.connection.dn_reference_field, '=', this.frm.doc.name]);
            } else {
                filters.push([this.doctype, this.connection.link_fieldname, '=', this.frm.doc.name]);
            }
            this.total = await frappe.db.count(this.doctype, { filters: filters });
            let res = await frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: this.doctype,
                    filters: [...filters, ...this.additional_list_filters],
                    fields: this.fields || ['*'],
                    limit_page_length: this.limit,
                    order_by: 'creation desc',
                    limit_start: this.page > 0 ? ((this.page - 1) * this.limit) : 0
                }
            });
            return res.message;
        } catch (error) {
            return [];
        }
    }
    createNoDataFoundPage() {
        const noDataFoundPage = document.createElement('tr');
        noDataFoundPage.id = 'noDataFoundPage';
        noDataFoundPage.style.height = '300px'; // Use viewport height to set a more responsive height
        noDataFoundPage.style.fontSize = '20px';
        const noDataFoundText = document.createElement('td');
        noDataFoundText.colSpan = (this.columns?.length ?? 3) + ((this.options?.serialNumberColumn ? 1 : 0) + ((this.conf_perms.includes('write') || this.conf_perms.includes('delete')) ? 1 : 0)); // Ensure columns are defined properly
        noDataFoundText.style.textAlign = 'center'; // Center the text horizontally
        noDataFoundText.style.paddingTop = '100px';
        noDataFoundText.style.color = 'grey';
        // noDataFoundText.innerHTML = "<img style='width:100px;height:100px;' src='/assets/mgrant/images/no-data-found.png'/>";
        let message = document.createElement('p');
        message.textContent = "You haven't created a record yet";
        message.style.color = 'grey';
        noDataFoundPage.style.backgroundColor = '#F8F8F8'
        noDataFoundText.appendChild(message)
        noDataFoundPage.appendChild(noDataFoundText);
        return noDataFoundPage;
    }
    handleNoPermission() {
        let noPermissionPage = document.createElement('div');
        noPermissionPage.id = 'noPermissionPage';
        noPermissionPage.style.height = '100%';
        noPermissionPage.style.fontSize = '20px';
        noPermissionPage.style.textAlign = 'center';
        noPermissionPage.style.paddingTop = '50px';
        noPermissionPage.style.color = 'grey';
        noPermissionPage.textContent = "You do not have permission through role permission to access this resource.";
        if (!this.wrapper.querySelector('#noPermissionPage')) {
            this.wrapper.appendChild(noPermissionPage);
        }
    }
}

