const formaDate = (date) => {
    let my_date_format = frappe.sys_defaults?.date_format;
    let d = new Date(date);
    let formatted_date = '';

    const padZero = (num) => (num < 10 ? '0' : '') + num;

    const day = padZero(d.getDate());
    const month = padZero(d.getMonth() + 1); // Months are zero-based
    const year = d.getFullYear();

    if (my_date_format === 'dd-mm-yyyy') {
        formatted_date = `${day}-${month}-${year}`;
    } else if (my_date_format === 'mm-dd-yyyy') {
        formatted_date = `${month}-${day}-${year}`;
    } else if (my_date_format === 'yyyy-mm-dd') {
        formatted_date = `${year}-${month}-${day}`;
    } else if (my_date_format === 'yyyy-dd-mm') {
        formatted_date = `${year}-${day}-${month}`;
    } else if (my_date_format === 'dd/mm/yyyy') {
        formatted_date = `${day}/${month}/${year}`;
    } else if (my_date_format === 'dd.mm.yyyy') {
        formatted_date = `${day}.${month}.${year}`;
    } else if (my_date_format === 'mm/dd/yyyy') {
        formatted_date = `${month}/${day}/${year}`;
    } else {
        formatted_date = `${year}/${month}/${day}`;
    }
    return formatted_date;
};

function formatCurrency(amount, currencyCode) {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
    });
    return formatter.format(amount);
}

function formatCurrencyWithSuffix(amount) {
    let currencyCode = frappe.sys_defaults?.currency;
    const suffixMaps = {
        INR: [
            { threshold: 10000000, suffix: 'Cr', divisor: 10000000 },
            { threshold: 100000, suffix: 'L', divisor: 100000 }
        ],
        default: [
            { threshold: 1000000000, suffix: 'B', divisor: 1000000000 },
            { threshold: 1000000, suffix: 'M', divisor: 1000000 },
            { threshold: 1000, suffix: 'K', divisor: 1000 }
        ]
    };

    const suffixes = suffixMaps[currencyCode] || suffixMaps.default;
    const absAmount = Math.abs(amount);

    for (const { threshold, suffix, divisor } of suffixes) {
        if (absAmount >= threshold) {
            return formatCurrency(amount / divisor, currencyCode) + ' ' + suffix;
        }
    }

    return formatCurrency(amount, currencyCode);
}

function custom_eval(expr,doc) {
    if (expr.startsWith('eval:')) {
        expr = expr.slice(5);
    }
    let result = new Function('doc', `return ${expr};`)(doc);
    return result;
}
function getDistrictRoute(state_name){
    let base_route = '/assets/frappe_theme/boundaries/district/'
    state_name = state_name?.replace("&","and");
    let state = state_name?.toLowerCase()?.split(" ")?.join("-");
    const final_route = `${base_route}${state}.json`
    return final_route;
};
frappe.utils.format_currency = formatCurrencyWithSuffix;
frappe.utils.custom_eval = custom_eval;
frappe.utils.get_district_json_route = getDistrictRoute;


function showFieldError({ context, fieldname, message, color = 'red' }) {
    // Determine if it's a dialog or form
    const isDialog = context?.$wrapper && context.get_value;
    const isForm = context?.fields_dict && context.doc;

    // Select input element using fieldname
    const input = document.querySelector(`div[data-fieldname="${fieldname}"] input`);
    if (input) {
        input.style.border = `1px solid ${color}`;
    }

    // Show error message
    if (isDialog && context?.show_message) {
        context.show_message('');
        context.show_message(__(message), color);
        return;
    } else if (isForm) {
        frappe.msgprint({
            message: __(message),
            indicator: color,
            title: __('Validation Error'),
        });
        return;
    }
}

function hideFieldError({ context, fieldname }) {
    const isDialog = context?.$wrapper && context.get_value;
    const input = document.querySelector(`div[data-fieldname="${fieldname}"] input`);
    if (input) {
        input.style.border = "none";
    }
    if (isDialog && context.show_message) {
        context.show_message('');
    }
}

frappe.utils.showFieldError = showFieldError;
frappe.utils.hideFieldError = hideFieldError;
