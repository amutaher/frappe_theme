class CustomFilterArea {
	constructor({ wrapper, doctype,on_change }) {
        this.wrapper = wrapper;
        this.doctype = doctype;
        this.on_change = on_change;
        
		this.filter_component = $('<div class="filter-section flex">').appendTo(
			this.wrapper
		);
		this.setup();
	}

	setup() {
		this.make_filter_list();
	}

	get() {
		let filters = this.filter_list.get_filters();
		return filters;
	}

	make_filter_list() {
		$(`<div class="filter-selector">
			<div class="btn-group">
				<button class="btn btn-default btn-sm filter-button">
					<span class="filter-icon">
						${frappe.utils.icon("es-line-filter")}
					</span>
					<span class="button-label hidden-xs">
					${__("Filter")}
					<span>
				</button>
				<button class="btn btn-default btn-sm filter-x-button" title="${__("Clear all filters")}">
					<span class="filter-icon">
						${frappe.utils.icon("es-small-close")}
					</span>
				</button>
			</div>
		</div>`).appendTo(this.filter_component);

		this.filter_button = this.filter_component.find(".filter-button");
		this.filter_x_button = this.filter_component.find(".filter-x-button");
		this.filter_list = new CustomFilterGroup({
			parent: this.filter_component,
			doctype: this.doctype,
			filter_button: this.filter_button,
			filter_x_button: this.filter_x_button,
			default_filters: [],
			on_change: () => this.on_change(this.get()),
		});
	}
}