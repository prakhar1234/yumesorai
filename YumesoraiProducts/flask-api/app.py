"""Flask application factory."""

from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from routes.demystify import demystify_bp
from routes.analyses import analyses_bp
from services.log_config import setup_logging


def create_app(config=None):
    """Create and configure the Flask application."""
    setup_logging()
    app = Flask(__name__)

    if config is None:
        app.config.from_object(Config)
    else:
        app.config.from_object(config)

    CORS(app, origins=["http://localhost:3001"])

    app.register_blueprint(demystify_bp)
    app.register_blueprint(analyses_bp)

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy"}), 200

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "Bad request", "message": str(error)}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not found", "message": str(error)}), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error", "message": str(error)}), 500

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=app.config.get("DEBUG", False), port=5000)
