from flask import Blueprint, jsonify
from sqlalchemy import func

from extensions import db
from models.user import User
from models.order import Order
from utils.decorators import admin_required


customers_bp = Blueprint(
    "admin_customers",
    __name__,
    url_prefix="/api/admin/customers"
)


@customers_bp.get("")
@admin_required
def get_customers():
    customers = (
        db.session.query(
            User.id,
            User.name,
            User.email,
            User.phone,
            User.created_at,
            func.count(Order.id).label("order_count"),
            func.coalesce(
                func.sum(Order.total_amount),
                0
            ).label("total_spending")
        )
        .outerjoin(
            Order,
            (Order.user_id == User.id) &
            (Order.status != "cancelled")
        )
        .filter(User.role == "customer")
        .group_by(
            User.id,
            User.name,
            User.email,
            User.phone,
            User.created_at
        )
        .order_by(User.created_at.desc())
        .all()
    )

    customer_list = []

    for customer in customers:
        customer_list.append({
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "order_count": customer.order_count,
            "total_spending": float(customer.total_spending or 0),
            "currency": "NGN",
            "created_at": (
                customer.created_at.isoformat()
                if customer.created_at
                else None
            )
        })

    return jsonify({
        "success": True,
        "customers": customer_list,
        "total_customers": len(customer_list)
    }), 200


@customers_bp.get("/<int:customer_id>")
@admin_required
def get_customer_details(customer_id):
    customer = db.session.get(User, customer_id)

    if not customer:
        return jsonify({
            "success": False,
            "message": "Customer not found"
        }), 404

    if customer.role != "customer":
        return jsonify({
            "success": False,
            "message": "The requested user is not a customer"
        }), 404

    orders = (
        Order.query
        .filter(
            Order.user_id == customer.id,
            Order.status != "cancelled"
        )
        .order_by(Order.created_at.desc())
        .all()
    )

    total_spending = sum(
        float(order.total_amount or 0)
        for order in orders
    )

    order_history = []

    for order in orders:
        order_history.append({
            "id": order.id,
            "order_number": order.order_number,
            "status": order.status,
            "payment_status": order.payment_status,
            "subtotal": float(order.subtotal or 0),
            "shipping_fee": float(order.shipping_fee or 0),
            "total_amount": float(order.total_amount or 0),
            "currency": order.currency,
            "shipping_name": order.shipping_name,
            "shipping_phone": order.shipping_phone,
            "shipping_address": order.shipping_address,
            "shipping_city": order.shipping_city,
            "shipping_state": order.shipping_state,
            "notes": order.notes,
            "created_at": (
                order.created_at.isoformat()
                if order.created_at
                else None
            ),
            "updated_at": (
                order.updated_at.isoformat()
                if order.updated_at
                else None
            )
        })

    return jsonify({
        "success": True,
        "customer": {
            "id": customer.id,
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
            "role": customer.role,
            "created_at": (
                customer.created_at.isoformat()
                if customer.created_at
                else None
            ),
            "updated_at": (
                customer.updated_at.isoformat()
                if customer.updated_at
                else None
            )
        },
        "statistics": {
            "order_count": len(orders),
            "total_spending": total_spending,
            "currency": "NGN"
        },
        "orders": order_history
    }), 200