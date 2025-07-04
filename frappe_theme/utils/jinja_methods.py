import frappe
import jwt
from hashlib import sha256
from frappe.utils import now_datetime

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
                if user_details:
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
        else:
            return ""
    except Exception as e:
        frappe.log_error('error in approver details',frappe.get_traceback())
        return ""

@frappe.whitelist()
def incode_url(url):
    secret = frappe.conf.get("jwt_secret")
    token = jwt.encode({'url':url}, secret, algorithm="HS256")
    decode_url(token)


def decode_url(token):
    secret = frappe.conf.get("jwt_secret")
    decoded = jwt.decode(token, secret, algorithms=["HS256"])
    path = decoded.get('url')

    base_url = frappe.get_conf().get('hostname')
    redirect_url = f"{base_url}/{path}"
    frappe.local.response["type"] = "redirect"
    frappe.local.response["location"] = redirect_url

def get_loging_url(email):
    is_signup = frappe.db.get_single_value('My Theme','disable_usr_pass_login')
    frappe.log_error("is_signuphhh", is_signup)
    if is_signup:
        conf = frappe.get_conf()
        baseurl = conf.get("hostname")
        url = f"{baseurl}/login?email={email}"
        frappe.log_error("url1", url)
        return url
    else:
        key = frappe.generate_hash()
        hashed_key = sha256(key.encode("utf-8")).hexdigest()
        
        frappe.db.set_value("User", email, "reset_password_key", hashed_key)
        frappe.db.set_value("User", email, "last_reset_password_key_generated_on", now_datetime())
        
        url = f"/update-password?key={key}"
        frappe.log_error("url2", url)
        return url

def get_primary_donor_name():
    try:
        mg = frappe.get_doc("mGrant Settings")
        donor = frappe.get_doc("Donor", mg.primary_donor)
        return donor.donor_name
    except Exception as e:
        frappe.log_error(f"Error in getting primary donor: {e}")
        return {}