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


def get_cache_metadata(owner: str, repo: str, branch: str) -> dict | None:
    """Check if cache exists and return metadata without loading full sources.

    Returns a small dict with commit_sha, commit_date, fetched_at,
    and file_count — or None if no cache file exists.
    """
    path = _cache_path(owner, repo, branch)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {
            "commit_sha": data.get("commit_sha", ""),
            "commit_date": data.get("commit_date", ""),
            "fetched_at": data.get("fetched_at", ""),
            "file_count": len(data.get("sources", [])),
        }
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to read cache metadata %s: %s", path, e)
        return None


def save_sources_cache(
    owner: str,
    repo: str,
    branch: str,
    commit_sha: str,
    sources: list[dict],
    commit_date: str = "",
) -> None:
    """Write the sources cache JSON file to disk."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = _cache_path(owner, repo, branch)
    data = {
        "commit_sha": commit_sha,
        "commit_date": commit_date,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "sources": sources,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    logger.info(
        "Saved source cache for %s/%s@%s (%d files)",
        owner, repo, branch, len(sources),
    )


def is_cache_fresh(
    cached_sha: str,
    cached_commit_date: str,
    owner: str,
    repo: str,
    branch: str,
) -> bool:
    """Check if the cache matches the latest commit on the branch.

    Compares both the commit SHA and the commit timestamp.  If the
    cached commit date equals the latest commit date on the branch
    (and the SHAs match), the cache is fresh and no re-fetch is needed.
    """
    from services.github_files import get_latest_commit_info

    try:
        latest = get_latest_commit_info(owner, repo, branch)
    except Exception as e:
        logger.warning(
            "Could not verify cache freshness for %s/%s@%s: %s",
            owner, repo, branch, e,
        )
        # If we can't reach GitHub, treat cache as stale
        return False

    latest_sha = latest["sha"]
    latest_date = latest["date"]

    # Primary: SHA match guarantees identical commit
    if latest_sha == cached_sha:
        return True

    # Fallback: timestamp match (covers edge cases like shallow clones
    # where the SHA might differ but the commit content is the same)
    if cached_commit_date and latest_date and cached_commit_date == latest_date:
        logger.info(
            "Cache SHA mismatch but commit dates match for %s/%s@%s "
            "(cached=%s, latest=%s, date=%s) — treating as fresh",
            owner, repo, branch, cached_sha[:8], latest_sha[:8], latest_date,
        )
        return True

    return False
