
import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta, timezone

from flask import current_app

from extensions import db
from models.password_reset_code import PasswordResetCode
from models.user import User
from utils.security import hash_password, verify_password


PASSWORD_RESET_TTL = timedelta(minutes=10)
PASSWORD_RESET_RESEND_COOLDOWN = timedelta(seconds=60)
PASSWORD_RESET_MAX_ATTEMPTS = 5


def get_user_by_id(user_id):
    if user_id is None:
        return None

    return db.session.get(User, user_id)


def get_user_by_email(email):
    if not email:
        return None

    normalized_email = str(email).strip().lower()

    return User.query.filter_by(email=normalized_email).first()


def create_user(name, email, password, phone=None, role="customer"):
    name = str(name or "").strip()
    email = str(email or "").strip().lower()
    phone = str(phone or "").strip() or None
    password = str(password or "")

    if not name:
        raise ValueError("Name is required")

    if not email:
        raise ValueError("Email is required")

    if not password:
        raise ValueError("Password is required")

    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")

    existing_user = get_user_by_email(email)

    if existing_user:
        raise ValueError("An account with this email already exists")

    user = User(
        name=name,
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        role=role
    )

    db.session.add(user)
    db.session.commit()
    db.session.refresh(user)

    return user


def authenticate_user(email, password):
    user = get_user_by_email(email)

    if not user:
        return None

    if not verify_password(user.password_hash, password):
        return None

    return user


def _current_utc_time():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hash_password_reset_code(user_id, code):
    secret = str(current_app.config["SECRET_KEY"]).encode("utf-8")
    value = f"{user_id}:{code}".encode("utf-8")
    return hmac.new(secret, value, hashlib.sha256).hexdigest()


def create_password_reset_code(user):
    if not user or user.role != "customer":
        raise ValueError("Password reset is unavailable for this account")

    now = _current_utc_time()
    reset_record = PasswordResetCode.query.filter_by(
        user_id=user.id
    ).first()

    if (
        reset_record
        and reset_record.expires_at > now
        and reset_record.created_at > now - PASSWORD_RESET_RESEND_COOLDOWN
    ):
        return None

    code = f"{secrets.randbelow(1_000_000):06d}"
    if reset_record:
        reset_record.code_hash = _hash_password_reset_code(user.id, code)
        reset_record.expires_at = now + PASSWORD_RESET_TTL
        reset_record.attempts = 0
        reset_record.created_at = now
    else:
        reset_record = PasswordResetCode(
            user_id=user.id,
            code_hash=_hash_password_reset_code(user.id, code),
            expires_at=now + PASSWORD_RESET_TTL
        )
        db.session.add(reset_record)

    db.session.commit()
    return code


def delete_password_reset_code(user_id):
    reset_record = PasswordResetCode.query.filter_by(
        user_id=user_id
    ).first()

    if reset_record:
        db.session.delete(reset_record)
        db.session.commit()


def reset_user_password(email, code, new_password):
    new_password = str(new_password or "")

    if len(new_password) < 8:
        return False, "Password must be at least 8 characters"

    email = str(email or "").strip().lower()
    code = str(code or "").strip()

    if not email or not re.fullmatch(r"[0-9]{6}", code):
        return False, "The reset code is invalid or expired."

    user = get_user_by_email(email)
    reset_record = (
        PasswordResetCode.query.filter_by(user_id=user.id).first()
        if user and user.role == "customer"
        else None
    )

    if not reset_record:
        return False, "The reset code is invalid or expired."

    now = _current_utc_time()

    if reset_record.expires_at <= now:
        db.session.delete(reset_record)
        db.session.commit()
        return False, "The reset code is invalid or expired."

    if reset_record.attempts >= PASSWORD_RESET_MAX_ATTEMPTS:
        db.session.delete(reset_record)
        db.session.commit()
        return False, "Too many incorrect attempts. Request a new reset code."

    expected_hash = _hash_password_reset_code(user.id, code)

    if not hmac.compare_digest(reset_record.code_hash, expected_hash):
        reset_record.attempts += 1

        if reset_record.attempts >= PASSWORD_RESET_MAX_ATTEMPTS:
            db.session.delete(reset_record)

        db.session.commit()
        return False, "The reset code is invalid or expired."

    user.password_hash = hash_password(new_password)
    db.session.delete(reset_record)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception("Failed to update customer password")
        return False, "Unable to update your password right now. Please try again."

    return True, "Password updated successfully"
