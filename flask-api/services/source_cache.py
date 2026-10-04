"""Server-side disk cache for fetched GitHub source files."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "source_cache")


def _cache_path(owner: str, repo: str, branch: str) -> str:
    """Build the cache file path for a given owner/repo/branch."""
    safe_name = f"{owner}__{repo}__{branch}.json"
    return os.path.join(CACHE_DIR, safe_name)


def get_cached_sources(owner: str, repo: str, branch: str) -> dict | None:
    """Read and return the cached JSON if it exists, else None."""
    path = _cache_path(owner, repo, branch)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to read cache file %s: %s", path, e)
        return None


def save_sources_cache(
    owner: str, repo: str, branch: str, commit_sha: str, sources: list[dict]
) -> None:
    """Write the sources cache JSON file to disk."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = _cache_path(owner, repo, branch)
    data = {
        "commit_sha": commit_sha,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "sources": sources,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    logger.info(
        "Saved source cache for %s/%s@%s (%d files)",
        owner, repo, branch, len(sources),
    )


def is_cache_fresh(cached_sha: str, owner: str, repo: str, branch: str) -> bool:
    """Check if the cached SHA matches the latest commit on the branch."""
    from services.github_files import get_latest_commit_sha

    try:
        latest_sha = get_latest_commit_sha(owner, repo, branch)
    except Exception as e:
        logger.warning(
            "Could not verify cache freshness for %s/%s@%s: %s",
            owner, repo, branch, e,
        )
        # If we can't check, treat cache as stale
        return False
    return latest_sha == cached_sha
