from models.admin_user import AdminUser
from utils.security import verify_password


def get_admin_by_id(admin_id):
    return AdminUser.query.get(admin_id)


def get_admin_by_email(email):
    if not email:
        return None

    return AdminUser.query.filter_by(
        email=email.strip().lower()
    ).first()


def authenticate_admin(email, password):
    admin = get_admin_by_email(email)

    if not admin:
        return None

    if not admin.is_active:
        return None

    if not verify_password(
        admin.password_hash,
        password
    ):
        return None

    return admin