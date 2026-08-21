"""Centralized logging configuration for the Flask application."""
from __future__ import annotations

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_DIR = Path(__file__).resolve().parent.parent / "data" / "logs"
LOG_FILE = LOG_DIR / "github_fetch.log"

# Rotate at 5 MB, keep 3 backups
MAX_BYTES = 5 * 1024 * 1024
BACKUP_COUNT = 3


def setup_logging() -> None:
    """Configure application-wide logging.

    - Root logger gets a console handler (INFO).
    - A dedicated ``github_fetch`` file logger captures all GitHub
      download errors with full context (WARNING and above) to a
      rotating log file under ``data/logs/``.
    """
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    log_level = logging.DEBUG if os.getenv("FLASK_DEBUG") == "1" else logging.INFO

    # ── Formatters ──────────────────────────────────────────────
    console_fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
        datefmt="%H:%M:%S",
    )
    file_fmt = logging.Formatter(
        "%(asctime)s  %(levelname)-8s  %(name)s  [%(funcName)s:%(lineno)d]  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # ── Console handler (root) ──────────────────────────────────
    root = logging.getLogger()
    root.setLevel(log_level)
    if not root.handlers:
        console = logging.StreamHandler()
        console.setLevel(log_level)
        console.setFormatter(console_fmt)
        root.addHandler(console)

    # ── File handler for GitHub fetch errors ────────────────────
    gh_logger = logging.getLogger("github_fetch")
    gh_logger.setLevel(logging.DEBUG)
    if not gh_logger.handlers:
        fh = RotatingFileHandler(
            LOG_FILE, maxBytes=MAX_BYTES, backupCount=BACKUP_COUNT
        )
        fh.setLevel(logging.WARNING)
        fh.setFormatter(file_fmt)
        gh_logger.addHandler(fh)
