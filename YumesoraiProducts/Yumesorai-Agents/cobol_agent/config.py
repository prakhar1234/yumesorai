"""Configuration loaded from environment variables."""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


def get_api_key() -> str:
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not key:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set. "
            "Export it or add it to a .env file."
        )
    return key


def get_model() -> str:
    return os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")


def get_max_iterations() -> int:
    return int(os.environ.get("MAX_AGENT_ITERATIONS", "50"))


def get_github_token() -> "str | None":
    return os.environ.get("GITHUB_TOKEN") or None
