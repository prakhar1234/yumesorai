"""Abstract base class for source fetchers."""
from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import PurePosixPath


# Extensions we care about and their corresponding node types
COBOL_EXTENSIONS: dict[str, str] = {
    ".cbl": "program",
    ".cob": "program",
    ".cpy": "copybook",
    ".jcl": "job",
    ".bms": "screen",
}


class SourceFile:
    """Metadata and content for a single source file."""

    __slots__ = ("path", "name", "ext", "file_type", "content")

    def __init__(
        self, path: str, name: str, ext: str, file_type: str, content: str = ""
    ) -> None:
        self.path = path
        self.name = name
        self.ext = ext
        self.file_type = file_type
        self.content = content

    def to_metadata(self) -> dict:
        """Return metadata dict (no content) for list_source_files."""
        return {
            "path": self.path,
            "name": self.name,
            "ext": self.ext,
            "type": self.file_type,
        }

    def to_dict(self) -> dict:
        """Return full dict including content."""
        return {**self.to_metadata(), "content": self.content}


def classify_extension(path: str) -> tuple[str, str] | None:
    """Return (ext, file_type) if the path has a COBOL-relevant extension."""
    ext = PurePosixPath(path).suffix.lower()
    if ext in COBOL_EXTENSIONS:
        return ext, COBOL_EXTENSIONS[ext]
    return None


class SourceFetcher(ABC):
    """Abstract base for fetching source files from a location."""

    @abstractmethod
    def list_files(self) -> list[SourceFile]:
        """Return metadata for all COBOL-relevant files (content may be empty)."""

    @abstractmethod
    def read_file(self, path: str) -> str:
        """Return the full text content of the file at *path*."""
