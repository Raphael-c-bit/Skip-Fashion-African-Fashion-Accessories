from flask import Blueprint, request, jsonify

from extensions import db
from models.category import Category
from utils.decorators import admin_required


categories_bp = Blueprint(
    "categories",
    __name__,
    url_prefix="/api/categories"
)


@categories_bp.get("")
def get_categories():
    categories = Category.query.order_by(Category.name.asc()).all()

    return jsonify({
        "success": True,
        "categories": [category.to_dict() for category in categories]
    }), 200


@categories_bp.get("/<int:category_id>")
def get_category(category_id):
    category = db.session.get(Category, category_id)

    if not category:
        return jsonify({
            "success": False,
            "message": "Category not found"
        }), 404

    return jsonify({
        "success": True,
        "category": category.to_dict()
    }), 200


@categories_bp.post("")
@admin_required
def create_category():
    data = request.get_json() or {}

    name = data.get("name", "").strip()
    slug = data.get("slug", "").strip().lower()
    description = data.get("description", "").strip()

    if not name:
        return jsonify({
            "success": False,
            "message": "Category name is required"
        }), 400

    if not slug:
        return jsonify({
            "success": False,
            "message": "Category slug is required"
        }), 400

    existing_name = Category.query.filter_by(name=name).first()

    if existing_name:
        return jsonify({
            "success": False,
            "message": "A category with this name already exists"
        }), 409

    existing_slug = Category.query.filter_by(slug=slug).first()

    if existing_slug:
        return jsonify({
            "success": False,
            "message": "A category with this slug already exists"
        }), 409

    category = Category(
        name=name,
        slug=slug,
        description=description or None
    )

    db.session.add(category)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Category created successfully",
        "category": category.to_dict()
    }), 201


@categories_bp.put("/<int:category_id>")
@admin_required
def update_category(category_id):
    category = db.session.get(Category, category_id)

    if not category:
        return jsonify({
            "success": False,
            "message": "Category not found"
        }), 404

    data = request.get_json() or {}

    name = data.get("name")
    slug = data.get("slug")
    description = data.get("description")

    if name is not None:
        name = name.strip()

        if not name:
            return jsonify({
                "success": False,
                "message": "Category name cannot be empty"
            }), 400

        existing_name = Category.query.filter(
            Category.name == name,
            Category.id != category_id
        ).first()

        if existing_name:
            return jsonify({
                "success": False,
                "message": "A category with this name already exists"
            }), 409

        category.name = name

    if slug is not None:
        slug = slug.strip().lower()

        if not slug:
            return jsonify({
                "success": False,
                "message": "Category slug cannot be empty"
            }), 400

        existing_slug = Category.query.filter(
            Category.slug == slug,
            Category.id != category_id
        ).first()

        if existing_slug:
            return jsonify({
                "success": False,
                "message": "A category with this slug already exists"
            }), 409

        category.slug = slug

    if description is not None:
        category.description = description.strip() or None

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Category updated successfully",
        "category": category.to_dict()
    }), 200


@categories_bp.patch("/<int:category_id>/status")
@admin_required
def update_category_status(category_id):
    category = db.session.get(Category, category_id)

    if not category:
        return jsonify({
            "success": False,
            "message": "Category not found"
        }), 404

    data = request.get_json() or {}

    if "is_active" not in data:
        return jsonify({
            "success": False,
            "message": "is_active is required"
        }), 400

    category.is_active = bool(data["is_active"])

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Category status updated successfully",
        "category": category.to_dict()
    }), 200