from app import app, db
from models.user import User

with app.app_context():
    print("Database URL:")
    print(app.config["SQLALCHEMY_DATABASE_URI"])

    print("\nTables:")
    print(db.metadata.tables.keys())

    print("\nUser table columns:")
    for column in User.__table__.columns:
        print(f"- {column.name}: {column.type}")