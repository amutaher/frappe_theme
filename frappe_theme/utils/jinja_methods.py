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


def approver_details(dt, dn):
    try:
        if not dt or not dn:
            return ""
        if frappe.db.exists("Workflow Action", {"reference_doctype": dt, "reference_name": dn,"status":"Completed"}):
            wa = frappe.get_list("Workflow Action", filters={"reference_doctype": dt, "reference_name": dn,"status":"Completed"}, pluck="completed_by",ignore_permissions=True)
            if wa:
                user_details = frappe.get_list("SVA User", filters={"email": wa[0]},fields=["name","first_name","last_name","email"],ignore_permissions=True)
                details = {}
                if user_details[0].last_name:
                    details['full_name'] = user_details[0].first_name + " " + user_details[0].last_name
                else:
                    details['full_name'] = user_details[0].first_name
                details['email'] = user_details[0].email
                return details

            else:
                return ""
        else:
            return ""
    except Exception as e:
        frappe.log_error('error in approver details',frappe.get_traceback())
        return ""

