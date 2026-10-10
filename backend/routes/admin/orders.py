from flask import Blueprint, request, jsonify

from services.order_service import (
    get_order_by_id,
    update_order_status
)
from services.email_service import send_order_status_update
from utils.decorators import admin_required


admin_orders_bp = Blueprint(
    "admin_orders",
    __name__,
    url_prefix="/api/admin/orders"
)


@admin_orders_bp.get("")
@admin_required
def get_all_orders():
    from models.order import Order

    orders = Order.query.order_by(
        Order.created_at.desc()
    ).all()

    return jsonify({
        "success": True,
        "orders": [
            order.to_dict()
            for order in orders
        ]
    }), 200


@admin_orders_bp.get("/<int:order_id>")
@admin_required
def get_admin_order(order_id):
    order = get_order_by_id(order_id)

    if not order:
        return jsonify({
            "success": False,
            "message": "Order not found"
        }), 404

    return jsonify({
        "success": True,
        "order": order.to_dict()
    }), 200


@admin_orders_bp.patch("/<int:order_id>/status")
@admin_required
def update_admin_order_status(order_id):
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body is required"
        }), 400

    status = data.get("status")

    if not status:
        return jsonify({
            "success": False,
            "message": "Order status is required"
        }), 400

    try:
        order = update_order_status(
            order_id,
            status
        )

    except LookupError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 404

    except ValueError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 400

    email_result = None

    try:
        email_result = send_order_status_update(order)
    except Exception as error:
        email_result = {
            "success": False,
            "sent": False,
            "message": str(error)
        }

    return jsonify({
        "success": True,
        "message": "Order status updated successfully",
        "order": order.to_dict(),
        "email": email_result
    }), 200