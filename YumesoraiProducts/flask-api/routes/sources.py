"""Flask route for fetching and caching repository source files."""
from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request

from services.github_files import (
    _parse_github_url,
    fetch_repo_sources,
    get_latest_commit_info,
    list_branches,
)
from services.source_cache import (
    get_cache_metadata,
    get_cached_sources,
    is_cache_fresh,
    save_sources_cache,
)

logger = logging.getLogger(__name__)

sources_bp = Blueprint("sources", __name__)


@sources_bp.route("/api/branches", methods=["POST"])
def get_branches():
    """List branches for a GitHub repository."""
    body = request.get_json(silent=True) or {}
    repo_url = body.get("repo_url", "").strip()
    if not repo_url:
        return jsonify({"error": "repo_url is required"}), 400

    try:
        owner, repo, _url_branch = _parse_github_url(repo_url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    try:
        branches = list_branches(owner, repo)
    except Exception as e:
        logger.error("Failed to list branches for %s/%s: %s", owner, repo, e)
        return jsonify({"error": f"Failed to list branches: {e}"}), 502

    return jsonify({
        "branches": branches,
        "count": len(branches),
    })


@sources_bp.route("/api/sources/check-cache", methods=["POST"])
def check_cache():
    """Quick pre-flight check: does a local cache exist for this repo/branch?

    This is a fast disk-only check (no GitHub API call) so the frontend
    can show the right loading message and time estimate.
    """
    body = request.get_json(silent=True) or {}
    repo_url = body.get("repo_url", "").strip()
    if not repo_url:
        return jsonify({"error": "repo_url is required"}), 400

    branch = body.get("branch", "").strip() or "main"

    try:
        owner, repo, url_branch = _parse_github_url(repo_url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    if url_branch and branch == "main":
        branch = url_branch

    metadata = get_cache_metadata(owner, repo, branch)
    if metadata:
        return jsonify({"has_cache": True, **metadata})
    return jsonify({"has_cache": False})


@sources_bp.route("/api/sources", methods=["POST"])
def get_sources():
    """Fetch source files for a repository, with server-side caching."""
    body = request.get_json(silent=True) or {}
    repo_url = body.get("repo_url", "").strip()
    if not repo_url:
        return jsonify({"error": "repo_url is required"}), 400

    branch = body.get("branch", "").strip() or "main"

    try:
        owner, repo, url_branch = _parse_github_url(repo_url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    force_refresh = body.get("force_refresh", False)

    # URL-embedded branch takes precedence if no explicit branch was given
    if url_branch and branch == "main":
        branch = url_branch

    # Check cache (skip if force_refresh is requested)
    if not force_refresh:
        cached = get_cached_sources(owner, repo, branch)
        if cached:
            cached_sha = cached.get("commit_sha", "")
            cached_commit_date = cached.get("commit_date", "")
            if is_cache_fresh(cached_sha, cached_commit_date, owner, repo, branch):
                logger.info("Serving cached sources for %s/%s@%s", owner, repo, branch)
                return jsonify({
                    "sources": cached["sources"],
                    "branch": branch,
                    "commit_sha": cached_sha,
                    "commit_date": cached_commit_date,
                    "fetched_at": cached.get("fetched_at", ""),
                    "cached": True,
                    "file_count": len(cached["sources"]),
                })

    # Fetch fresh sources
    try:
        sources = fetch_repo_sources(repo_url, branch=branch, max_chars=None)
    except Exception as e:
        logger.error(
            "Failed to fetch sources for %s/%s@%s: %s", owner, repo, branch, e
        )
        return jsonify({"error": f"Failed to fetch sources: {e}"}), 502

    # Get current commit info (SHA + timestamp)
    commit_sha = "unknown"
    commit_date = ""
    try:
        commit_info = get_latest_commit_info(owner, repo, branch)
        commit_sha = commit_info["sha"]
        commit_date = commit_info["date"]
    except Exception:
        pass

    # Save to cache
    try:
        save_sources_cache(owner, repo, branch, commit_sha, sources, commit_date=commit_date)
    except Exception as e:
        logger.warning(
            "Failed to save cache for %s/%s@%s: %s", owner, repo, branch, e
        )

    return jsonify({
        "sources": sources,
        "branch": branch,
        "commit_sha": commit_sha,
        "commit_date": commit_date,
        "cached": False,
        "file_count": len(sources),
    })
