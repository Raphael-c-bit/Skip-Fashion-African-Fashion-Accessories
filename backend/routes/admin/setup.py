from flask import request, jsonify

from extensions import db
from models.user import User
from utils.security import hash_password


def create_admin():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body is required"
        }), 400

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")

    if not name:
        return jsonify({
            "success": False,
            "message": "Name is required"
        }), 400

    if not email:
        return jsonify({
            "success": False,
            "message": "Email is required"
        }), 400

    if not password:
        return jsonify({
            "success": False,
            "message": "Password is required"
        }), 400

    if len(password) < 8:
        return jsonify({
            "success": False,
            "message": "Password must be at least 8 characters"
        }), 400

    existing_admin = User.query.filter_by(role="admin").first()

    if existing_admin:
        return jsonify({
            "success": False,
            "message": "An administrator already exists"
        }), 409

    existing_user = User.query.filter_by(email=email).first()

    if existing_user:
        return jsonify({
            "success": False,
            "message": "An account with this email already exists"
        }), 409

    admin = User(
        name=name,
        email=email,
        phone=phone or None,
        password_hash=hash_password(password),
        role="admin"
    )

    db.session.add(admin)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Administrator account created successfully",
        "user": admin.to_dict()
    }), 201