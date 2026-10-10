from routes.admin.auth import admin_auth_bp
from flask import Blueprint

admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api/admin"
)