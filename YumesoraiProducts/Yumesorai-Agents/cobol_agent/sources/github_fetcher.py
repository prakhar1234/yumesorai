"""Fetch COBOL source files from a GitHub repository."""
from __future__ import annotations

import logging
import os
from pathlib import PurePosixPath
from urllib.parse import quote, urlparse

import requests

from .base import COBOL_EXTENSIONS, SourceFetcher, SourceFile

logger = logging.getLogger(__name__)


def _parse_github_url(repo_url: str) -> tuple[str, str]:
    """Extract (owner, repo) from a GitHub URL."""
    url = repo_url.strip().rstrip("/")
    if url.endswith(".git"):
        url = url[:-4]
    parsed = urlparse(url if url.startswith("http") else f"https://{url}")
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(parts) < 2:
        raise ValueError(f"Cannot parse owner/repo from URL: {repo_url}")
    return parts[0], parts[1]


def _github_headers() -> dict[str, str]:
    headers = {"Accept": "application/vnd.github.v3+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


class GitHubFetcher(SourceFetcher):
    """Fetch COBOL files from a GitHub repo using the Git Trees API."""

    def __init__(self, repo_url: str) -> None:
        self.repo_url = repo_url
        self.owner, self.repo = _parse_github_url(repo_url)
        self._file_cache: dict[str, SourceFile] = {}

    def list_files(self) -> list[SourceFile]:
        headers = _github_headers()
        api_url = (
            f"https://api.github.com/repos/{self.owner}/{self.repo}"
            f"/git/trees/HEAD?recursive=1"
        )
        resp = requests.get(api_url, headers=headers, timeout=30)
        resp.raise_for_status()

        tree = resp.json().get("tree", [])
        files: list[SourceFile] = []
        for item in tree:
            if item.get("type") != "blob":
                continue
            path = item["path"]
            ext = PurePosixPath(path).suffix.lower()
            if ext not in COBOL_EXTENSIONS:
                continue
            name = PurePosixPath(path).stem.upper()
            sf = SourceFile(
                path=path,
                name=name,
                ext=ext,
                file_type=COBOL_EXTENSIONS[ext],
            )
            files.append(sf)
            self._file_cache[path] = sf

        logger.info(
            "Found %d COBOL files in %s/%s", len(files), self.owner, self.repo
        )
        return files

    def read_file(self, path: str) -> str:
        raw_headers = {}
        token = os.environ.get("GITHUB_TOKEN")
        if token:
            raw_headers["Authorization"] = f"token {token}"

        encoded_path = quote(path, safe="/")
        raw_url = (
            f"https://raw.githubusercontent.com/{self.owner}/{self.repo}"
            f"/HEAD/{encoded_path}"
        )
        resp = requests.get(raw_url, headers=raw_headers, timeout=15)
        resp.raise_for_status()
        content = resp.text

        # Cache content for later use
        if path in self._file_cache:
            self._file_cache[path].content = content

        return content
