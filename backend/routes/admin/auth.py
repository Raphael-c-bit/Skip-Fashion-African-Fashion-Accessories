from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt,
    get_jwt_identity,
    jwt_required,
    verify_jwt_in_request
)

from services.admin_auth_service import (
    authenticate_admin,
    get_admin_by_id
)


admin_auth_bp = Blueprint(
    "admin_auth",
    __name__,
    url_prefix="/api/admin/auth"
)


@admin_auth_bp.post("/login")
def admin_login():
    data = request.get_json() or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required."
        }), 400

    admin = authenticate_admin(
        email,
        password
    )

    if not admin:
        return jsonify({
            "success": False,
            "message": "Invalid administrator credentials."
        }), 401

    claims = {
        "user_type": "admin",
        "role": "admin"
    }

    access_token = create_access_token(
        identity=f"admin:{admin.id}",
        additional_claims=claims
    )

    refresh_token = create_refresh_token(
        identity=f"admin:{admin.id}",
        additional_claims=claims
    )

    return jsonify({
        "success": True,
        "message": "Administrator login successful.",
        "admin": admin.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    }), 200


@admin_auth_bp.get("/me")
@jwt_required()
def admin_me():
    claims = get_jwt()

    if claims.get("user_type") != "admin":
        return jsonify({
            "success": False,
            "message": "Administrator authentication required."
        }), 403

    identity = get_jwt_identity()

    if not isinstance(identity, str):
        return jsonify({
            "success": False,
            "message": "Invalid administrator token."
        }), 401

    if not identity.startswith("admin:"):
        return jsonify({
            "success": False,
            "message": "Invalid administrator token."
        }), 401

    try:
        admin_id = int(
            identity.split(":", 1)[1]
        )
    except (ValueError, IndexError):
        return jsonify({
            "success": False,
            "message": "Invalid administrator token."
        }), 401

    admin = get_admin_by_id(admin_id)

    if not admin or not admin.is_active:
        return jsonify({
            "success": False,
            "message": "Administrator account not found."
        }), 401

    return jsonify({
        "success": True,
        "admin": admin.to_dict()
    }), 200


@admin_auth_bp.post("/refresh")
@jwt_required(refresh=True)
def admin_refresh():
    claims = get_jwt()

    if claims.get("user_type") != "admin":
        return jsonify({
            "success": False,
            "message": "Administrator authentication required."
        }), 403

    identity = get_jwt_identity()

    if not isinstance(identity, str):
        return jsonify({
            "success": False,
            "message": "Invalid administrator token."
        }), 401

    if not identity.startswith("admin:"):
        return jsonify({
            "success": False,
            "message": "Invalid administrator token."
        }), 401

    try:
        admin_id = int(
            identity.split(":", 1)[1]
        )
    except (ValueError, IndexError):
        return jsonify({
            "success": False,
            "message": "Invalid administrator token."
        }), 401

    admin = get_admin_by_id(admin_id)

    if not admin or not admin.is_active:
        return jsonify({
            "success": False,
            "message": "Administrator account not found."
        }), 401

    new_access_token = create_access_token(
        identity=f"admin:{admin.id}",
        additional_claims={
            "user_type": "admin",
            "role": "admin"
        }
    )

    return jsonify({
        "success": True,
        "access_token": new_access_token
    }), 200