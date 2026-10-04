"""Service for listing and fetching files from a GitHub repository."""
from __future__ import annotations

import base64
import logging
import os
from pathlib import PurePosixPath
from urllib.parse import quote, urlparse

import requests

# Module-level logger for general info messages
logger = logging.getLogger(__name__)

# Dedicated logger whose WARNING+ output is written to data/logs/github_fetch.log
gh_logger = logging.getLogger("github_fetch")

# Extensions we care about and their corresponding node types
COBOL_EXTENSIONS: dict[str, str] = {
    ".cbl": "program",
    ".cob": "program",
    ".cpy": "copybook",
    ".jcl": "job",
    ".bms": "screen",
}

# Maximum total source size to send to the LLM (characters).
# Keeps the prompt within reasonable token limits.
MAX_SOURCE_CHARS = 300_000


def _parse_github_url(repo_url: str) -> tuple[str, str, str | None]:
    """Extract (owner, repo, branch_or_none) from a GitHub URL.

    Accepts formats like:
        https://github.com/owner/repo
        https://github.com/owner/repo.git
        github.com/owner/repo/tree/main/...
        github.com/owner/repo/tree/feature-branch
    """
    url = repo_url.strip().rstrip("/")
    if url.endswith(".git"):
        url = url[:-4]
    parsed = urlparse(url if url.startswith("http") else f"https://{url}")
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(parts) < 2:
        gh_logger.error("URL parse failed | url=%s", repo_url)
        raise ValueError(f"Cannot parse owner/repo from URL: {repo_url}")

    branch = None
    if len(parts) >= 4 and parts[2] == "tree":
        branch = parts[3]

    return parts[0], parts[1], branch


def _github_headers() -> dict[str, str]:
    """Return common GitHub API headers, including auth token if set."""
    headers = {"Accept": "application/vnd.github.v3+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


def list_branches(owner: str, repo: str) -> list[dict]:
    """List branches for a GitHub repository.

    Returns a list of dicts with branch name and whether it's the default branch.
    """
    headers = _github_headers()
    branches: list[dict] = []
    page = 1

    # First, get the default branch name from the repo metadata
    repo_url = f"https://api.github.com/repos/{owner}/{repo}"
    default_branch = "main"
    try:
        resp = requests.get(repo_url, headers=headers, timeout=15)
        resp.raise_for_status()
        default_branch = resp.json().get("default_branch", "main")
    except Exception as e:
        gh_logger.warning(
            "Could not fetch default branch for %s/%s: %s", owner, repo, e
        )

    # Paginate through branches (GitHub returns 30 per page by default)
    while True:
        api_url = (
            f"https://api.github.com/repos/{owner}/{repo}/branches"
            f"?per_page=100&page={page}"
        )
        try:
            resp = requests.get(api_url, headers=headers, timeout=15)
            resp.raise_for_status()
        except requests.HTTPError as e:
            status = e.response.status_code if e.response is not None else "N/A"
            gh_logger.error(
                "Branch list failed | repo=%s/%s | status=%s",
                owner, repo, status,
            )
            raise
        except (requests.ConnectionError, requests.Timeout) as e:
            gh_logger.error(
                "Branch list error | repo=%s/%s | error=%s",
                owner, repo, e,
            )
            raise

        data = resp.json()
        if not data:
            break

        for b in data:
            branches.append({
                "name": b["name"],
                "default": b["name"] == default_branch,
            })

        # Stop if fewer than a full page (no more pages)
        if len(data) < 100:
            break
        page += 1

    # Sort: default branch first, then alphabetically
    branches.sort(key=lambda b: (not b["default"], b["name"]))
    return branches


def get_latest_commit_sha(owner: str, repo: str, branch: str = "main") -> str:
    """Get the latest commit SHA for a branch.

    Uses the GitHub Commits API to fetch the latest commit on the given branch.
    """
    headers = _github_headers()
    api_url = f"https://api.github.com/repos/{owner}/{repo}/commits/{branch}"

    try:
        resp = requests.get(api_url, headers=headers, timeout=15)
        resp.raise_for_status()
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else "N/A"
        gh_logger.error(
            "Commit SHA fetch failed | repo=%s/%s | branch=%s | status=%s",
            owner, repo, branch, status,
        )
        raise
    except (requests.ConnectionError, requests.Timeout) as e:
        gh_logger.error(
            "Commit SHA fetch error | repo=%s/%s | branch=%s | error=%s",
            owner, repo, branch, e,
        )
        raise

    return resp.json()["sha"]


def list_repo_files(repo_url: str, branch: str = "HEAD") -> dict:
    """List COBOL-relevant files in a GitHub repository.

    Uses the Git Trees API with recursive=1 to get the full file tree,
    then filters to known COBOL extensions.

    Returns:
        {
            "files": [{"path": "src/ACCT0010.cbl", "name": "ACCT0010", "ext": ".cbl", "type": "program"}, ...],
            "total_files": N
        }
    """
    owner, repo, _url_branch = _parse_github_url(repo_url)
    headers = _github_headers()

    api_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
    try:
        resp = requests.get(api_url, headers=headers, timeout=30)
        resp.raise_for_status()
    except requests.ConnectionError as e:
        gh_logger.error(
            "Connection failed | repo=%s/%s | error=%s",
            owner, repo, e,
        )
        raise
    except requests.Timeout as e:
        gh_logger.error(
            "Request timed out | repo=%s/%s | url=%s | timeout=30s",
            owner, repo, api_url,
        )
        raise
    except requests.HTTPError as e:
        status = e.response.status_code if e.response is not None else "N/A"
        body = ""
        if e.response is not None:
            try:
                body = e.response.json().get("message", "")
            except Exception:
                body = e.response.text[:200]
        gh_logger.error(
            "GitHub API error | repo=%s/%s | status=%s | message=%s | url=%s",
            owner, repo, status, body, api_url,
        )
        raise

    tree = resp.json().get("tree", [])

    files = []
    for item in tree:
        if item.get("type") != "blob":
            continue
        path = item["path"]
        ext = PurePosixPath(path).suffix.lower()
        if ext not in COBOL_EXTENSIONS:
            continue
        name = PurePosixPath(path).stem.upper()
        files.append({
            "path": path,
            "name": name,
            "ext": ext,
            "type": COBOL_EXTENSIONS[ext],
        })

    return {
        "files": files,
        "total_files": len(files),
    }


def fetch_repo_sources(
    repo_url: str,
    branch: str = "HEAD",
    max_chars: int | None = MAX_SOURCE_CHARS,
) -> list[dict]:
    """Download COBOL source files from a GitHub repository.

    Fetches the file tree, then downloads the raw content for each
    COBOL-relevant file.

    Args:
        repo_url: A GitHub repository URL (e.g. "github.com/org/repo").
        branch: The branch to fetch from (default "HEAD").
        max_chars: Maximum total characters to fetch. Set to None to
            fetch all files with no limit. Defaults to MAX_SOURCE_CHARS
            (for LLM prompt pipelines).

    Returns:
        A list of dicts, each with:
            path  – relative path inside the repo
            name  – uppercased stem (e.g. "ACCT0010")
            ext   – file extension (e.g. ".cbl")
            type  – node type ("program", "copybook", "job", "screen")
            content – the raw source text of the file
    """
    owner, repo, _url_branch = _parse_github_url(repo_url)
    headers = _github_headers()

    # 1. Get the file listing
    try:
        file_info = list_repo_files(repo_url, branch=branch)
    except Exception:
        # list_repo_files already logs the details via gh_logger
        raise
    files = file_info["files"]
    if not files:
        logger.info("No COBOL files found in %s/%s", owner, repo)
        return []

    logger.info("Downloading %d source files from %s/%s@%s", len(files), owner, repo, branch)

    # 2. Download each file via raw.githubusercontent.com
    #    This avoids the GitHub API rate limit entirely (no auth needed,
    #    no per-file API call).  Auth header is still sent for private repos.
    raw_headers = {}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        raw_headers["Authorization"] = f"token {token}"

    sources: list[dict] = []
    failed_files: list[str] = []
    total_chars = 0

    for f in files:
        if max_chars is not None and total_chars >= max_chars:
            logger.info(
                "Reached %d-char source limit after %d/%d files",
                max_chars, len(sources), len(files),
            )
            break

        # raw.githubusercontent.com serves plain text, no base64 decoding needed
        encoded_path = quote(f["path"], safe="/")
        raw_url = (
            f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{encoded_path}"
        )
        try:
            resp = requests.get(raw_url, headers=raw_headers, timeout=15)
            resp.raise_for_status()
            raw = resp.text
        except requests.HTTPError as e:
            status = e.response.status_code if e.response is not None else "N/A"
            gh_logger.error(
                "File download failed | repo=%s/%s | file=%s | status=%s | error=%s",
                owner, repo, f["path"], status, e,
            )
            failed_files.append(f["path"])
            continue
        except requests.Timeout:
            gh_logger.error(
                "File download timed out | repo=%s/%s | file=%s | timeout=15s",
                owner, repo, f["path"],
            )
            failed_files.append(f["path"])
            continue
        except requests.ConnectionError as e:
            gh_logger.error(
                "Connection lost during download | repo=%s/%s | file=%s | error=%s",
                owner, repo, f["path"], e,
            )
            failed_files.append(f["path"])
            continue
        except Exception as e:
            gh_logger.error(
                "Unexpected error downloading file | repo=%s/%s | file=%s | type=%s | error=%s",
                owner, repo, f["path"], type(e).__name__, e,
            )
            failed_files.append(f["path"])
            continue

        total_chars += len(raw)
        sources.append({
            "path": f["path"],
            "name": f["name"],
            "ext": f["ext"],
            "type": f["type"],
            "content": raw,
        })

    # Summary log
    if failed_files:
        gh_logger.warning(
            "Fetch summary | repo=%s/%s | fetched=%d | failed=%d | failed_files=%s",
            owner, repo, len(sources), len(failed_files), ", ".join(failed_files),
        )
    else:
        logger.info(
            "All %d files fetched successfully from %s/%s (%d chars total)",
            len(sources), owner, repo, total_chars,
        )

    return sources
