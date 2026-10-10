from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.cart import Cart
from models.cart_item import CartItem
from models.product import Product
from models.product_variant import ProductVariant


cart_bp = Blueprint("cart", __name__, url_prefix="/api/cart")


def get_current_user_id():
    identity = get_jwt_identity()

    try:
        return int(identity)
    except (TypeError, ValueError):
        return None


def get_or_create_cart(user_id):
    cart = Cart.query.filter_by(user_id=user_id).first()

    if not cart:
        cart = Cart(user_id=user_id)
        db.session.add(cart)
        db.session.flush()

    return cart


@cart_bp.get("")
@jwt_required()
def get_cart():
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    cart = get_or_create_cart(user_id)
    db.session.commit()

    return jsonify({
        "success": True,
        "cart": cart.to_dict()
    }), 200


@cart_bp.post("/items")
@jwt_required()
def add_to_cart():
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    data = request.get_json() or {}

    product_id = data.get("product_id")
    variant_id = data.get("variant_id")
    quantity = data.get("quantity", 1)

    if not product_id:
        return jsonify({
            "success": False,
            "message": "product_id is required"
        }), 400

    try:
        product_id = int(product_id)
        quantity = int(quantity)

        if variant_id is not None:
            variant_id = int(variant_id)
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "product_id, variant_id and quantity must be valid numbers"
        }), 400

    if quantity < 1:
        return jsonify({
            "success": False,
            "message": "Quantity must be at least 1"
        }), 400

    product = Product.query.get(product_id)

    if not product:
        return jsonify({
            "success": False,
            "message": "Product not found"
        }), 404

    if not product.is_active:
        return jsonify({
            "success": False,
            "message": "This product is currently unavailable"
        }), 400

    variant = None

    if variant_id is not None:
        variant = ProductVariant.query.filter_by(
            id=variant_id,
            product_id=product_id
        ).first()

        if not variant:
            return jsonify({
                "success": False,
                "message": "Product variant not found"
            }), 404

        if not variant.is_available:
            return jsonify({
                "success": False,
                "message": "This product variant is currently unavailable"
            }), 400

        if variant.stock_quantity is not None:
            if variant.stock_quantity < quantity:
                return jsonify({
                    "success": False,
                    "message": f"Only {variant.stock_quantity} item(s) are available"
                }), 400

    cart = get_or_create_cart(user_id)

    item = CartItem.query.filter_by(
        cart_id=cart.id,
        product_id=product_id,
        variant_id=variant_id
    ).first()

    unit_price = product.price

    if item:
        new_quantity = item.quantity + quantity

        if variant and variant.stock_quantity is not None:
            if new_quantity > variant.stock_quantity:
                return jsonify({
                    "success": False,
                    "message": f"Only {variant.stock_quantity} item(s) are available"
                }), 400

        item.quantity = new_quantity
        item.unit_price = unit_price

    else:
        item = CartItem(
            cart_id=cart.id,
            product_id=product_id,
            variant_id=variant_id,
            quantity=quantity,
            unit_price=unit_price
        )

        db.session.add(item)

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Item added to cart successfully",
        "cart": cart.to_dict()
    }), 201


@cart_bp.put("/items/<int:item_id>")
@jwt_required()
def update_cart_item(item_id):
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    data = request.get_json() or {}

    if "quantity" not in data:
        return jsonify({
            "success": False,
            "message": "quantity is required"
        }), 400

    try:
        quantity = int(data["quantity"])
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "quantity must be a valid number"
        }), 400

    cart = Cart.query.filter_by(user_id=user_id).first()

    if not cart:
        return jsonify({
            "success": False,
            "message": "Cart not found"
        }), 404

    item = CartItem.query.filter_by(
        id=item_id,
        cart_id=cart.id
    ).first()

    if not item:
        return jsonify({
            "success": False,
            "message": "Cart item not found"
        }), 404

    if quantity < 1:
        db.session.delete(item)
    else:
        if item.variant and item.variant.stock_quantity is not None:
            if quantity > item.variant.stock_quantity:
                return jsonify({
                    "success": False,
                    "message": f"Only {item.variant.stock_quantity} item(s) are available"
                }), 400

        item.quantity = quantity

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Cart updated successfully",
        "cart": cart.to_dict()
    }), 200


@cart_bp.delete("/items/<int:item_id>")
@jwt_required()
def remove_cart_item(item_id):
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    cart = Cart.query.filter_by(user_id=user_id).first()

    if not cart:
        return jsonify({
            "success": False,
            "message": "Cart not found"
        }), 404

    item = CartItem.query.filter_by(
        id=item_id,
        cart_id=cart.id
    ).first()

    if not item:
        return jsonify({
            "success": False,
            "message": "Cart item not found"
        }), 404

    db.session.delete(item)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Item removed from cart successfully",
        "cart": cart.to_dict()
    }), 200


@cart_bp.delete("")
@jwt_required()
def clear_cart():
    user_id = get_current_user_id()

    if not user_id:
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    cart = Cart.query.filter_by(user_id=user_id).first()

    if not cart:
        return jsonify({
            "success": False,
            "message": "Cart not found"
        }), 404

    CartItem.query.filter_by(cart_id=cart.id).delete(
        synchronize_session=False
    )

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Cart cleared successfully",
        "cart": cart.to_dict()
    }), 200