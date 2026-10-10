import os
from datetime import timedelta

from dotenv import load_dotenv


load_dotenv()


BASE_DIR = os.path.abspath(os.path.dirname(__file__))

DATABASE_DIR = os.path.join(BASE_DIR, "database")

DATABASE_PATH = os.path.join(
    DATABASE_DIR,
    "database.db"
)

ADMIN_DATABASE_PATH = os.path.join(
    DATABASE_DIR,
    "admin_database.db"
)

os.makedirs(DATABASE_DIR, exist_ok=True)


class Config:
    # Application secret
    SECRET_KEY = os.getenv(
        "SECRET_KEY",
        "development-secret-key"
    )

    # JWT secret
    JWT_SECRET_KEY = os.getenv(
        "JWT_SECRET_KEY",
        "development-jwt-secret-key"
    )

    # Database
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{DATABASE_PATH}"

    SQLALCHEMY_BINDS = {
        "admin": f"sqlite:///{ADMIN_DATABASE_PATH}"
    }

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT expiration
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)