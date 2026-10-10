from datetime import datetime

from extensions import db


class CartItem(db.Model):
    __tablename__ = "cart_items"

    id = db.Column(db.Integer, primary_key=True)

    cart_id = db.Column(
        db.Integer,
        db.ForeignKey("carts.id"),
        nullable=False,
        index=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False,
        index=True
    )

    variant_id = db.Column(
        db.Integer,
        db.ForeignKey("product_variants.id"),
        nullable=True,
        index=True
    )

    quantity = db.Column(
        db.Integer,
        nullable=False,
        default=1
    )

    unit_price = db.Column(
        db.Numeric(12, 2),
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

    cart = db.relationship(
        "Cart",
        back_populates="items"
    )

    product = db.relationship(
        "Product",
        lazy=True
    )

    variant = db.relationship(
        "ProductVariant",
        lazy=True
    )

    def to_dict(self):
        variant_data = None

        if self.variant:
            variant_data = {
                "id": self.variant.id,
                "color": self.variant.color_name,
                "color_code": self.variant.color_code,
                "option_type": self.variant.option_type,
                "option_value": self.variant.option_value,
                "stock_quantity": self.variant.stock_quantity,
                "is_available": self.variant.is_available
            }

        return {
            "id": self.id,
            "cart_id": self.cart_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "product_description": (
                self.product.description
                if self.product
                else None
            ),
            "product_price": (
                float(self.product.price)
                if self.product and self.product.price is not None
                else None
            ),
            "currency": (
                self.product.currency
                if self.product
                else "NGN"
            ),
            "variant_id": self.variant_id,
            "variant": variant_data,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price),
            "total_price": float(self.unit_price) * self.quantity,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }