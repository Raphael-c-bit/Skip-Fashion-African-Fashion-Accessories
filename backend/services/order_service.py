from extensions import db

from models.order import Order
from models.order_item import OrderItem
from models.cart import Cart
from models.product import Product
from models.product_variant import ProductVariant


def generate_order_number():
    last_order = (
        Order.query
        .order_by(Order.id.desc())
        .first()
    )

    if last_order:
        next_id = last_order.id + 1
    else:
        next_id = 1

    return f"HAHC-{next_id:06d}"


def create_order_from_cart(
    user_id,
    shipping_name,
    shipping_phone,
    shipping_address,
    shipping_city,
    shipping_state,
    shipping_fee=0,
    notes=None
):
    if user_id is None:
        raise ValueError("Invalid user identity")

    shipping_name = str(
        shipping_name or ""
    ).strip()

    shipping_phone = str(
        shipping_phone or ""
    ).strip()

    shipping_address = str(
        shipping_address or ""
    ).strip()

    shipping_city = str(
        shipping_city or ""
    ).strip()

    shipping_state = str(
        shipping_state or ""
    ).strip()

    notes = (
        str(notes).strip()
        if notes is not None
        else None
    )

    if not shipping_name:
        raise ValueError(
            "Shipping name is required"
        )

    if not shipping_phone:
        raise ValueError(
            "Shipping phone is required"
        )

    if not shipping_address:
        raise ValueError(
            "Shipping address is required"
        )

    if not shipping_city:
        raise ValueError(
            "Shipping city is required"
        )

    if not shipping_state:
        raise ValueError(
            "Shipping state is required"
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise ValueError(
            "Invalid user identity"
        )

    try:
        shipping_fee = float(
            shipping_fee or 0
        )
    except (TypeError, ValueError):
        raise ValueError(
            "Shipping fee must be a valid number"
        )

    if shipping_fee < 0:
        raise ValueError(
            "Shipping fee cannot be negative"
        )

    cart = Cart.query.filter_by(
        user_id=user_id
    ).first()

    if not cart or not cart.items:
        raise ValueError(
            "Your cart is empty"
        )

    subtotal = 0
    order_items = []

    try:
        for cart_item in cart.items:
            product = db.session.get(
                Product,
                cart_item.product_id
            )

            if not product or not product.is_active:
                raise ValueError(
                    f"Product {cart_item.product_id} is unavailable"
                )

            if cart_item.quantity < 1:
                raise ValueError(
                    f"Invalid quantity for {product.name}"
                )

            variant = None

            if cart_item.variant_id is not None:
                variant = db.session.get(
                    ProductVariant,
                    cart_item.variant_id
                )

                if not variant:
                    raise ValueError(
                        "One of the selected variants no longer exists"
                    )

                if variant.product_id != product.id:
                    raise ValueError(
                        "One of the selected variants is invalid"
                    )

                if not variant.is_available:
                    raise ValueError(
                        "One of the selected variants is unavailable"
                    )

                if variant.stock_quantity is not None:
                    if (
                        variant.stock_quantity
                        < cart_item.quantity
                    ):
                        raise ValueError(
                            f"Insufficient stock for {product.name}"
                        )

            unit_price = float(product.price)

            item_subtotal = (
                unit_price * cart_item.quantity
            )

            subtotal += item_subtotal

            variant_name = None

            if variant:
                variant_name = (
                    f"{variant.option_type}: "
                    f"{variant.option_value}"
                )

                if variant.color_name:
                    variant_name += (
                        f", Color: {variant.color_name}"
                    )

            order_items.append({
                "product": product,
                "variant": variant,
                "product_name": product.name,
                "variant_name": variant_name,
                "quantity": cart_item.quantity,
                "unit_price": unit_price,
                "subtotal": item_subtotal
            })

        total_amount = (
            subtotal + shipping_fee
        )

        order = Order(
            order_number=generate_order_number(),
            user_id=user_id,
            status="pending",
            payment_status="pending",
            subtotal=subtotal,
            shipping_fee=shipping_fee,
            total_amount=total_amount,
            currency="NGN",
            shipping_name=shipping_name,
            shipping_phone=shipping_phone,
            shipping_address=shipping_address,
            shipping_city=shipping_city,
            shipping_state=shipping_state,
            notes=notes or None
        )

        db.session.add(order)
        db.session.flush()

        for item in order_items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item["product"].id,
                variant_id=(
                    item["variant"].id
                    if item["variant"]
                    else None
                ),
                product_name=item["product_name"],
                variant_name=item["variant_name"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                subtotal=item["subtotal"]
            )

            db.session.add(order_item)

            if item["variant"]:
                if item["variant"].stock_quantity is not None:
                    item["variant"].stock_quantity -= (
                        item["quantity"]
                    )

        for cart_item in list(cart.items):
            db.session.delete(cart_item)

        db.session.commit()
        db.session.refresh(order)

        return order

    except Exception:
        db.session.rollback()
        raise


def get_user_orders(user_id):
    if user_id is None:
        return []

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return []

    return (
        Order.query
        .filter_by(user_id=user_id)
        .order_by(Order.created_at.desc())
        .all()
    )


def get_order_by_id(order_id):
    if order_id is None:
        return None

    return db.session.get(
        Order,
        order_id
    )


def get_order_by_number(order_number):
    if not order_number:
        return None

    return Order.query.filter_by(
        order_number=str(order_number).strip()
    ).first()


def update_order_status(order_id, status):
    order = get_order_by_id(order_id)

    if not order:
        raise LookupError(
            "Order not found"
        )

    status = str(
        status or ""
    ).strip().lower()

    allowed_statuses = {
        "pending",
        "processing",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled"
    }

    if status not in allowed_statuses:
        raise ValueError(
            "Invalid order status"
        )

    if order.status == "cancelled":
        raise ValueError(
            "Cancelled orders cannot be updated"
        )

    if order.status == "delivered":
        raise ValueError(
            "Delivered orders cannot be updated"
        )

    if status == order.status:
        return order

    if status == "cancelled":
        try:
            for item in order.items:
                if item.variant_id:
                    variant = db.session.get(
                        ProductVariant,
                        item.variant_id
                    )

                    if variant:
                        if variant.stock_quantity is None:
                            variant.stock_quantity = 0

                        variant.stock_quantity += (
                            item.quantity
                        )

            order.status = "cancelled"

            db.session.commit()
            db.session.refresh(order)

            return order

        except Exception:
            db.session.rollback()
            raise

    order.status = status

    db.session.commit()
    db.session.refresh(order)

    return order


def cancel_order(order_id, user_id):
    order = get_order_by_id(order_id)

    if not order:
        raise LookupError(
            "Order not found"
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise ValueError(
            "Invalid user identity"
        )

    if order.user_id != user_id:
        raise PermissionError(
            "You are not authorized to cancel this order"
        )

    if order.status not in [
        "pending",
        "processing"
    ]:
        raise ValueError(
            "This order cannot be cancelled"
        )

    try:
        for item in order.items:
            if item.variant_id:
                variant = db.session.get(
                    ProductVariant,
                    item.variant_id
                )

                if variant:
                    if variant.stock_quantity is None:
                        variant.stock_quantity = 0

                    variant.stock_quantity += (
                        item.quantity
                    )

        order.status = "cancelled"

        db.session.commit()
        db.session.refresh(order)

        return order

    except Exception:
        db.session.rollback()
        raise