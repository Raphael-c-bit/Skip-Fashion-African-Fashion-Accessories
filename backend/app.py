import os

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from extensions import db
from routes.orders import orders_bp
from routes.admin.auth import admin_auth_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Limit uploaded request bodies to 5 MB.
    app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

    db.init_app(app)
    JWTManager(app)

    CORS(
        app,
        resources={
            r"/api/*": {
                "origins": [
                    "http://127.0.0.1:5500",
                    "http://localhost:5500"
                ],
                "methods": [
                    "GET",
                    "POST",
                    "PUT",
                    "PATCH",
                    "DELETE",
                    "OPTIONS"
                ],
                "allow_headers": [
                    "Content-Type",
                    "Authorization"
                ],
                "supports_credentials": True
            }
        }
    )

    from routes.auth import auth_bp
    from routes.categories import categories_bp
    from routes.products import products_bp
    from routes.variants import variants_bp
    from routes.images import images_bp
    from routes.cart import cart_bp

    from routes.admin.customers import customers_bp
    from routes.admin.orders import admin_orders_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(products_bp)
    app.register_blueprint(variants_bp)
    app.register_blueprint(images_bp)
    app.register_blueprint(cart_bp)
    app.register_blueprint(orders_bp)

    # Admin routes
    app.register_blueprint(admin_auth_bp)
    app.register_blueprint(customers_bp)
    app.register_blueprint(admin_orders_bp)

    # Serve product images saved by the image upload route.
    upload_folder = os.path.join(
        app.root_path,
        "uploads",
        "products"
    )

    os.makedirs(upload_folder, exist_ok=True)

    @app.get("/uploads/products/<path:filename>")
    def serve_product_image(filename):
        return send_from_directory(upload_folder, filename)

    @app.get("/api/health")
    def health_check():
        return jsonify({
            "success": True,
            "message": "Backend is running"
        }), 200

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "message": "The requested resource was not found"
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "success": False,
            "message": "The HTTP method is not allowed for this resource"
        }), 405

    @app.errorhandler(413)
    def request_too_large(error):
        return jsonify({
            "success": False,
            "message": "Uploaded file is too large. Maximum size is 5 MB."
        }), 413

    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({
            "success": False,
            "message": "An internal server error occurred"
        }), 500

    return app


app = create_app()


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )