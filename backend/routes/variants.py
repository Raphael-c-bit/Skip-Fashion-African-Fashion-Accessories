from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from extensions import db
from models.product import Product
from models.product_variant import ProductVariant
from utils.decorators import admin_required


variants_bp = Blueprint(
    "admin_variants",
    __name__,
    url_prefix="/api/admin/variants"
)


def get_variant_or_404(variant_id):
    variant = db.session.get(ProductVariant, variant_id)

    if not variant:
        return None, (
            jsonify({
                "success": False,
                "message": "Variant not found"
            }),
            404
        )

    return variant, None


def parse_boolean(value, field_name):
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        value_lower = value.strip().lower()

        if value_lower == "true":
            return True

        if value_lower == "false":
            return False

    raise ValueError(f"{field_name} must be true or false")


@variants_bp.get("")
@jwt_required()
@admin_required
def get_variants():
    variants = (
        ProductVariant.query
        .order_by(ProductVariant.created_at.desc())
        .all()
    )

    return jsonify({
        "success": True,
        "variants": [variant.to_dict() for variant in variants],
        "total_variants": len(variants)
    }), 200


@variants_bp.get("/<int:variant_id>")
@jwt_required()
@admin_required
def get_variant(variant_id):
    variant, error_response = get_variant_or_404(variant_id)

    if error_response:
        return error_response

    return jsonify({
        "success": True,
        "variant": variant.to_dict()
    }), 200


@variants_bp.post("")
@jwt_required()
@admin_required
def create_variant():
    data = request.get_json(silent=True) or {}

    required_fields = [
        "product_id",
        "option_type",
        "option_value"
    ]

    missing_fields = [
        field
        for field in required_fields
        if data.get(field) in (None, "")
    ]

    if missing_fields:
        return jsonify({
            "success": False,
            "message": "Missing required fields",
            "missing_fields": missing_fields
        }), 400

    try:
        product_id = int(data.get("product_id"))
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "product_id must be a valid number"
        }), 400

    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({
            "success": False,
            "message": "Product not found"
        }), 404

    option_type = str(data.get("option_type")).strip()
    option_value = str(data.get("option_value")).strip()

    if not option_type:
        return jsonify({
            "success": False,
            "message": "option_type cannot be empty"
        }), 400

    if not option_value:
        return jsonify({
            "success": False,
            "message": "option_value cannot be empty"
        }), 400

    try:
        stock_quantity = int(data.get("stock_quantity", 0))

        if stock_quantity < 0:
            return jsonify({
                "success": False,
                "message": "stock_quantity cannot be negative"
            }), 400

        is_available = True

        if "is_available" in data:
            is_available = parse_boolean(
                data.get("is_available"),
                "is_available"
            )

        variant = ProductVariant()

        variant.product_id = product_id
        variant.option_type = option_type
        variant.option_value = option_value
        variant.color_name = data.get("color_name")
        variant.color_code = data.get("color_code")
        variant.stock_quantity = stock_quantity
        variant.is_available = is_available

        db.session.add(variant)
        db.session.commit()
        db.session.refresh(variant)

        return jsonify({
            "success": True,
            "message": "Product variant created successfully",
            "variant": variant.to_dict()
        }), 201

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to create product variant because of a database constraint"
        }), 409

    except (TypeError, ValueError) as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": str(error)
        }), 400

    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to create product variant"
        }), 500


@variants_bp.patch("/<int:variant_id>")
@jwt_required()
@admin_required
def update_variant(variant_id):
    variant, error_response = get_variant_or_404(variant_id)

    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}

    try:
        if "product_id" in data:
            product_id = int(data.get("product_id"))

            product = db.session.get(Product, product_id)

            if not product:
                return jsonify({
                    "success": False,
                    "message": "Product not found"
                }), 404

            variant.product_id = product_id

        if "option_type" in data:
            option_type = str(data.get("option_type")).strip()

            if not option_type:
                return jsonify({
                    "success": False,
                    "message": "option_type cannot be empty"
                }), 400

            variant.option_type = option_type

        if "option_value" in data:
            option_value = str(data.get("option_value")).strip()

            if not option_value:
                return jsonify({
                    "success": False,
                    "message": "option_value cannot be empty"
                }), 400

            variant.option_value = option_value

        if "color_name" in data:
            variant.color_name = data.get("color_name")

        if "color_code" in data:
            variant.color_code = data.get("color_code")

        if "stock_quantity" in data:
            stock_quantity = int(data.get("stock_quantity"))

            if stock_quantity < 0:
                return jsonify({
                    "success": False,
                    "message": "stock_quantity cannot be negative"
                }), 400

            variant.stock_quantity = stock_quantity

        if "is_available" in data:
            variant.is_available = parse_boolean(
                data.get("is_available"),
                "is_available"
            )

        db.session.commit()
        db.session.refresh(variant)

        return jsonify({
            "success": True,
            "message": "Product variant updated successfully",
            "variant": variant.to_dict()
        }), 200

    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to update product variant because of a database constraint"
        }), 409

    except (TypeError, ValueError) as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": str(error)
        }), 400

    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to update product variant"
        }), 500


@variants_bp.delete("/<int:variant_id>")
@jwt_required()
@admin_required
def delete_variant(variant_id):
    variant, error_response = get_variant_or_404(variant_id)

    if error_response:
        return error_response

    try:
        db.session.delete(variant)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Product variant deleted successfully"
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to delete product variant"
        }), 500


@variants_bp.patch("/<int:variant_id>/stock")
@jwt_required()
@admin_required
def update_variant_stock(variant_id):
    variant, error_response = get_variant_or_404(variant_id)

    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}

    if "stock_quantity" not in data:
        return jsonify({
            "success": False,
            "message": "stock_quantity is required"
        }), 400

    try:
        stock_quantity = int(data.get("stock_quantity"))

        if stock_quantity < 0:
            return jsonify({
                "success": False,
                "message": "Stock quantity cannot be negative"
            }), 400

        variant.stock_quantity = stock_quantity

        db.session.commit()
        db.session.refresh(variant)

        return jsonify({
            "success": True,
            "message": "Variant stock updated successfully",
            "variant": variant.to_dict()
        }), 200

    except (TypeError, ValueError):
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "stock_quantity must be a valid number"
        }), 400

    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to update variant stock"
        }), 500


@variants_bp.patch("/<int:variant_id>/status")
@jwt_required()
@admin_required
def update_variant_status(variant_id):
    variant, error_response = get_variant_or_404(variant_id)

    if error_response:
        return error_response

    data = request.get_json(silent=True) or {}

    if "is_available" not in data:
        return jsonify({
            "success": False,
            "message": "is_available is required"
        }), 400

    try:
        variant.is_available = parse_boolean(
            data.get("is_available"),
            "is_available"
        )

        db.session.commit()
        db.session.refresh(variant)

        return jsonify({
            "success": True,
            "message": "Variant availability updated successfully",
            "variant": variant.to_dict()
        }), 200

    except (TypeError, ValueError) as error:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": str(error)
        }), 400

    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to update variant availability"
        }), 500