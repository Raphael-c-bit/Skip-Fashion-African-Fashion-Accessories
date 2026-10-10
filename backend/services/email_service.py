
import os
import smtplib
from email.message import EmailMessage


def build_order_confirmation_email(order):
    customer_name = order.shipping_name
    item_lines = []

    for item in order.items:
        variant_text = f" - {item.variant_name}" if item.variant_name else ""
        item_lines.append(
            f"{item.product_name}{variant_text}"
            f" x {item.quantity}"
            f" = {order.currency} {item.subtotal:,.2f}"
        )

    items_text = "\n".join(item_lines)
    subject = f"Order Confirmation - {order.order_number}"

    body = f"""Hello {customer_name},

Thank you for your order with Skip Fashion.

Your order has been received successfully.

Order Number: {order.order_number}

Items:
{items_text}

Subtotal: {order.currency} {order.subtotal:,.2f}
Shipping: {order.currency} {order.shipping_fee:,.2f}
Total: {order.currency} {order.total_amount:,.2f}

Delivery Information:
Name: {order.shipping_name}
Phone: {order.shipping_phone}
Address: {order.shipping_address}
City: {order.shipping_city}
State: {order.shipping_state}

Order Status: {order.status}

We will contact you with further updates.

Thank you,
Skip Fashion
"""

    return {"subject": subject, "body": body}


def build_order_status_email(order):
    subject = f"Order Update - {order.order_number}"

    body = f"""Hello {order.shipping_name},

There is an update to your Skip Fashion order.

Order Number: {order.order_number}

Current Status: {order.status}

Order Total:
{order.currency} {order.total_amount:,.2f}

Delivery Information:
Name: {order.shipping_name}
Phone: {order.shipping_phone}
Address: {order.shipping_address}
City: {order.shipping_city}
State: {order.shipping_state}

Thank you,
Skip Fashion
"""

    return {"subject": subject, "body": body}


def build_admin_order_email(order):
    subject = f"New Order - {order.order_number}"
    item_lines = []

    for item in order.items:
        variant_text = f" - {item.variant_name}" if item.variant_name else ""
        item_lines.append(
            f"- {item.product_name}{variant_text}"
            f" x {item.quantity}"
            f" = {order.currency} {item.subtotal:,.2f}"
        )

    items_text = "\n".join(item_lines)

    body = f"""A new order has been received.

Order Number: {order.order_number}

Customer:
Name: {order.shipping_name}
Phone: {order.shipping_phone}

Delivery:
Address: {order.shipping_address}
City: {order.shipping_city}
State: {order.shipping_state}

Items:
{items_text}

Subtotal:
{order.currency} {order.subtotal:,.2f}

Shipping:
{order.currency} {order.shipping_fee:,.2f}

Total:
{order.currency} {order.total_amount:,.2f}

Status:
{order.status}
"""

    return {"subject": subject, "body": body}


def get_smtp_settings():
    host = os.getenv("SMTP_HOST", "").strip()
    port_value = os.getenv("SMTP_PORT", "587").strip()
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "")
    from_email = os.getenv("SMTP_FROM_EMAIL", "").strip()
    from_name = os.getenv(
        "SMTP_FROM_NAME",
        "Skip Fashion"
    ).strip()
    use_tls_value = os.getenv("SMTP_USE_TLS", "true").strip().lower()

    try:
        port = int(port_value)
    except (TypeError, ValueError):
        raise ValueError("SMTP_PORT must be a valid number")

    return {
        "host": host,
        "port": port,
        "username": username,
        "password": password,
        "from_email": from_email,
        "from_name": from_name,
        "use_tls": use_tls_value in {"1", "true", "yes", "on"}
    }


def send_email(recipient, subject, body):
    if not recipient:
        return {
            "success": False,
            "sent": False,
            "message": "Recipient email is required"
        }

    try:
        settings = get_smtp_settings()
    except ValueError as error:
        return {
            "success": False,
            "sent": False,
            "message": str(error)
        }

    required_settings = {
        "SMTP_HOST": settings["host"],
        "SMTP_FROM_EMAIL": settings["from_email"]
    }

    missing_settings = [
        name for name, value in required_settings.items() if not value
    ]

    if missing_settings:
        return {
            "success": False,
            "sent": False,
            "message": (
                "SMTP is not configured. Missing: "
                + ", ".join(missing_settings)
            )
        }

    if bool(settings["username"]) != bool(settings["password"]):
        return {
            "success": False,
            "sent": False,
            "message": "SMTP_USERNAME and SMTP_PASSWORD must both be set or both be empty."
        }

    message = EmailMessage()
    message["From"] = (
        f"{settings['from_name']} <{settings['from_email']}>"
    )
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(
            settings["host"],
            settings["port"],
            timeout=20
        ) as smtp:
            if settings["use_tls"]:
                smtp.starttls()

            if settings["username"]:
                smtp.login(settings["username"], settings["password"])
            smtp.send_message(message)

        return {
            "success": True,
            "sent": True,
            "recipient": recipient,
            "subject": subject
        }
    except Exception as error:
        return {
            "success": False,
            "sent": False,
            "recipient": recipient,
            "subject": subject,
            "message": str(error)
        }


def send_password_reset_code(user, code):
    subject = "Your Skip Fashion password reset code"
    body = f"""Hello {user.name},

Your six-digit password reset code is:

{code}

This code expires in 10 minutes and can only be used once. If you did not
request a password reset, you can ignore this message.

Skip Fashion
"""

    return {
        **send_email(user.email, subject, body),
        "type": "password_reset"
    }


def send_order_confirmation(order):
    email = build_order_confirmation_email(order)
    recipient = order.user.email if order.user else None

    if not recipient:
        return {
            "success": False,
            "type": "order_confirmation",
            "subject": email["subject"],
            "body": email["body"],
            "sent": False,
            "message": "Customer email address is unavailable"
        }

    result = send_email(recipient, email["subject"], email["body"])

    return {**result, "type": "order_confirmation", "body": email["body"]}


def send_order_status_update(order):
    email = build_order_status_email(order)
    recipient = order.user.email if order.user else None

    if not recipient:
        return {
            "success": False,
            "type": "order_status_update",
            "subject": email["subject"],
            "body": email["body"],
            "sent": False,
            "message": "Customer email address is unavailable"
        }

    result = send_email(recipient, email["subject"], email["body"])

    return {**result, "type": "order_status_update", "body": email["body"]}


def send_admin_order_notification(order):
    email = build_admin_order_email(order)
    admin_email = os.getenv("ADMIN_EMAIL", "").strip()

    if not admin_email:
        return {
            "success": False,
            "type": "admin_order_notification",
            "subject": email["subject"],
            "body": email["body"],
            "sent": False,
            "message": "ADMIN_EMAIL is not configured"
        }

    result = send_email(admin_email, email["subject"], email["body"])

    return {
        **result,
        "type": "admin_order_notification",
        "body": email["body"]
    }
