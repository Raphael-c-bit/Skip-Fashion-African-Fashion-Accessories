import getpass

from app import app
from extensions import db
from models.user import User
from utils.security import hash_password


ADMIN_EMAIL = "admin@heritageattire.com"


def reset_admin_password():
    admin = User.query.filter_by(
        email=ADMIN_EMAIL
    ).first()

    if not admin:
        print()
        print("ERROR: Admin account was not found.")
        print(f"Email: {ADMIN_EMAIL}")
        return

    if admin.role != "admin":
        print()
        print("ERROR: This account is not configured as an admin.")
        print(f"Current role: {admin.role}")
        return

    print()
    print("=== Skip Fashion Attire - Admin Password Reset ===")
    print()
    print(f"Admin email: {admin.email}")
    print()

    password = getpass.getpass(
        "Enter new admin password: "
    )

    confirm_password = getpass.getpass(
        "Confirm new admin password: "
    )

    if not password:
        print()
        print("ERROR: Password is required.")
        return

    if len(password) < 12:
        print()
        print(
            "ERROR: Admin password must be at least 12 characters."
        )
        return

    if password != confirm_password:
        print()
        print("ERROR: Passwords do not match.")
        return

    admin.password_hash = hash_password(password)

    db.session.commit()

    print()
    print("SUCCESS: Admin password has been changed.")
    print(f"Admin email: {admin.email}")
    print()
    print("You can now use the new password to log in.")
    print()


if __name__ == "__main__":
    with app.app_context():
        reset_admin_password()