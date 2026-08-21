"""Fetch COBOL source files from a local directory."""
from __future__ import annotations

import logging
from pathlib import Path

from .base import COBOL_EXTENSIONS, SourceFetcher, SourceFile

logger = logging.getLogger(__name__)


class LocalFetcher(SourceFetcher):
    """Walk a local directory for COBOL-relevant files."""

    def __init__(self, root: "str | Path") -> None:
        self.root = Path(root).resolve()
        if not self.root.is_dir():
            raise ValueError(f"Not a directory: {self.root}")

    def list_files(self) -> list[SourceFile]:
        files: list[SourceFile] = []
        for p in sorted(self.root.rglob("*")):
            if not p.is_file():
                continue
            ext = p.suffix.lower()
            if ext not in COBOL_EXTENSIONS:
                continue
            rel = str(p.relative_to(self.root))
            name = p.stem.upper()
            files.append(
                SourceFile(
                    path=rel,
                    name=name,
                    ext=ext,
                    file_type=COBOL_EXTENSIONS[ext],
                )
            )

        logger.info("Found %d COBOL files in %s", len(files), self.root)
        return files

    def read_file(self, path: str) -> str:
        full = self.root / path
        return full.read_text(encoding="utf-8", errors="replace")
