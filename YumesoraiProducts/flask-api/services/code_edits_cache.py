"""Server-side disk cache for user-edited COBOL code."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "code_edits")


def _cache_path(owner: str, repo: str, branch: str, program_id: str) -> str:
    """Build the cache file path for a given owner/repo/branch/program_id."""
    safe_name = f"{owner}__{repo}__{branch}__{program_id}.json"
    return os.path.join(CACHE_DIR, safe_name)


def get_saved_edits(
    owner: str, repo: str, branch: str, program_id: str
) -> dict | None:
    """Read and return saved code edits if they exist, else None."""
    path = _cache_path(owner, repo, branch, program_id)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to read code edits cache file %s: %s", path, e)
        return None


def save_code_edits(
    owner: str,
    repo: str,
    branch: str,
    program_id: str,
    file_path: str,
    content: str,
    commit_sha: str,
) -> str:
    """Write edited code to disk cache. Returns the saved_at ISO timestamp."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = _cache_path(owner, repo, branch, program_id)
    saved_at = datetime.now(timezone.utc).isoformat()
    data = {
        "content": content,
        "saved_at": saved_at,
        "original_commit_sha": commit_sha,
        "file_path": file_path,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    logger.info(
        "Saved code edits for %s/%s@%s program=%s",
        owner, repo, branch, program_id,
    )
    return saved_at


def delete_saved_edits(
    owner: str, repo: str, branch: str, program_id: str
) -> bool:
    """Delete saved code edits for a program. Returns True if deleted."""
    path = _cache_path(owner, repo, branch, program_id)
    if os.path.isfile(path):
        try:
            os.remove(path)
            logger.info(
                "Deleted code edits for %s/%s@%s program=%s",
                owner, repo, branch, program_id,
            )
            return True
        except OSError as e:
            logger.warning("Failed to delete code edits file %s: %s", path, e)
            return False
    return False
