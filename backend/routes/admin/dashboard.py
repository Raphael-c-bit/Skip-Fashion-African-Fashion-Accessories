from flask import Blueprint, jsonify
from sqlalchemy import func

from extensions import db
from models.user import User
from models.product import Product
from models.category import Category
from models.order import Order
from utils.decorators import admin_required


dashboard_bp = Blueprint(
    "admin_dashboard",
    __name__,
    url_prefix="/api/admin"
)


@dashboard_bp.get("/dashboard")
@admin_required
def get_dashboard():
    total_orders = Order.query.count()

    total_customers = User.query.filter_by(
        role="customer"
    ).count()

    total_products = Product.query.count()

    pending_orders = Order.query.filter_by(
        status="pending"
    ).count()

    processing_orders = Order.query.filter_by(
        status="processing"
    ).count()

    completed_orders = Order.query.filter_by(
        status="completed"
    ).count()

    cancelled_orders = Order.query.filter_by(
        status="cancelled"
    ).count()

    recent_orders = (
        Order.query
        .order_by(Order.created_at.desc())
        .limit(10)
        .all()
    )

    recent_orders_data = []

    for order in recent_orders:
        recent_orders_data.append({
            "id": order.id,
            "order_number": order.order_number,
            "user_id": order.user_id,
            "customer_name": order.shipping_name,
            "customer_phone": order.shipping_phone,
            "status": order.status,
            "payment_status": order.payment_status,
            "total_amount": order.total_amount,
            "currency": order.currency,
            "created_at": (
                order.created_at.isoformat()
                if order.created_at
                else None
            )
        })

    return jsonify({
        "success": True,
        "dashboard": {
            "stats": {
                "total_orders": total_orders,
                "total_customers": total_customers,
                "total_products": total_products,
                "pending_orders": pending_orders
            },
            "order_status": {
                "pending": pending_orders,
                "processing": processing_orders,
                "completed": completed_orders,
                "cancelled": cancelled_orders
            },
            "recent_orders": recent_orders_data
        }
    }), 200