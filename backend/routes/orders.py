from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from services.order_service import (
    create_order_from_cart,
    get_user_orders,
    get_order_by_id,
    cancel_order as cancel_order_service
)

from services.email_service import (
    send_order_confirmation,
    send_admin_order_notification
)

from services.whatsapp_service import (
    build_order_message,
    build_whatsapp_url,
    get_business_whatsapp_number
)

import os


orders_bp = Blueprint(
    "orders",
    __name__,
    url_prefix="/api/orders"
)


def get_current_user_id():
    identity = get_jwt_identity()

    try:
        return int(identity)
    except (TypeError, ValueError):
        return None


@orders_bp.post("")
@jwt_required()
def create_order():
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body is required"
        }), 400

    try:
        order = create_order_from_cart(
            user_id=user_id,
            shipping_name=data.get("shipping_name"),
            shipping_phone=data.get("shipping_phone"),
            shipping_address=data.get("shipping_address"),
            shipping_city=data.get("shipping_city"),
            shipping_state=data.get("shipping_state"),
            shipping_fee=data.get("shipping_fee", 0),
            notes=data.get("notes")
        )

    except ValueError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 400

    email_result = {
        "success": False,
        "sent": False,
        "message": "Customer confirmation email was not sent"
    }

    admin_email_result = {
        "success": False,
        "sent": False,
        "message": "Admin notification email was not sent"
    }

    whatsapp_result = {
        "success": False,
        "message": "WhatsApp message was not generated"
    }

    try:
        email_result = send_order_confirmation(order)

    except Exception as error:
        email_result = {
            "success": False,
            "sent": False,
            "message": str(error)
        }

    try:
        admin_email_result = send_admin_order_notification(order)

    except Exception as error:
        admin_email_result = {
            "success": False,
            "sent": False,
            "message": str(error)
        }

    whatsapp_number = get_business_whatsapp_number()

    try:
        whatsapp_url = build_whatsapp_url(
            order,
            whatsapp_number
        )

        whatsapp_result = {
            "success": True,
            "message": "WhatsApp order link generated",
            "url": whatsapp_url
        }

    except ValueError as error:
        whatsapp_result = {
            "success": False,
            "message": str(error)
        }

    return jsonify({
        "success": True,
        "message": "Order created successfully",
        "order": order.to_dict(),
        "notifications": {
            "customer_email": email_result,
            "admin_email": admin_email_result,
            "whatsapp": whatsapp_result
        }
    }), 201


@orders_bp.get("")
@jwt_required()
def get_orders():
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    orders = get_user_orders(user_id)

    return jsonify({
        "success": True,
        "orders": [
            order.to_dict()
            for order in orders
        ]
    }), 200


@orders_bp.get("/<int:order_id>")
@jwt_required()
def get_order(order_id):
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    order = get_order_by_id(order_id)

    if not order:
        return jsonify({
            "success": False,
            "message": "Order not found"
        }), 404

    if order.user_id != user_id:
        return jsonify({
            "success": False,
            "message": (
                "You are not authorized to view this order"
            )
        }), 403

    return jsonify({
        "success": True,
        "order": order.to_dict()
    }), 200


@orders_bp.get("/<int:order_id>/whatsapp")
@jwt_required()
def get_order_whatsapp(order_id):
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    order = get_order_by_id(order_id)

    if not order:
        return jsonify({
            "success": False,
            "message": "Order not found"
        }), 404

    if order.user_id != user_id:
        return jsonify({
            "success": False,
            "message": (
                "You are not authorized to access this order"
            )
        }), 403

    whatsapp_number = get_business_whatsapp_number()

    try:
        whatsapp_url = build_whatsapp_url(
            order,
            whatsapp_number
        )

        message = build_order_message(order)

    except ValueError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 400

    return jsonify({
        "success": True,
        "order_number": order.order_number,
        "whatsapp_url": whatsapp_url,
        "message": message
    }), 200


@orders_bp.patch("/<int:order_id>/cancel")
@jwt_required()
def cancel_order(order_id):
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    try:
        order = cancel_order_service(
            order_id,
            user_id
        )

    except LookupError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 404

    except PermissionError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 403

    except ValueError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 400

    return jsonify({
        "success": True,
        "message": "Order cancelled successfully",
        "order": order.to_dict()
    }), 200