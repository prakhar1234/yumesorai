"""Server-side disk cache for generated transformation results."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "transform_cache")


def _cache_path(owner: str, repo: str, branch: str, program_id: str, target_lang: str) -> str:
    """Build the cache file path for a given owner/repo/branch/program_id/target_lang."""
    safe_name = f"{owner}__{repo}__{branch}__{program_id}__{target_lang}.json"
    return os.path.join(CACHE_DIR, safe_name)


def get_cached_transform(
    owner: str, repo: str, branch: str, program_id: str, target_lang: str
) -> dict | None:
    """Read and return the cached transform JSON if it exists, else None."""
    path = _cache_path(owner, repo, branch, program_id, target_lang)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to read transform cache file %s: %s", path, e)
        return None


def save_transform_cache(
    owner: str,
    repo: str,
    branch: str,
    program_id: str,
    target_lang: str,
    target_db: str,
    commit_sha: str,
    file_path: str,
    cobol_source: str,
    modern_source: str,
    file_tree: list,
    plan: dict,
) -> None:
    """Write the transform cache JSON file to disk."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = _cache_path(owner, repo, branch, program_id, target_lang)
    data = {
        "commit_sha": commit_sha,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "target_lang": target_lang,
        "target_db": target_db,
        "file_path": file_path,
        "cobol_source": cobol_source,
        "modern_source": modern_source,
        "file_tree": file_tree,
        "plan": plan,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    logger.info(
        "Saved transform cache for %s/%s@%s program=%s lang=%s",
        owner, repo, branch, program_id, target_lang,
    )


def delete_cached_transform(
    owner: str, repo: str, branch: str, program_id: str, target_lang: str
) -> bool:
    """Delete the cached transform file for a given program+lang. Returns True if deleted."""
    path = _cache_path(owner, repo, branch, program_id, target_lang)
    if os.path.isfile(path):
        try:
            os.remove(path)
            logger.info(
                "Deleted transform cache for %s/%s@%s program=%s lang=%s",
                owner, repo, branch, program_id, target_lang,
            )
            return True
        except OSError as e:
            logger.warning("Failed to delete transform cache file %s: %s", path, e)
            return False
    return False


def check_transform_freshness(
    owner: str, repo: str, branch: str, program_id: str, target_lang: str
) -> dict:
    """Check if a cached transform is stale vs GitHub's latest commit.

    Returns a dict with freshness info and timestamps.
    """
    from services.github_files import get_latest_commit_info

    result = {
        "has_cached_transform": False,
        "is_fresh": False,
        "cached_commit_sha": "",
        "cached_generated_at": "",
        "latest_commit_sha": "",
        "latest_commit_date": "",
        "latest_commit_message": "",
        "updates_available": False,
    }

    # Check if we have a cached transform
    cached = get_cached_transform(owner, repo, branch, program_id, target_lang)
    if not cached:
        return result

    result["has_cached_transform"] = True
    result["cached_commit_sha"] = cached.get("commit_sha", "")
    result["cached_generated_at"] = cached.get("generated_at", "")

    # Fetch latest commit info from GitHub
    try:
        latest = get_latest_commit_info(owner, repo, branch)
    except Exception as e:
        logger.warning(
            "Could not check freshness for %s/%s@%s: %s",
            owner, repo, branch, e,
        )
        # Can't verify -- assume stale to be safe
        result["updates_available"] = True
        return result

    result["latest_commit_sha"] = latest["sha"]
    result["latest_commit_date"] = latest["date"]
    result["latest_commit_message"] = latest["message"]

    is_fresh = latest["sha"] == result["cached_commit_sha"]
    result["is_fresh"] = is_fresh
    result["updates_available"] = not is_fresh

    return result
