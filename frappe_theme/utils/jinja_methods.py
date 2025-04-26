import frappe

def format_currency(value):
    value = float(value)
    currency_type = frappe.get_doc("System Settings").currency

    if currency_type == "USD":
        formatted_value = "{:,.2f}".format(value)
    elif currency_type == "INR":
        s = "{:.2f}".format(value)
        x = s.split(".")[0]
        d = s.split(".")[1]

        if len(x) > 3:
            last3 = x[-3:]
            rest = x[:-3]
            
            rest = ",".join([rest[max(i-2,0):i] for i in range(len(rest), 0, -2)][::-1])
            formatted_value = rest + ',' + last3 + "." + d
        else:
            formatted_value = x + "." + d
    else:
        formatted_value = str(value)

    return formatted_value
