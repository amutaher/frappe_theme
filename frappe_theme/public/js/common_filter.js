class CommonFilter {
    constructor({
        parent,
        doctype,
        onFilterChange,
        filterFields = [],
        defaultFilters = []
    }) {
        // this.parent = typeof parent === 'string' ? document.querySelector(parent) : parent;
        // this.doctype = doctype;
        // this.onFilterChange = onFilterChange;
        // this.filterFields = filterFields;
        // this.defaultFilters = defaultFilters;
        // this.filters = {};
        // this.filter_list = null;

        // this.init();
    }

    init() {
        this.createFilterSection();
        this.setupFilters();
        this.addStyles();
    }

    createFilterSection() {
        // Create filter section
        const filterSection = document.createElement('div');
        filterSection.className = 'common-filter-section';

        // Create filter button
        const filterButton = document.createElement('button');
        filterButton.className = 'btn btn-default btn-sm filter-button';
        filterButton.innerHTML = `
            <span class="filter-icon">
                <svg class="icon icon-sm">
                    <use href="#icon-filter"></use>
                </svg>
            </span>
            <span class="button-text">${__('Filter')}</span>
            <span class="filter-count"></span>
        `;
        filterSection.appendChild(filterButton);

        // Create filter container
        const filterContainer = document.createElement('div');
        filterContainer.className = 'common-filter-container';
        filterContainer.id = `filter-container-${frappe.utils.get_random(6)}`;
        filterContainer.style.display = 'none';
        filterSection.appendChild(filterContainer);

        this.filterButton = filterButton;
        this.filterContainer = filterContainer;
        this.parent.appendChild(filterSection);

        // Setup click handler
        $(filterButton).on('click', () => {
            $(filterContainer).toggle();
            $(filterButton).toggleClass('active');
        });
    }

    setupFilters() {
        this.filter_list = new frappe.ui.FilterGroup({
            parent: $(this.filterContainer),
            doctype: this.doctype,
            on_change: () => this.filterChanged()
        });

        // Add filter fields
        this.filter_list.add_filters_to_filter_group(this.filterFields);

        // Add default filters if provided
        if (this.defaultFilters.length) {
            this.defaultFilters.forEach(filter => {
                this.filter_list.add_filter(this.doctype, filter.field, filter.operator, filter.value);
            });
        }
    }

    filterChanged() {
        // Convert filter list to filters object
        const filters = {};
        this.filter_list.get_filters().forEach(filter => {
            filters[filter[1]] = [filter[2], filter[3]];
        });

        // Update filters
        this.filters = filters;

        // Update filter count
        this.updateFilterCount();

        // Call the callback
        if (typeof this.onFilterChange === 'function') {
            this.onFilterChange(this.filters);
        }
    }

    updateFilterCount() {
        const filterCount = this.filter_list.get_filters().length;
        const filterCountElement = this.filterButton.querySelector('.filter-count');

        if (filterCountElement) {
            if (filterCount > 0) {
                filterCountElement.textContent = `(${filterCount})`;
                filterCountElement.style.display = 'inline';
            } else {
                filterCountElement.style.display = 'none';
            }
        }
    }

    getFilters() {
        return this.filters;
    }

    clearFilters() {
        this.filter_list.clear_filters();
        this.filterChanged();
    }

    addFilter(fieldname, operator, value) {
        this.filter_list.add_filter(this.doctype, fieldname, operator, value);
        this.filterChanged();
    }

    removeFilter(fieldname) {
        const filters = this.filter_list.get_filters();
        const filterIndex = filters.findIndex(f => f[1] === fieldname);
        if (filterIndex > -1) {
            this.filter_list.remove_filter(this.doctype, fieldname);
            this.filterChanged();
        }
    }

    addStyles() {
        if (!document.getElementById('common-filter-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'common-filter-styles';
            styleSheet.textContent = `
                .common-filter-section {
                    position: relative;
                    display: inline-block;
                }
                .filter-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 10px;
                    height: 28px;
                    font-size: var(--text-sm);
                    color: var(--text-muted);
                    background-color: var(--control-bg);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-sm);
                }
                .filter-button:hover {
                    background-color: var(--control-bg-on-hover);
                    text-decoration: none;
                }
                .filter-button.active {
                    background-color: var(--control-bg);
                    border-color: var(--primary-color);
                    color: var(--text-color);
                }
                .filter-icon {
                    display: flex;
                    align-items: center;
                    color: inherit;
                }
                .filter-icon svg {
                    width: 12px;
                    height: 12px;
                }
                .filter-count {
                    font-size: 0.9em;
                    color: inherit;
                    margin-left: 2px;
                }
                .common-filter-container {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 4px;
                    background: var(--fg-color);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius-md);
                    box-shadow: var(--shadow-base);
                    min-width: 500px;
                    z-index: 101;
                    padding: 15px;
                }
            `;
            document.head.appendChild(styleSheet);

            // Add click outside handler
            document.addEventListener('click', (e) => {
                const filterSections = document.querySelectorAll('.common-filter-section');
                filterSections.forEach(section => {
                    if (!section.contains(e.target)) {
                        const container = section.querySelector('.common-filter-container');
                        const button = section.querySelector('.filter-button');
                        if (container) {
                            $(container).hide();
                        }
                        if (button) {
                            $(button).removeClass('active');
                        }
                    }
                });
            });
        }
    }
}
