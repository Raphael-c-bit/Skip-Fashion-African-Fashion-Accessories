from extensions import db
from datetime import datetime


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    status = db.Column(db.String(30), default="pending", nullable=False)
    payment_status = db.Column(
        db.String(30),
        default="pending",
        nullable=False
    )

    subtotal = db.Column(db.Float, default=0, nullable=False)
    shipping_fee = db.Column(db.Float, default=0, nullable=False)
    total_amount = db.Column(db.Float, default=0, nullable=False)
    currency = db.Column(db.String(10), default="NGN", nullable=False)

    shipping_name = db.Column(db.String(150), nullable=False)
    shipping_phone = db.Column(db.String(30), nullable=False)
    shipping_address = db.Column(db.Text, nullable=False)
    shipping_city = db.Column(db.String(100), nullable=False)
    shipping_state = db.Column(db.String(100), nullable=False)

    notes = db.Column(db.Text, nullable=True)

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
        back_populates="orders"
    )

    items = db.relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "order_number": self.order_number,
            "user_id": self.user_id,
            "status": self.status,
            "payment_status": self.payment_status,
            "subtotal": self.subtotal,
            "shipping_fee": self.shipping_fee,
            "total_amount": self.total_amount,
            "currency": self.currency,
            "shipping_name": self.shipping_name,
            "shipping_phone": self.shipping_phone,
            "shipping_address": self.shipping_address,
            "shipping_city": self.shipping_city,
            "shipping_state": self.shipping_state,
            "notes": self.notes,
            "items": [item.to_dict() for item in self.items],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }