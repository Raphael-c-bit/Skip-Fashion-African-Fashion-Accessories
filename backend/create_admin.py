import os
import getpass

from dotenv import load_dotenv

from app import app
from extensions import db
from models.user import User
from utils.security import hash_password


# Load variables from backend/.env
load_dotenv()


def create_admin():
    admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()

    if not admin_email:
        print("ERROR: ADMIN_EMAIL is not configured in .env")
        return

    print()
    print("=== Skip Fashion Attire - Admin Setup ===")
    print()

    # Check whether an admin already exists
    existing_admin = User.query.filter_by(role="admin").first()

    if existing_admin:
        print("ERROR: An admin account already exists.")
        print(f"Existing admin email: {existing_admin.email}")
        print("No new admin account was created.")
        return

    # Check whether the designated admin email already belongs to a user
    existing_user = User.query.filter_by(email=admin_email).first()

    if existing_user:
        print(f"An account already exists for: {admin_email}")

        if existing_user.role == "admin":
            print("This account is already an admin.")
            return

        print()
        print("This email belongs to an existing customer account.")
        print("We will NOT automatically convert the customer account.")
        print("This protects existing customer accounts.")
        return

    print(f"Admin email: {admin_email}")
    print()

    name = input("Enter admin name: ").strip()

    if not name:
        print("ERROR: Admin name is required.")
        return

    phone = input("Enter admin phone (optional): ").strip()

    password = getpass.getpass("Enter admin password: ")
    confirm_password = getpass.getpass("Confirm admin password: ")

    if not password:
        print("ERROR: Password is required.")
        return

    if len(password) < 12:
        print("ERROR: Admin password must be at least 12 characters.")
        return

    if password != confirm_password:
        print("ERROR: Passwords do not match.")
        return

    admin = User(
        name=name,
        email=admin_email,
        phone=phone or None,
        password_hash=hash_password(password),
        role="admin"
    )

    db.session.add(admin)
    db.session.commit()

    print()
    print("SUCCESS: Admin account created.")
    print(f"Admin name: {admin.name}")
    print(f"Admin email: {admin.email}")
    print(f"Admin user ID: {admin.id}")
    print()
    print("Keep the admin credentials secure.")
    print("Do not share the admin password or commit it to Git.")
    print()


if __name__ == "__main__":
    with app.app_context():
        create_admin()