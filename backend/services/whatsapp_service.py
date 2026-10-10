import os
from urllib.parse import quote

DEFAULT_WHATSAPP_BUSINESS_NUMBER = "2348075344214"


def get_business_whatsapp_number():
    return (
        os.getenv(
            "WHATSAPP_BUSINESS_NUMBER",
            DEFAULT_WHATSAPP_BUSINESS_NUMBER
        )
        .strip()
        or DEFAULT_WHATSAPP_BUSINESS_NUMBER
    )


def normalize_whatsapp_number(whatsapp_number):
    if not whatsapp_number:
        raise ValueError("WhatsApp number is required")

    clean_number = (
        str(whatsapp_number)
        .strip()
        .replace("+", "")
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    if not clean_number:
        raise ValueError("WhatsApp number is required")

    if not clean_number.isdigit():
        raise ValueError(
            "WhatsApp number must contain only digits"
        )

    return clean_number


def build_order_message(order):
    lines = [
        "Hello Skip Fashion,",
        "",
        "I would like to confirm my order.",
        "",
        f"Order Number: {order.order_number}",
        f"Customer: {order.shipping_name}",
        f"Phone: {order.shipping_phone}",
        "",
        "Items:"
    ]

    for item in order.items:
        variant_text = (
            f" ({item.variant_name})"
            if item.variant_name
            else ""
        )

        lines.append(
            f"- {item.product_name}"
            f"{variant_text}"
            f" x {item.quantity}"
            f" = {order.currency} "
            f"{item.subtotal:,.2f}"
        )

    lines.extend([
        "",
        f"Subtotal: {order.currency} "
        f"{order.subtotal:,.2f}",

        f"Shipping: {order.currency} "
        f"{order.shipping_fee:,.2f}",

        f"Total: {order.currency} "
        f"{order.total_amount:,.2f}",

        "",
        "Delivery Information:",
        f"Name: {order.shipping_name}",
        f"Phone: {order.shipping_phone}",
        f"Address: {order.shipping_address}",
        f"City: {order.shipping_city}",
        f"State: {order.shipping_state}",
        "",
        f"Order Status: {order.status}",
        "",
        "Please confirm the order and the next steps."
    ])

    return "\n".join(lines)


def build_whatsapp_url(order, whatsapp_number):
    clean_number = normalize_whatsapp_number(
        whatsapp_number
    )

    message = build_order_message(order)

    encoded_message = quote(
        message,
        safe=""
    )

    return (
        f"https://wa.me/"
        f"{clean_number}"
        f"?text={encoded_message}"
    )


def build_admin_order_message(order):
    lines = [
        "New Skip Fashion Attire Order",
        "",
        f"Order Number: {order.order_number}",
        f"Customer: {order.shipping_name}",
        f"Phone: {order.shipping_phone}",
        "",
        "Items:"
    ]

    for item in order.items:
        variant_text = (
            f" ({item.variant_name})"
            if item.variant_name
            else ""
        )

        lines.append(
            f"- {item.product_name}"
            f"{variant_text}"
            f" x {item.quantity}"
        )

    lines.extend([
        "",
        f"Subtotal: {order.currency} "
        f"{order.subtotal:,.2f}",

        f"Shipping: {order.currency} "
        f"{order.shipping_fee:,.2f}",

        f"Total: {order.currency} "
        f"{order.total_amount:,.2f}",

        "",
        f"Status: {order.status}"
    ])

    return "\n".join(lines)