"""CRUD routes for saved analyses."""

import logging

from flask import Blueprint, jsonify

from services.storage import get_analysis, list_analyses, delete_analysis, save_analysis
from services.github_files import list_repo_files
from services.coverage import compute_coverage

logger = logging.getLogger(__name__)

analyses_bp = Blueprint("analyses", __name__)


@analyses_bp.route("/api/analyses", methods=["GET"])
def list_all():
    """Return a list of all saved analyses (summaries only)."""
    return jsonify(list_analyses()), 200


@analyses_bp.route("/api/analyses/<analysis_id>", methods=["GET"])
def get_one(analysis_id: str):
    """Return the full data for a single analysis."""
    record = get_analysis(analysis_id)
    if record is None:
        return jsonify({"error": "Analysis not found"}), 404
    return jsonify(record), 200


@analyses_bp.route("/api/analyses/<analysis_id>", methods=["DELETE"])
def remove(analysis_id: str):
    """Delete a saved analysis."""
    if delete_analysis(analysis_id):
        return jsonify({"deleted": True}), 200
    return jsonify({"error": "Analysis not found"}), 404


@analyses_bp.route("/api/analyses/<analysis_id>/coverage", methods=["POST"])
def coverage(analysis_id: str):
    """Calculate file coverage for a saved analysis.

    Fetches the file list from GitHub and compares against graph nodes.
    Saves the coverage report into the analysis record.
    """
    record = get_analysis(analysis_id)
    if record is None:
        return jsonify({"error": "Analysis not found"}), 404

    repo_url = record.get("repo_url", "")
    input_type = record.get("input_type", "")
    if input_type != "github" or not repo_url:
        return jsonify({"error": "Coverage is only available for GitHub repositories"}), 400

    try:
        repo_files = list_repo_files(repo_url)
    except Exception as e:
        logger.warning("GitHub file listing failed for %s: %s", repo_url, e)
        return jsonify({"error": "Could not list repository files", "message": str(e)}), 502

    graph_data = record.get("result", {})
    report = compute_coverage(graph_data, repo_files)

    # Persist coverage into the analysis record
    record["coverage"] = report
    import json
    from services.storage import DATA_DIR
    filepath = DATA_DIR / f"{analysis_id}.json"
    with open(filepath, "w") as f:
        json.dump(record, f, indent=2)

    return jsonify(report), 200
