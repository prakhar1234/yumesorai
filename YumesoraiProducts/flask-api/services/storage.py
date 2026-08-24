"""JSON file-based storage for analyses."""
from __future__ import annotations

import hashlib
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "analyses"


def _ensure_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def compute_content_hash(sources: list[dict]) -> str:
    """Compute a deterministic SHA-256 hash over sorted source paths + contents."""
    h = hashlib.sha256()
    for src in sorted(sources, key=lambda s: s.get("path", "")):
        h.update(src.get("path", "").encode())
        h.update(src.get("content", "").encode())
    return h.hexdigest()


def find_by_hash(repo_url: str, content_hash: str) -> Optional[dict]:
    """Find a saved analysis matching the given repo_url and content_hash."""
    _ensure_dir()
    for filepath in DATA_DIR.glob("*.json"):
        try:
            with open(filepath) as f:
                record = json.load(f)
            if record.get("repo_url") == repo_url and record.get("content_hash") == content_hash:
                return record
        except (json.JSONDecodeError, KeyError):
            continue
    return None


def save_analysis(result: dict, repo_url: str, input_type: str, content_hash: Optional[str] = None) -> str:
    """Save an analysis result to a JSON file. Returns the generated ID."""
    _ensure_dir()
    analysis_id = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S") + "-" + uuid.uuid4().hex[:6]
    nodes = result.get("nodes", [])
    edges = result.get("edges", [])
    record = {
        "id": analysis_id,
        "repo_url": repo_url,
        "input_type": input_type,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "result": result,
    }
    if content_hash:
        record["content_hash"] = content_hash
    filepath = DATA_DIR / f"{analysis_id}.json"
    with open(filepath, "w") as f:
        json.dump(record, f, indent=2)
    return analysis_id


def get_analysis(analysis_id: str) -> Optional[dict]:
    """Retrieve a single analysis by ID. Returns None if not found."""
    filepath = DATA_DIR / f"{analysis_id}.json"
    if not filepath.is_file():
        return None
    with open(filepath) as f:
        return json.load(f)


def list_analyses() -> List[dict]:
    """List all saved analyses (summary only, no full result)."""
    _ensure_dir()
    summaries = []
    for filepath in sorted(DATA_DIR.glob("*.json"), reverse=True):
        try:
            with open(filepath) as f:
                record = json.load(f)
            summaries.append({
                "id": record["id"],
                "repo_url": record.get("repo_url", ""),
                "input_type": record.get("input_type", ""),
                "created_at": record.get("created_at", ""),
                "node_count": record.get("node_count", 0),
                "edge_count": record.get("edge_count", 0),
            })
        except (json.JSONDecodeError, KeyError):
            continue
    return summaries


def delete_analysis(analysis_id: str) -> bool:
    """Delete an analysis by ID. Returns True if deleted, False if not found."""
    filepath = DATA_DIR / f"{analysis_id}.json"
    if not filepath.is_file():
        return False
    os.remove(filepath)
    return True
