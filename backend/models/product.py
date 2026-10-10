from extensions import db
from datetime import datetime


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(220), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Numeric(12, 2), nullable=False)
    currency = db.Column(db.String(10), default="NGN", nullable=False)
    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id"),
        nullable=False
    )
    product_type = db.Column(
        db.String(50),
        nullable=False
    )
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_featured = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    category = db.relationship(
        "Category",
        back_populates="products"
    )
    
    variants = db.relationship(
    "ProductVariant",
    back_populates="product",
    cascade="all, delete-orphan",
    lazy=True
)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "price": float(self.price),
            "currency": self.currency,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "product_type": self.product_type,
            "is_active": self.is_active,
            "variants": [variant.to_dict() for variant in self.variants],
            "is_featured": self.is_featured,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }