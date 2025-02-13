frappe.ui.form.on('Visualization Mapper', {
    setup: function (frm) {
        frm.set_query('doctype_field', function () {
            return {
                filters: {
                    istable: 0
                }
            };
        });
    },

    doctype_field: function (frm) {
        if (!frm.doc.doctype_field) return;

        // Get HTML fields from the selected doctype
        frappe.call({
            method: 'frappe_theme.api.get_html_fields',
            args: {
                doctype: frm.doc.doctype_field
            },
            callback: function (r) {
                if (r.message) {
                    // Update wrapper_field options for both cards and charts
                    if (frm.fields_dict.cards) {
                        frm.fields_dict.cards.grid.update_docfield_property(
                            'wrapper_field',
                            'options',
                            r.message
                        );
                        frm.refresh_field('cards');
                    }

                    if (frm.fields_dict.charts) {
                        frm.fields_dict.charts.grid.update_docfield_property(
                            'wrapper_field',
                            'options',
                            r.message
                        );
                        frm.refresh_field('charts');
                    }

                    if (r.message.length === 0) {
                        frappe.show_alert({
                            message: __('No HTML fields found in the selected DocType'),
                            indicator: 'orange'
                        });
                    }
                }
            }
        });
    },

    refresh: function (frm) {
        frm.trigger('doctype_field');
        frm.trigger('update_sequences');
    },

    mapper_type: function (frm) {
        frm.trigger('update_sequences');

        // Clear irrelevant data based on mapper type
        if (frm.doc.mapper_type === 'Number Card') {
            frm.clear_table('charts');
            frm.refresh_field('charts');
        } else if (frm.doc.mapper_type === 'Dashboard Chart') {
            frm.clear_table('cards');
            frm.refresh_field('cards');
        }
    },

    update_sequences: function (frm) {
        if (frm.doc.mapper_type === 'Number Card' || frm.doc.mapper_type === 'Both') {
            frm.trigger('update_card_sequence');
        }
        if (frm.doc.mapper_type === 'Dashboard Chart' || frm.doc.mapper_type === 'Both') {
            frm.trigger('update_chart_sequence');
        }
    },

    update_card_sequence: function (frm) {
        if (frm.doc.cards && frm.doc.cards.length) {
            frm.doc.cards.forEach((card, idx) => {
                frappe.model.set_value(card.doctype, card.name, 'sequence', idx + 1);
                if (card.number_card && !card.card_label) {
                    update_card_label(frm, card);
                }
            });
            frm.refresh_field('cards');
        }
    },

    update_chart_sequence: function (frm) {
        if (frm.doc.charts && frm.doc.charts.length) {
            frm.doc.charts.forEach((chart, idx) => {
                frappe.model.set_value(chart.doctype, chart.name, 'sequence', idx + 1);
                if (chart.dashboard_chart && !chart.chart_label) {
                    update_chart_label(frm, chart);
                }
            });
            frm.refresh_field('charts');
        }
    },

    validate: function (frm) {
        frm.trigger('update_sequences');
    }
});

// Number Card Child table handling
frappe.ui.form.on('Number Card Child', {
    cards_add: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.sequence = (frm.doc.cards || []).length;
        row.is_visible = 1;
        frm.refresh_field('cards');
    },

    cards_move: function (frm) {
        frm.trigger('update_card_sequence');
    },

    cards_remove: function (frm) {
        frm.trigger('update_card_sequence');
    },

    number_card: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.number_card) return;

        // // Check for duplicates
        // let duplicate = frm.doc.cards.find(card =>
        //     card.name !== row.name &&
        //     card.number_card === row.number_card
        // );

        // if (duplicate) {
        //     // Clear the selection
        //     frappe.model.set_value(cdt, cdn, 'number_card', '');
        //     frappe.throw(__(`Number Card "${row.number_card}" is already selected in row ${duplicate.idx}`));
        //     return;
        // }

        // If no duplicate, update the label
        update_card_label(frm, row);
    },

    form_render: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.icon_type === 'FontAwesome') {
            setup_icon_picker(frm, row);
        }
    },

    icon_type: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.icon_type === 'FontAwesome') {
            setup_icon_picker(frm, row);
        }
    }
});

// Dashboard Chart Child table handling
frappe.ui.form.on('Dashboard Chart Child', {
    charts_add: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        row.sequence = (frm.doc.charts || []).length;
        row.is_visible = 1;
        row.chart_height = 300;
        row.show_legend = 1;
        frm.refresh_field('charts');
    },

    charts_move: function (frm) {
        frm.trigger('update_chart_sequence');
    },

    charts_remove: function (frm) {
        frm.trigger('update_chart_sequence');
    },

    dashboard_chart: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.dashboard_chart) return;

        // // Check for duplicates
        // let duplicate = frm.doc.charts.find(chart =>
        //     chart.name !== row.name &&
        //     chart.dashboard_chart === row.dashboard_chart
        // );

        // if (duplicate) {
        //     // Clear the selection
        //     frappe.model.set_value(cdt, cdn, 'dashboard_chart', '');
        //     frappe.throw(__(`Dashboard Chart "${row.dashboard_chart}" is already selected in row ${duplicate.idx}`));
        //     return;
        // }

        // If no duplicate, update the label
        update_chart_label(frm, row);
    }
});

// Helper functions
function update_card_label(frm, row) {
    frappe.db.get_value('Number Card', row.number_card, ['label'])
        .then(r => {
            if (r.message) {
                frappe.model.set_value(row.doctype, row.name, {
                    'card_label': r.message.label
                });
            }
        });
}

function update_chart_label(frm, row) {
    frappe.db.get_value('Dashboard Chart', row.dashboard_chart, ['chart_name'])
        .then(r => {
            if (r.message) {
                frappe.model.set_value(row.doctype, row.name, {
                    'chart_label': r.message.chart_name
                });
            }
        });
}

function setup_icon_picker(frm, row) {
    let d = new frappe.ui.Dialog({
        title: 'Select FontAwesome Icon',
        fields: [
            {
                fieldname: 'icon_search',
                fieldtype: 'Data',
                label: 'Search Icons',
                description: 'Type to search FontAwesome icons'
            },
            {
                fieldname: 'icon_preview',
                fieldtype: 'HTML',
                label: 'Available Icons'
            }
        ],
        primary_action_label: 'Select',
        primary_action(values) {
            let selected_icon = d.$wrapper.find('.icon-selected').find('i').attr('class');
            if (selected_icon) {
                frappe.model.set_value(row.doctype, row.name, 'icon_value', selected_icon);
            }
            d.hide();
        }
    });

    let icons = get_fontawesome_icons();
    let icon_grid = $(`<div class="icon-grid"></div>`).appendTo(d.get_field('icon_preview').$wrapper);

    d.get_field('icon_search').$input.on('input', function () {
        let search = $(this).val().toLowerCase();
        update_icon_grid(icon_grid, icons, search);
    });

    update_icon_grid(icon_grid, icons, '');

    $(`[data-fieldname="icon_value"][data-idx="${row.idx}"]`).on('click', function () {
        d.show();
    });
}

function update_icon_grid($grid, icons, search) {
    $grid.empty();
    icons.filter(icon => icon.toLowerCase().includes(search)).forEach(icon => {
        $grid.append(`
            <div class="icon-item" data-icon="${icon}">
                <i class="fa ${icon}"></i>
                <div class="icon-name">${icon}</div>
            </div>
        `);
    });

    $grid.find('.icon-item').click(function () {
        $grid.find('.icon-item').removeClass('icon-selected');
        $(this).addClass('icon-selected');
    });
}

function get_fontawesome_icons() {
    return [
        'fa-home', 'fa-user', 'fa-users', 'fa-file', 'fa-folder',
        'fa-calendar', 'fa-clock-o', 'fa-money', 'fa-credit-card',
        'fa-shopping-cart', 'fa-truck', 'fa-box', 'fa-boxes',
        'fa-chart-line', 'fa-chart-bar', 'fa-chart-pie',
        'fa-envelope', 'fa-phone', 'fa-comment', 'fa-comments',
        'fa-star', 'fa-heart', 'fa-check', 'fa-times',
        'fa-cog', 'fa-settings', 'fa-tools', 'fa-wrench'
    ];
}
