
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