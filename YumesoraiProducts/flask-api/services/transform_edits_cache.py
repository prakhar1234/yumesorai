"""Server-side disk cache for user-edited modern (transformed) code."""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "transform_edits")


def _cache_path(owner: str, repo: str, branch: str, program_id: str, target_lang: str) -> str:
    """Build the cache file path for a given owner/repo/branch/program_id/target_lang."""
    safe_name = f"{owner}__{repo}__{branch}__{program_id}__{target_lang}.json"
    return os.path.join(CACHE_DIR, safe_name)


def get_saved_transform_edits(
    owner: str, repo: str, branch: str, program_id: str, target_lang: str
) -> dict | None:
    """Read and return saved transform edits if they exist, else None."""
    path = _cache_path(owner, repo, branch, program_id, target_lang)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError) as e:
        logger.warning("Failed to read transform edits cache file %s: %s", path, e)
        return None


def save_transform_edits(
    owner: str,
    repo: str,
    branch: str,
    program_id: str,
    target_lang: str,
    file_path: str,
    content: str,
    commit_sha: str,
) -> str:
    """Write edited modern code to disk cache. Returns the saved_at ISO timestamp."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    path = _cache_path(owner, repo, branch, program_id, target_lang)
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
        "Saved transform edits for %s/%s@%s program=%s lang=%s",
        owner, repo, branch, program_id, target_lang,
    )
    return saved_at


def delete_saved_transform_edits(
    owner: str, repo: str, branch: str, program_id: str, target_lang: str
) -> bool:
    """Delete saved transform edits for a program+lang. Returns True if deleted."""
    path = _cache_path(owner, repo, branch, program_id, target_lang)
    if os.path.isfile(path):
        try:
            os.remove(path)
            logger.info(
                "Deleted transform edits for %s/%s@%s program=%s lang=%s",
                owner, repo, branch, program_id, target_lang,
            )
            return True
        except OSError as e:
            logger.warning("Failed to delete transform edits file %s: %s", path, e)
            return False
    return False
