from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from models.admin_user import AdminUser


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        identity = get_jwt_identity()

        if (
            claims.get("user_type") != "admin"
            or claims.get("role") != "admin"
            or not isinstance(identity, str)
            or not identity.startswith("admin:")
        ):
            return jsonify({
                "success": False,
                "message": "Admin access required"
            }), 403

        try:
            admin_id = int(identity.split(":", 1)[1])
        except (TypeError, ValueError, IndexError):
            return jsonify({
                "success": False,
                "message": "Invalid administrator identity"
            }), 401

        admin = AdminUser.query.get(admin_id)

        if not admin or not admin.is_active or admin.role != "admin":
            return jsonify({
                "success": False,
                "message": "Administrator account not found"
            }), 401

        return fn(*args, **kwargs)

    return wrapper