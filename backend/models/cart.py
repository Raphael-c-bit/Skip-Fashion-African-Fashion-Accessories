from datetime import datetime

from extensions import db


class Cart(db.Model):
    __tablename__ = "carts"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        unique=True,
        index=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    user = db.relationship(
        "User",
        lazy=True
    )

    items = db.relationship(
        "CartItem",
        back_populates="cart",
        cascade="all, delete-orphan",
        lazy=True
    )

    def to_dict(self):
        subtotal = sum(
            float(item.unit_price) * item.quantity
            for item in self.items
        )

        total_quantity = sum(
            item.quantity
            for item in self.items
        )

        return {
            "id": self.id,
            "user_id": self.user_id,
            "items": [
                item.to_dict()
                for item in self.items
            ],
            "total_quantity": total_quantity,
            "subtotal": subtotal,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }