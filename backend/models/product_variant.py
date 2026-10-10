from datetime import datetime

from extensions import db


class ProductVariant(db.Model):
    __tablename__ = "product_variants"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False
    )

    color_name = db.Column(
        db.String(100),
        nullable=True
    )

    color_code = db.Column(
        db.String(20),
        nullable=True
    )

    option_type = db.Column(
        db.String(50),
        nullable=False
    )

    option_value = db.Column(
        db.String(100),
        nullable=False
    )

    stock_quantity = db.Column(
        db.Integer,
        default=0,
        nullable=False
    )

    is_available = db.Column(
        db.Boolean,
        default=True,
        nullable=False
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

    product = db.relationship(
        "Product",
        back_populates="variants"
    )

    images = db.relationship(
        "ProductImage",
        back_populates="variant",
        cascade="all, delete-orphan",
        lazy=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "color_name": self.color_name,
            "color_code": self.color_code,
            "option_type": self.option_type,
            "option_value": self.option_value,
            "stock_quantity": self.stock_quantity,
            "is_available": self.is_available,
            "images": [
                image.to_dict()
                for image in self.images
            ],
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            )
        }