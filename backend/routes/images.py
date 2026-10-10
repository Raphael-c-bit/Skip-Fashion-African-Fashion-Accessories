import os
import uuid

from flask import (
    Blueprint,
    jsonify,
    request,
    send_from_directory
)
from flask_jwt_extended import jwt_required
from werkzeug.utils import secure_filename

from extensions import db
from models.product_variant import ProductVariant
from models.product_image import ProductImage
from utils.decorators import admin_required


images_bp = Blueprint("images", __name__, url_prefix="/api")

UPLOAD_FOLDER = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "uploads",
        "products"
    )
)

ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif"
}

MAX_FILE_SIZE = 5 * 1024 * 1024


def allowed_file(filename):
    if not filename or "." not in filename:
        return False

    extension = filename.rsplit(".", 1)[1].lower()

    return extension in ALLOWED_EXTENSIONS


def save_uploaded_image(file):
    if not file or not file.filename:
        return None

    if not allowed_file(file.filename):
        raise ValueError(
            "Invalid image type. Use JPG, JPEG, PNG, WEBP or GIF."
        )

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > MAX_FILE_SIZE:
        raise ValueError(
            "Image is too large. Maximum file size is 5 MB."
        )

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    original_name = secure_filename(file.filename)

    extension = original_name.rsplit(".", 1)[1].lower()

    filename = (
        f"{uuid.uuid4().hex}.{extension}"
    )

    file_path = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    file.save(file_path)

    return filename


def delete_uploaded_file(image_url):
    if not image_url:
        return

    filename = image_url.rsplit("/", 1)[-1]

    file_path = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    if (
        os.path.isfile(file_path)
        and os.path.abspath(file_path).startswith(
            os.path.abspath(UPLOAD_FOLDER)
        )
    ):
        os.remove(file_path)


def make_image_url(filename):
    return (
        request.host_url.rstrip("/")
        + "/uploads/products/"
        + filename
    )


def set_primary_image(image):
    ProductImage.query.filter(
        ProductImage.variant_id == image.variant_id,
        ProductImage.id != image.id
    ).update(
        {"is_primary": False},
        synchronize_session=False
    )

    image.is_primary = True


@images_bp.post("/variants/<int:variant_id>/images")
@jwt_required()
@admin_required
def create_image(variant_id):
    variant = ProductVariant.query.get(variant_id)

    if not variant:
        return jsonify({
            "success": False,
            "message": "Variant not found"
        }), 404

    uploaded_file = request.files.get("image")

    try:
        filename = save_uploaded_image(uploaded_file)
    except ValueError as error:
        return jsonify({
            "success": False,
            "message": str(error)
        }), 400

    if not filename:
        return jsonify({
            "success": False,
            "message": "Please select an image file."
        }), 400

    alt_text = request.form.get("alt_text")

    try:
        sort_order = int(
            request.form.get("sort_order", 0)
        )
    except (TypeError, ValueError):
        return jsonify({
            "success": False,
            "message": "sort_order must be a valid number"
        }), 400

    is_primary = (
        request.form.get("is_primary", "false").lower()
        == "true"
    )

    image = ProductImage(
        variant_id=variant_id,
        image_url=make_image_url(filename),
        alt_text=alt_text,
        is_primary=False,
        sort_order=sort_order
    )

    db.session.add(image)

    if is_primary:
        db.session.flush()
        set_primary_image(image)

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Product image uploaded successfully",
        "image": image.to_dict()
    }), 201


@images_bp.get("/variants/<int:variant_id>/images")
def get_variant_images(variant_id):
    variant = ProductVariant.query.get(variant_id)

    if not variant:
        return jsonify({
            "success": False,
            "message": "Variant not found"
        }), 404

    images = ProductImage.query.filter_by(
        variant_id=variant_id
    ).order_by(
        ProductImage.sort_order.asc(),
        ProductImage.id.asc()
    ).all()

    return jsonify({
        "success": True,
        "images": [
            image.to_dict()
            for image in images
        ]
    }), 200


@images_bp.get("/images/<int:image_id>")
def get_image(image_id):
    image = ProductImage.query.get(image_id)

    if not image:
        return jsonify({
            "success": False,
            "message": "Image not found"
        }), 404

    return jsonify({
        "success": True,
        "image": image.to_dict()
    }), 200


@images_bp.put("/images/<int:image_id>")
@jwt_required()
@admin_required
def update_image(image_id):
    image = ProductImage.query.get(image_id)

    if not image:
        return jsonify({
            "success": False,
            "message": "Image not found"
        }), 404

    uploaded_file = request.files.get("image")

    if uploaded_file and uploaded_file.filename:
        try:
            filename = save_uploaded_image(uploaded_file)
        except ValueError as error:
            return jsonify({
                "success": False,
                "message": str(error)
            }), 400

        old_image_url = image.image_url

        image.image_url = make_image_url(filename)

        delete_uploaded_file(old_image_url)

    alt_text = request.form.get("alt_text")

    if alt_text is not None:
        image.alt_text = alt_text

    if "sort_order" in request.form:
        try:
            image.sort_order = int(
                request.form.get("sort_order", 0)
            )
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "sort_order must be a valid number"
            }), 400

    if "is_primary" in request.form:
        is_primary = (
            request.form.get(
                "is_primary",
                "false"
            ).lower() == "true"
        )

        if is_primary:
            set_primary_image(image)
        else:
            image.is_primary = False

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Product image updated successfully",
        "image": image.to_dict()
    }), 200


@images_bp.delete("/images/<int:image_id>")
@jwt_required()
@admin_required
def delete_image(image_id):
    image = ProductImage.query.get(image_id)

    if not image:
        return jsonify({
            "success": False,
            "message": "Image not found"
        }), 404

    image_url = image.image_url

    db.session.delete(image)
    db.session.commit()

    delete_uploaded_file(image_url)

    return jsonify({
        "success": True,
        "message": "Product image deleted successfully"
    }), 200


@images_bp.get(
    "/uploads/products/<path:filename>"
)
def serve_product_image(filename):
    return send_from_directory(
        UPLOAD_FOLDER,
        filename
    )