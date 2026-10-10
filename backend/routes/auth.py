
import os

from flask import Blueprint, current_app, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required
)

from services.auth_service import (
    create_user,
    authenticate_user,
    get_user_by_id,
    get_user_by_email,
    create_password_reset_code,
    delete_password_reset_code,
    reset_user_password
)
from services.email_service import send_password_reset_code


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def is_designated_admin(user):
    admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()

    return (
        bool(admin_email)
        and user.email.lower() == admin_email
        and user.role == "admin"
    )


@auth_bp.post("/register")
def register():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body is required"
        }), 400

    name = data.get("name", "")
    email = data.get("email", "")
    phone = data.get("phone", "")
    password = data.get("password", "")

    try:
        user = create_user(
            name=name,
            email=email,
            password=password,
            phone=phone,
            role="customer"
        )
    except ValueError as error:
        message = str(error)
        status_code = (
            409
            if message == "An account with this email already exists"
            else 400
        )

        return jsonify({
            "success": False,
            "message": message
        }), status_code

    return jsonify({
        "success": True,
        "message": "Account created successfully",
        "user": user.to_dict()
    }), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body is required"
        }), 400

    email = data.get("email", "")
    password = data.get("password", "")

    if not str(email).strip() or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required"
        }), 400

    user = authenticate_user(email, password)

    if not user:
        return jsonify({
            "success": False,
            "message": "Invalid email or password"
        }), 401

    if user.role == "admin" and not is_designated_admin(user):
        return jsonify({
            "success": False,
            "message": "Admin account configuration is invalid"
        }), 403

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "success": True,
        "message": "Login successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict()
    }), 200


@auth_bp.post("/forgot-password")
def forgot_password():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body is required"
        }), 400

    email = str(data.get("email", "")).strip().lower()

    if not email:
        return jsonify({
            "success": False,
            "message": "Email is required"
        }), 400

    # Use the same response whether the account exists or not.
    generic_message = (
        "If an account exists with this email, "
        "a six-digit password reset code has been sent."
    )

    user = get_user_by_email(email)

    # Customer password recovery must not reset admin accounts.
    if not user or user.role != "customer":
        return jsonify({
            "success": True,
            "message": generic_message
        }), 200

    try:
        code = create_password_reset_code(user)

        if code is None:
            return jsonify({
                "success": True,
                "message": generic_message
            }), 200

        result = send_password_reset_code(user, code)

        if not result.get("sent"):
            delete_password_reset_code(user.id)
            current_app.logger.error(
                "Password reset email could not be sent: %s",
                result.get("message", "Unknown email error")
            )
            return jsonify({
                "success": False,
                "message": "We could not send a reset code right now. Please try again shortly."
            }), 503
    except Exception:
        from extensions import db
        db.session.rollback()
        current_app.logger.exception(
            "Unexpected error while processing a password reset request"
        )
        return jsonify({
            "success": False,
            "message": "We could not send a reset code right now. Please try again shortly."
        }), 503

    return jsonify({
        "success": True,
        "message": generic_message
    }), 200


@auth_bp.post("/reset-password")
def reset_password():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({
            "success": False,
            "message": "Request body is required"
        }), 400

    email = str(data.get("email", "")).strip().lower()
    code = str(data.get("code", "")).strip()
    password = data.get("password", "")

    if not email or not code:
        return jsonify({
            "success": False,
            "message": "Email and six-digit reset code are required"
        }), 400

    if not isinstance(password, str) or not password:
        return jsonify({
            "success": False,
            "message": "New password is required"
        }), 400

    success, message = reset_user_password(email, code, password)

    if not success:
        status_code = (
            400
            if message == "Password must be at least 8 characters"
            else 400
        )

        return jsonify({
            "success": False,
            "message": message
        }), status_code

    return jsonify({
        "success": True,
        "message": message
    }), 200


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    user = get_user_by_id(user_id)

    if not user:
        return jsonify({
            "success": False,
            "message": "User no longer exists"
        }), 404

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "success": True,
        "message": "Access token refreshed successfully",
        "access_token": access_token
    }), 200


@auth_bp.get("/me")
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "Invalid user identity"
        }), 401

    user = get_user_by_id(user_id)

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found"
        }), 404

    return jsonify({
        "success": True,
        "user": user.to_dict()
    }), 200
