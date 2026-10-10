from flask import Blueprint, request, jsonify

from utils.decorators import admin_required

from services.product_service import (
    get_active_products,
    get_all_products,
    get_active_product_by_id,
    get_product_by_id,
    create_product as create_product_service,
    update_product as update_product_service,
    update_product_status as update_product_status_service,
    update_product_featured as update_product_featured_service
)


products_bp = Blueprint(
    "products",
    __name__,
    url_prefix="/api/products"
)


# ---------------------------------------------------------
# PUBLIC: GET ALL ACTIVE PRODUCTS
# ---------------------------------------------------------

@products_bp.get("")
def get_products():
    products = get_active_products()

    return jsonify({
        "success": True,
        "products": [
            product.to_dict()
            for product in products
        ],
        "total_products": len(products)
    }), 200


# ---------------------------------------------------------
# PUBLIC: GET SINGLE ACTIVE PRODUCT
# ---------------------------------------------------------

@products_bp.get("/<int:product_id>")
def get_product(product_id):
    product = get_active_product_by_id(product_id)

    if not product:
        return jsonify({
            "success": False,
            "message": "Product not found"
        }), 404

    return jsonify({
        "success": True,
        "product": product.to_dict()
    }), 200


# ---------------------------------------------------------
# ADMIN: GET ALL PRODUCTS
# ---------------------------------------------------------

@products_bp.get("/admin")
@admin_required
def get_admin_products():
    products = get_all_products()

    return jsonify({
        "success": True,
        "products": [
            product.to_dict()
            for product in products
        ],
        "total_products": len(products)
    }), 200


# ---------------------------------------------------------
# ADMIN: GET SINGLE PRODUCT
# ---------------------------------------------------------

@products_bp.get("/admin/<int:product_id>")
@admin_required
def get_admin_product(product_id):
    product = get_product_by_id(product_id)

    if not product:
        return jsonify({
            "success": False,
            "message": "Product not found"
        }), 404

    return jsonify({
        "success": True,
        "product": product.to_dict()
    }), 200


# ---------------------------------------------------------
# ADMIN: CREATE PRODUCT
# ---------------------------------------------------------

@products_bp.post("")
@admin_required
def create_product():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body is required"
        }), 400

    try:
        product = create_product_service(
            name=data.get("name"),
            slug=data.get("slug"),
            price=data.get("price"),
            category_id=data.get("category_id"),
            product_type=data.get("product_type"),
            description=data.get("description"),
            currency=data.get("currency", "NGN"),
            is_featured=data.get("is_featured", False)
        )

    except LookupError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 404

    except ValueError as error:
        message = str(error)

        if message == "A product with this slug already exists":
            return jsonify({
                "success": False,
                "message": message
            }), 409

        return jsonify({
            "success": False,
            "message": message
        }), 400

    return jsonify({
        "success": True,
        "message": "Product created successfully",
        "product": product.to_dict()
    }), 201


# ---------------------------------------------------------
# ADMIN: UPDATE PRODUCT
# ---------------------------------------------------------

@products_bp.put("/<int:product_id>")
@admin_required
def update_product(product_id):
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body is required"
        }), 400

    try:
        product = update_product_service(
            product_id,
            data
        )

    except LookupError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 404

    except ValueError as error:
        message = str(error)

        if message == "A product with this slug already exists":
            return jsonify({
                "success": False,
                "message": message
            }), 409

        return jsonify({
            "success": False,
            "message": message
        }), 400

    return jsonify({
        "success": True,
        "message": "Product updated successfully",
        "product": product.to_dict()
    }), 200


# ---------------------------------------------------------
# ADMIN: UPDATE PRODUCT STATUS
# ---------------------------------------------------------

@products_bp.patch("/<int:product_id>/status")
@admin_required
def update_product_status(product_id):
    data = request.get_json(silent=True)

    if not data or "is_active" not in data:
        return jsonify({
            "success": False,
            "message": "is_active is required"
        }), 400

    try:
        product = update_product_status_service(
            product_id,
            data["is_active"]
        )

    except LookupError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 404

    return jsonify({
        "success": True,
        "message": "Product status updated successfully",
        "product": product.to_dict()
    }), 200


# ---------------------------------------------------------
# ADMIN: UPDATE FEATURED STATUS
# ---------------------------------------------------------

@products_bp.patch("/<int:product_id>/featured")
@admin_required
def update_product_featured(product_id):
    data = request.get_json(silent=True)

    if not data or "is_featured" not in data:
        return jsonify({
            "success": False,
            "message": "is_featured is required"
        }), 400

    try:
        product = update_product_featured_service(
            product_id,
            data["is_featured"]
        )

    except LookupError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 404

    return jsonify({
        "success": True,
        "message": "Product featured status updated successfully",
        "product": product.to_dict()
    }), 200