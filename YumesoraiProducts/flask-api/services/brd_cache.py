"""Server-side disk cache for generated BRD documents."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "brd_cache")


def _cache_path(owner: str, repo: str, branch: str, program_id: str) -> str:
    """Build the cache file path for a given owner/repo/branch/program_id."""
    safe_name = f"{owner}__{repo}__{branch}__{program_id}.json"
    return os.path.join(CACHE_DIR, safe_name)


def get_cached_brd(
    owner: str, repo: str, branch: str, program_id: str
) -> dict | None:
    """Read and return the cached BRD JSON if it exists, else None."""
    path = _cache_path(owner, repo, branch, program_id)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to read BRD cache file %s: %s", path, e)
        return None


def save_brd_cache(
    owner: str,
    repo: str,
    branch: str,
    program_id: str,
    commit_sha: str,
    file_path: str,
    brd_data: dict,
) -> None:
    """Write the BRD cache JSON file to disk."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = _cache_path(owner, repo, branch, program_id)
    data = {
        "commit_sha": commit_sha,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "file_path": file_path,
        "brd": brd_data,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    logger.info(
        "Saved BRD cache for %s/%s@%s program=%s",
        owner, repo, branch, program_id,
    )


def delete_cached_brd(
    owner: str, repo: str, branch: str, program_id: str
) -> bool:
    """Delete the cached BRD file for a given program. Returns True if deleted."""
    path = _cache_path(owner, repo, branch, program_id)
    if os.path.isfile(path):
        try:
            os.remove(path)
            logger.info(
                "Deleted BRD cache for %s/%s@%s program=%s",
                owner, repo, branch, program_id,
            )
            return True
        except OSError as e:
            logger.warning("Failed to delete BRD cache file %s: %s", path, e)
            return False
    return False


def check_brd_freshness(
    owner: str, repo: str, branch: str, program_id: str
) -> dict:
    """Check if a cached BRD is stale vs GitHub's latest commit.

    Returns a dict with freshness info and timestamps.
    """
    from services.github_files import get_latest_commit_info

    result = {
        "has_cached_brd": False,
        "is_fresh": False,
        "cached_commit_sha": "",
        "cached_generated_at": "",
        "latest_commit_sha": "",
        "latest_commit_date": "",
        "latest_commit_message": "",
        "updates_available": False,
    }

    # Check if we have a cached BRD
    cached = get_cached_brd(owner, repo, branch, program_id)
    if not cached:
        return result

    result["has_cached_brd"] = True
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
        # Can't verify — assume stale to be safe
        result["updates_available"] = True
        return result

    result["latest_commit_sha"] = latest["sha"]
    result["latest_commit_date"] = latest["date"]
    result["latest_commit_message"] = latest["message"]

    is_fresh = latest["sha"] == result["cached_commit_sha"]
    result["is_fresh"] = is_fresh
    result["updates_available"] = not is_fresh

    return result
