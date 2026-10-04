"""Route for the DFS validation pipeline endpoint."""

from flask import Blueprint, jsonify, request

import logging

from services.dfs_pipeline import run_dfs_validation_pipeline

logger = logging.getLogger(__name__)

dfs_validation_bp = Blueprint("dfs_validation", __name__)


@dfs_validation_bp.route("/api/dfs-validation", methods=["POST"])
def dfs_validation():
    """Run the full DFS validation pipeline on a COBOL repository.

    Expects JSON body:
        repo_url (str): GitHub repository URL.
        mode (str, optional): "auto" (default), "static", or "llm".

    Returns:
        JSON with validated_graph, dfs_report, analysis_id, pipeline_metadata.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    repo_url = data.get("repo_url")
    if not repo_url:
        return jsonify({"error": "repo_url is required"}), 400

    mode = data.get("mode", "auto")
    if mode not in ("auto", "static", "llm"):
        return jsonify({"error": "mode must be one of: auto, static, llm"}), 400

    max_llm_iterations = data.get("max_llm_iterations", 3)
    max_static_iterations = data.get("max_static_iterations", 5)
    llm_provider = data.get("llm_provider", "anthropic")

    try:
        result = run_dfs_validation_pipeline(
            repo_url,
            mode=mode,
            max_llm_iterations=max_llm_iterations,
            max_static_iterations=max_static_iterations,
            llm_provider=llm_provider,
        )
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": "Configuration error", "message": str(e)}), 400
    except RuntimeError as e:
        return jsonify({"error": "Pipeline error", "message": str(e)}), 400
    except Exception as e:
        logger.exception("DFS validation pipeline failed for %s", repo_url)
        return jsonify({"error": "Pipeline failed", "message": str(e)}), 500
