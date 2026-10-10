from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from extensions import db
from models.product import Product
from models.category import Category
from utils.decorators import admin_required


products_bp = Blueprint(
    "admin_products",
    __name__,
    url_prefix="/api/admin/products"
)


def generate_slug(value):
    value = str(value).strip().lower()

    slug = "-".join(value.split())

    characters = []

    for character in slug:
        if character.isalnum() or character == "-":
            characters.append(character)

    return "".join(characters).strip("-")


def make_unique_slug(name, product_id=None):
    base_slug = generate_slug(name)

    if not base_slug:
        base_slug = "product"

    slug = base_slug
    counter = 2

    while True:
        query = Product.query.filter_by(slug=slug)

        if product_id is not None:
            query = query.filter(Product.id != product_id)

        existing_product = query.first()

        if not existing_product:
            return slug

        slug = f"{base_slug}-{counter}"
        counter += 1


def product_to_dict(product):
    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "price": float(product.price or 0),
        "currency": product.currency,
        "category_id": product.category_id,
        "category": (
            product.category.to_dict()
            if product.category
            else None
        ),
        "product_type": product.product_type,
        "is_active": product.is_active,
        "is_featured": product.is_featured,
        "variants": [
            variant.to_dict()
            for variant in product.variants
        ],
        "created_at": (
            product.created_at.isoformat()
            if product.created_at
            else None
        ),
        "updated_at": (
            product.updated_at.isoformat()
            if product.updated_at
            else None
        )
    }


@products_bp.get("")
@admin_required
def get_products():
    products = (
        Product.query
        .order_by(Product.created_at.desc())
        .all()
    )

    product_list = [
        product_to_dict(product)
        for product in products
    ]

    return jsonify({
        "success": True,
        "products": product_list,
        "total_products": len(product_list)
    }), 200


@products_bp.get("/<int:product_id>")
@admin_required
def get_product(product_id):
    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({
            "success": False,
            "message": "Product not found"
        }), 404

    return jsonify({
        "success": True,
        "product": product_to_dict(product)
    }), 200


@products_bp.post("")
@admin_required
def create_product():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body is required"
        }), 400

    name = str(data.get("name", "")).strip()
    description = data.get("description")
    currency = str(
        data.get("currency", "NGN")
    ).strip().upper()
    product_type = str(
        data.get("product_type", "")
    ).strip()
    category_id = data.get("category_id")

    if not name:
        return jsonify({
            "success": False,
            "message": "Product name is required"
        }), 400

    if "price" not in data:
        return jsonify({
            "success": False,
            "message": "Product price is required"
        }), 400

    try:
        price = float(data["price"])
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Product price must be a valid number"
        }), 400

    if price < 0:
        return jsonify({
            "success": False,
            "message": "Product price cannot be negative"
        }), 400

    if category_id is None:
        return jsonify({
            "success": False,
            "message": "Category is required"
        }), 400

    try:
        category_id = int(category_id)
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "category_id must be a valid number"
        }), 400

    category = db.session.get(Category, category_id)

    if not category:
        return jsonify({
            "success": False,
            "message": "Category not found"
        }), 404

    if not category.is_active:
        return jsonify({
            "success": False,
            "message": "Selected category is inactive"
        }), 400

    if not product_type:
        return jsonify({
            "success": False,
            "message": "Product type is required"
        }), 400

    slug = str(data.get("slug", "")).strip()

    if slug:
        slug = generate_slug(slug)

        existing_slug = Product.query.filter_by(
            slug=slug
        ).first()

        if existing_slug:
            return jsonify({
                "success": False,
                "message": "A product with this slug already exists"
            }), 409
    else:
        slug = make_unique_slug(name)

    is_active = data.get("is_active", True)
    is_featured = data.get("is_featured", False)

    if not isinstance(is_active, bool):
        return jsonify({
            "success": False,
            "message": "is_active must be true or false"
        }), 400

    if not isinstance(is_featured, bool):
        return jsonify({
            "success": False,
            "message": "is_featured must be true or false"
        }), 400

    product = Product(
        name=name,
        slug=slug,
        description=description,
        price=price,
        currency=currency,
        category_id=category_id,
        product_type=product_type,
        is_active=is_active,
        is_featured=is_featured
    )

    db.session.add(product)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to create product because of a duplicate or invalid value"
        }), 409
    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to create product"
        }), 500

    return jsonify({
        "success": True,
        "message": "Product created successfully",
        "product": product_to_dict(product)
    }), 201


@products_bp.patch("/<int:product_id>")
@admin_required
def update_product(product_id):
    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({
            "success": False,
            "message": "Product not found"
        }), 404

    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body is required"
        }), 400

    if "name" in data:
        name = str(data.get("name", "")).strip()

        if not name:
            return jsonify({
                "success": False,
                "message": "Product name cannot be empty"
            }), 400

        product.name = name

    if "slug" in data:
        slug = generate_slug(data["slug"])

        if not slug:
            return jsonify({
                "success": False,
                "message": "Product slug cannot be empty"
            }), 400

        existing_slug = Product.query.filter(
            Product.slug == slug,
            Product.id != product.id
        ).first()

        if existing_slug:
            return jsonify({
                "success": False,
                "message": "A product with this slug already exists"
            }), 409

        product.slug = slug

    if "description" in data:
        product.description = data["description"]

    if "price" in data:
        try:
            price = float(data["price"])
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "Product price must be a valid number"
            }), 400

        if price < 0:
            return jsonify({
                "success": False,
                "message": "Product price cannot be negative"
            }), 400

        product.price = price

    if "currency" in data:
        currency = str(
            data["currency"]
        ).strip().upper()

        if not currency:
            return jsonify({
                "success": False,
                "message": "Currency cannot be empty"
            }), 400

        product.currency = currency

    if "category_id" in data:
        try:
            category_id = int(data["category_id"])
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "category_id must be a valid number"
            }), 400

        category = db.session.get(
            Category,
            category_id
        )

        if not category:
            return jsonify({
                "success": False,
                "message": "Category not found"
            }), 404

        if not category.is_active:
            return jsonify({
                "success": False,
                "message": "Selected category is inactive"
            }), 400

        product.category_id = category_id

    if "product_type" in data:
        product_type = str(
            data["product_type"]
        ).strip()

        if not product_type:
            return jsonify({
                "success": False,
                "message": "Product type cannot be empty"
            }), 400

        product.product_type = product_type

    if "is_active" in data:
        if not isinstance(data["is_active"], bool):
            return jsonify({
                "success": False,
                "message": "is_active must be true or false"
            }), 400

        product.is_active = data["is_active"]

    if "is_featured" in data:
        if not isinstance(data["is_featured"], bool):
            return jsonify({
                "success": False,
                "message": "is_featured must be true or false"
            }), 400

        product.is_featured = data["is_featured"]

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to update product because of a duplicate or invalid value"
        }), 409
    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to update product"
        }), 500

    return jsonify({
        "success": True,
        "message": "Product updated successfully",
        "product": product_to_dict(product)
    }), 200


@products_bp.delete("/<int:product_id>")
@admin_required
def delete_product(product_id):
    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({
            "success": False,
            "message": "Product not found"
        }), 404

    db.session.delete(product)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to delete product because it is referenced by existing records."
        }), 409
    except Exception:
        db.session.rollback()

        return jsonify({
            "success": False,
            "message": "Unable to delete product"
        }), 500

    return jsonify({
        "success": True,
        "message": "Product deleted successfully"
    }), 200


@products_bp.patch("/<int:product_id>/status")
@admin_required
def update_product_status(product_id):
    product = db.session.get(Product, product_id)

    if not product:
        return jsonify({
            "success": False,
            "message": "Product not found"
        }), 404

    data = request.get_json(silent=True)

    if not data or "is_active" not in data:
        return jsonify({
            "success": False,
            "message": "is_active is required"
        }), 400

    if not isinstance(data["is_active"], bool):
        return jsonify({
            "success": False,
            "message": "is_active must be true or false"
        }), 400

    product.is_active = data["is_active"]

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Product status updated successfully",
        "product": product_to_dict(product)
    }), 200