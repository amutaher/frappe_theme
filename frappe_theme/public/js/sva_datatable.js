class SvaDataTable {
    /**
     * Creates a table with specified options including serial number column, 
     * frozen columns, and editable cells. It also defines styles for the table 
     * body and header.
     * 
     * @param {Object} tableOptions - Configuration object for the table.
     * @param {boolean} tableOptions.serialNumberColumn - Whether to include a serial number column.
     * @param {number} tableOptions.freezeColumnsAtLeft - Number of columns to freeze on the left.
     * @param {number} tableOptions.pageLimit - Number of rows to render at a time.
     * @param {boolean} tableOptions.editable - Indicates if the table is editable.
     * @param {Object} tableOptions.style - Object defining styles for the table.
     * @param {string} tableOptions.style.width - Width of the table.
     * @param {string} tableOptions.style.height - Height of the table.
     * @param {Object} tableOptions.style.tableBody - Styles applied to the table body.
     * @param {string} tableOptions.style.tableBody.fontSize - Font size for table body text.
     * @param {string} tableOptions.style.tableBody.fontWeight - Font weight for table body text.
     * @param {string} tableOptions.style.tableBody.color - Color of the table body text.
     * @param {Object} tableOptions.style.tableHeader - Styles applied to the table header.
     * @param {string} tableOptions.style.tableHeader.fontSize - Font size for table header text.
     * @param {string} tableOptions.style.tableHeader.fontWeight - Font weight for table header text.
     * @param {string} tableOptions.style.tableHeader.color - Color of the table header text.
     */

    constructor({ wrapper,columns,rows,options,frm,cdtfname }) {
        this.rows = rows;
        this.columns = columns;
        this.options = options;
        this.frm = frm;
        this.childTableFieldName = cdtfname;
        this.wrapper = this.setupWrapper(wrapper);
        this.table = this.createTable();
        this.wrapper.appendChild(this.table);
        return this.wrapper;
    }

    setupWrapper(wrapper) {
        wrapper.style = `max-width:${this.options?.style?.width || '880px'}; width:${this.options?.style?.width || '880px'};max-height:${this.options?.style?.height || '950px'}; height:${this.options?.style?.height || '950px'};margin:0; padding:0;box-sizing:border-box; overflow:auto;scroll-behavior:smooth;margin-bottom:20px;`
        return wrapper;
    }

    createTable() {
        const table = document.createElement('table');
        table.classList.add('table', 'table-bordered');
        table.style = 'width:100%; font-size:13px; margin-top:0px !important; position:relative;';
        table.appendChild(this.createTableHead());
        table.appendChild(this.createTableBody());
        return table;
    }

    createTableHead() {
        const thead = document.createElement('thead');
        if(this.options?.additionalTableHeader){
            thead.innerHTML = this.options?.additionalTableHeader?.join('') || '';
        }
        thead.style = `
                color:${this.options?.style?.tableHeader?.color || 'black'};
                font-size:${this.options?.style?.tableHeader?.fontSize || '12px'};
                font-weight:${this.options?.style?.tableHeader?.fontWeight || 'normal'};
                position:sticky; top: 0px; background-color:#F3F3F3; 
                text-align:center; z-index:3; font-weight:200 !important;
            `;
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
            if (this.options.freezeColumnsAtLeft && this.options.freezeColumnsAtLeft >= freezeColumnsAtLeft) {
                th.style = `position:sticky; left:${left}px; z-index:2; background-color:#F3F3F3;`;
                left += column.width;
                freezeColumnsAtLeft++;
            }
            th.textContent = column.name || column.label;
            tr.appendChild(th);
        });

        thead.appendChild(tr);
        return thead;
    }

    createTableBody() {
        const tbody = document.createElement('tbody');
        let rowIndex = 0;
        const batchSize = this.options?.pageLimit || 30;
        tbody.style = `
            font-size:${this.options?.style?.tableBody?.fontSize || '12px'};
            font-weight:${this.options?.style?.tableBody?.fontWeight || 'normal'};
            color:${this.options?.style?.tableBody?.color || 'black'};
            background-color:${this.options?.style?.tableBody?.backgroundColor || 'transparent'};
        `;

        const renderBatch = () => {
            for (let i = 0; i < batchSize && rowIndex < this.rows.length; i++) {
                const row = this.rows[rowIndex];
                row.rowIndex = rowIndex;
                const tr = document.createElement('tr');
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
                    }else{
                        this.createNonEditableField(td, column, row);
                    }
                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
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

    getCellStyle(column, freezeColumnsAtLeft, left) {
        return this.options.freezeColumnsAtLeft >= freezeColumnsAtLeft
            ? `position:sticky; left:${left}px; z-index:2; background-color:white; min-width:${column.width}px; max-width:${column.width}px; padding:0px;`
            : `min-width:${column.width}px; max-width:${column.width}px; padding:0px;`;
    }

    createEditableField(td, column, row) {
        const frm = this.frm;
        const childTableFieldName = this.childTableFieldName;
        td.textContent = "";

        let columnField = {
            ...column,
            onchange: function () {
                if (row[column.fieldname] !== control.get_input_value()) {
                    frm.doc[childTableFieldName][row.rowIndex][column.fieldname] = control.get_input_value();
                    frm.dirty();
                }
            }
        };

        if (column.link_filter) {
            const [parentfield, filter_key] = column.link_filter.split("->");
            columnField.get_query = () => ({
                filters: {
                    [filter_key]: frm.doc[childTableFieldName][row.rowIndex][parentfield] || `Please select ${parentfield}`
                }
            });
        }

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
}