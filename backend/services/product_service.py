from extensions import db
from models.product import Product
from models.category import Category


def get_active_products():
    return (
        Product.query
        .filter_by(is_active=True)
        .order_by(Product.created_at.desc())
        .all()
    )


def get_all_products():
    return (
        Product.query
        .order_by(Product.created_at.desc())
        .all()
    )


def get_product_by_id(product_id):
    return db.session.get(Product, product_id)


def get_active_product_by_id(product_id):
    product = get_product_by_id(product_id)

    if not product or not product.is_active:
        return None

    return product


def get_category_by_id(category_id):
    return db.session.get(Category, category_id)


def create_product(
    name,
    slug,
    price,
    category_id,
    product_type,
    description=None,
    currency="NGN",
    is_featured=False
):
    name = str(name or "").strip()
    slug = str(slug or "").strip().lower()
    description = (
        str(description).strip()
        if description is not None
        else None
    )
    currency = str(currency or "NGN").strip().upper()
    product_type = str(product_type or "").strip().lower()

    if not name:
        raise ValueError("Product name is required")

    if not slug:
        raise ValueError("Product slug is required")

    if price is None:
        raise ValueError("Product price is required")

    try:
        price = float(price)
    except (TypeError, ValueError):
        raise ValueError(
            "Product price must be a valid number"
        )

    if price < 0:
        raise ValueError(
            "Product price cannot be negative"
        )

    if not category_id:
        raise ValueError("Category is required")

    try:
        category_id = int(category_id)
    except (TypeError, ValueError):
        raise ValueError(
            "Category ID must be a valid number"
        )

    category = get_category_by_id(category_id)

    if not category:
        raise LookupError("Category not found")

    if not product_type:
        raise ValueError("Product type is required")

    existing_slug = Product.query.filter_by(
        slug=slug
    ).first()

    if existing_slug:
        raise ValueError(
            "A product with this slug already exists"
        )

    product = Product(
        name=name,
        slug=slug,
        description=description or None,
        price=price,
        currency=currency or "NGN",
        category_id=category_id,
        product_type=product_type,
        is_active=True,
        is_featured=bool(is_featured)
    )

    db.session.add(product)
    db.session.commit()
    db.session.refresh(product)

    return product


def update_product(product_id, data):
    product = get_product_by_id(product_id)

    if not product:
        raise LookupError("Product not found")

    if not data:
        raise ValueError("Request body is required")

    if "name" in data:
        name = str(data.get("name", "")).strip()

        if not name:
            raise ValueError(
                "Product name cannot be empty"
            )

        product.name = name

    if "slug" in data:
        slug = str(data.get("slug", "")).strip().lower()

        if not slug:
            raise ValueError(
                "Product slug cannot be empty"
            )

        existing_slug = Product.query.filter(
            Product.slug == slug,
            Product.id != product_id
        ).first()

        if existing_slug:
            raise ValueError(
                "A product with this slug already exists"
            )

        product.slug = slug

    if "description" in data:
        description = data.get("description")

        product.description = (
            str(description).strip()
            if description is not None
            else None
        )

    if "price" in data:
        try:
            price = float(data.get("price"))
        except (TypeError, ValueError):
            raise ValueError(
                "Product price must be a valid number"
            )

        if price < 0:
            raise ValueError(
                "Product price cannot be negative"
            )

        product.price = price

    if "currency" in data:
        currency = str(
            data.get("currency", "")
        ).strip().upper()

        if not currency:
            raise ValueError(
                "Currency cannot be empty"
            )

        product.currency = currency

    if "category_id" in data:
        try:
            category_id = int(data.get("category_id"))
        except (TypeError, ValueError):
            raise ValueError(
                "Category ID must be a valid number"
            )

        category = get_category_by_id(category_id)

        if not category:
            raise LookupError("Category not found")

        product.category_id = category_id

    if "product_type" in data:
        product_type = str(
            data.get("product_type", "")
        ).strip().lower()

        if not product_type:
            raise ValueError(
                "Product type cannot be empty"
            )

        product.product_type = product_type

    if "is_featured" in data:
        product.is_featured = bool(
            data.get("is_featured")
        )

    db.session.commit()
    db.session.refresh(product)

    return product


def update_product_status(product_id, is_active):
    product = get_product_by_id(product_id)

    if not product:
        raise LookupError("Product not found")

    product.is_active = bool(is_active)

    db.session.commit()
    db.session.refresh(product)

    return product


def update_product_featured(product_id, is_featured):
    product = get_product_by_id(product_id)

    if not product:
        raise LookupError("Product not found")

    product.is_featured = bool(is_featured)

    db.session.commit()
    db.session.refresh(product)

    return product