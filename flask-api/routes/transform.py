"""Routes for the code transformation endpoint."""

import json
import logging
import re

from flask import Blueprint, jsonify, request

from config import Config
from services.transform_cache import (
    get_cached_transform,
    save_transform_cache,
    check_transform_freshness,
    delete_cached_transform,
)
from services.transform_edits_cache import (
    get_saved_transform_edits,
    save_transform_edits,
)
from services.github_files import _parse_github_url
from services.llm_provider import get_provider

logger = logging.getLogger(__name__)

transform_bp = Blueprint("transform", __name__)

SYSTEM_PROMPT = (
    "You are a senior mainframe modernization architect. Given the full source code "
    "of a COBOL program, a target language, and a target database, produce a complete "
    "modernized version of the program.\n\n"
    "Rules:\n"
    "1. Preserve ALL business logic exactly. Every conditional, calculation, and "
    "data transformation must be faithfully reproduced.\n"
    "2. Replace EXEC SQL blocks with idiomatic ORM / repository patterns for the "
    "target database.\n"
    "3. Replace CALL statements with service method invocations.\n"
    "4. Use idiomatic patterns for the target language (e.g., Spring Boot for Java, "
    ".NET 8 for C#, FastAPI for Python).\n"
    "5. Produce clean, production-ready code with proper error handling.\n\n"
    "Return ONLY a JSON object with exactly these keys:\n"
    "{\n"
    '  "modern_source": "The complete modernized source code as a single string",\n'
    '  "file_tree": ["list", "of", "generated/file/paths"],\n'
    '  "plan": {\n'
    '    "approach": "Brief description of the transformation approach",\n'
    '    "patterns_used": ["list of design patterns applied"],\n'
    '    "sql_strategy": "How SQL was converted",\n'
    '    "call_strategy": "How CALL statements were converted"\n'
    "  }\n"
    "}\n\n"
    "Return ONLY the JSON object, no markdown fences, no commentary."
)


def _extract_program_id(file_path: str) -> tuple[str, str]:
    """Extract program_name and program_id from a file path."""
    program_name = file_path.split("/")[-1] if "/" in file_path else file_path
    program_id = program_name.replace(".cbl", "").replace(".CBL", "")
    return program_name, program_id


def _lang_label(target_lang: str) -> str:
    """Convert a target_lang id to a human-readable label."""
    labels = {
        "java": "Java / Spring Boot",
        "csharp": "C# / .NET 8",
        "python": "Python / FastAPI",
        "microservices": "Cloud microservices",
    }
    return labels.get(target_lang, target_lang)


def _db_label(target_db: str) -> str:
    """Convert a target_db id to a human-readable label."""
    labels = {
        "postgresql": "PostgreSQL",
        "oracle": "Oracle",
        "mssql": "MS SQL Server",
        "dynamodb": "DynamoDB",
    }
    return labels.get(target_db, target_db)


@transform_bp.route("/api/transform", methods=["POST"])
def transform():
    """Transform a COBOL program to a modern language.

    Expects JSON body:
        program_content (str): The full COBOL source code.
        file_path (str, optional): The source file name for context.
        repo_url (str, optional): The repository URL for context.
        commit_sha (str, optional): Current commit SHA for cache freshness.
        branch (str, optional): Branch name for cache key.
        target_lang (str): Target language id (java, csharp, python, microservices).
        target_db (str): Target database id (postgresql, oracle, mssql, dynamodb).

    Returns:
        JSON with modern_source, file_tree, plan, cached flag, generated_at.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    program_content = data.get("program_content", "").strip()
    if not program_content:
        return jsonify({"error": "program_content is required"}), 400

    target_lang = data.get("target_lang", "java")
    target_db = data.get("target_db", "postgresql")
    file_path = data.get("file_path", "unknown")
    repo_url = data.get("repo_url", "")
    commit_sha = data.get("commit_sha", "")
    branch = data.get("branch", "")

    program_name, program_id = _extract_program_id(file_path)

    # --- Cache lookup ---
    owner, repo = None, None
    if repo_url and commit_sha and branch:
        try:
            owner, repo, _ = _parse_github_url(repo_url)
        except ValueError:
            logger.warning("Could not parse repo_url for cache: %s", repo_url)

    if owner and repo and commit_sha and branch:
        cached = get_cached_transform(owner, repo, branch, program_id, target_lang)
        if cached and cached.get("commit_sha") == commit_sha:
            logger.info(
                "Serving cached transform for %s/%s@%s program=%s lang=%s (sha=%s)",
                owner, repo, branch, program_id, target_lang, commit_sha[:8],
            )
            return jsonify({
                "modern_source": cached["modern_source"],
                "file_tree": cached.get("file_tree", []),
                "plan": cached.get("plan", {}),
                "cobol_source": cached.get("cobol_source", program_content),
                "cached": True,
                "generated_at": cached.get("generated_at", ""),
            })

    # --- Generate via LLM ---
    lang_lbl = _lang_label(target_lang)
    db_lbl = _db_label(target_db)

    user_prompt = (
        f"Target Language: {lang_lbl}\n"
        f"Target Database: {db_lbl}\n"
        f"File: {file_path}\n\n"
        f"```cobol\n{program_content}\n```"
    )
    if repo_url:
        user_prompt = f"Repository: {repo_url}\n{user_prompt}"

    try:
        provider = get_provider(Config)

        if hasattr(provider, "client") and hasattr(provider, "model"):
            # Anthropic provider
            collected = []
            with provider.client.messages.stream(
                model=provider.model,
                max_tokens=16384,
                system=SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_prompt}],
            ) as stream:
                for text in stream.text_stream:
                    collected.append(text)
            raw = "".join(collected).strip()
        else:
            # Fallback: use analyze and extract text
            result = provider.analyze(SYSTEM_PROMPT, user_prompt)
            raw = str(result)

        # Strip markdown fences if the LLM wrapped the JSON
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw)
        cleaned = re.sub(r"\s*```$", "", cleaned)

        sections = json.loads(cleaned)

        modern_source = sections.get("modern_source", "")
        file_tree = sections.get("file_tree", [])
        plan = sections.get("plan", {})

        # --- Save to cache ---
        generated_at = ""
        if owner and repo and commit_sha and branch:
            save_transform_cache(
                owner, repo, branch, program_id, target_lang, target_db,
                commit_sha, file_path, program_content, modern_source,
                file_tree, plan,
            )
            # Read back the generated_at from what we just saved
            fresh = get_cached_transform(owner, repo, branch, program_id, target_lang)
            if fresh:
                generated_at = fresh.get("generated_at", "")

        return jsonify({
            "modern_source": modern_source,
            "file_tree": file_tree,
            "plan": plan,
            "cobol_source": program_content,
            "cached": False,
            "generated_at": generated_at,
        })

    except json.JSONDecodeError as e:
        logger.error("Transform JSON parse error: %s\nRaw: %s", e, raw[:500] if 'raw' in dir() else 'N/A')
        return jsonify({"error": f"Failed to parse transform response as JSON: {str(e)}"}), 502

    except Exception as e:
        logger.error("Transform error: %s", e, exc_info=True)
        return jsonify({"error": f"Transformation failed: {str(e)}"}), 500


@transform_bp.route("/api/transform/check-freshness", methods=["POST"])
def transform_check_freshness():
    """Check if a cached transform is stale compared to GitHub's latest commit.

    Expects JSON body:
        repo_url (str): The repository URL.
        branch (str): Branch name.
        file_path (str): The source file path.
        target_lang (str): Target language id.

    Returns:
        JSON with freshness info including timestamps.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    repo_url = data.get("repo_url", "")
    branch = data.get("branch", "")
    file_path = data.get("file_path", "")
    target_lang = data.get("target_lang", "java")

    if not repo_url or not branch or not file_path:
        return jsonify({"error": "repo_url, branch, and file_path are required"}), 400

    try:
        owner, repo, _ = _parse_github_url(repo_url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    _, program_id = _extract_program_id(file_path)

    try:
        result = check_transform_freshness(owner, repo, branch, program_id, target_lang)
        return jsonify(result)
    except Exception as e:
        logger.error("Transform freshness check error: %s", e, exc_info=True)
        return jsonify({"error": f"Freshness check failed: {str(e)}"}), 500


@transform_bp.route("/api/transform/save-code", methods=["POST"])
def transform_save_code():
    """Save user-edited modern code and invalidate the transform cache.

    Expects JSON body:
        repo_url (str): The repository URL.
        branch (str): Branch name.
        file_path (str): The source file path.
        content (str): The edited modern code content.
        target_lang (str): Target language id.
        commit_sha (str, optional): The commit SHA.

    Returns:
        JSON with { saved: true, saved_at: ISO timestamp }.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    repo_url = data.get("repo_url", "")
    branch = data.get("branch", "")
    file_path = data.get("file_path", "")
    content = data.get("content")
    target_lang = data.get("target_lang", "java")

    if not repo_url or not branch or not file_path or content is None:
        return jsonify({"error": "repo_url, branch, file_path, and content are required"}), 400

    try:
        owner, repo, _ = _parse_github_url(repo_url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    _, program_id = _extract_program_id(file_path)
    commit_sha = data.get("commit_sha", "")

    try:
        saved_at = save_transform_edits(
            owner, repo, branch, program_id, target_lang,
            file_path, content, commit_sha,
        )
        # Invalidate the transform cache so next transform request regenerates
        delete_cached_transform(owner, repo, branch, program_id, target_lang)

        return jsonify({"saved": True, "saved_at": saved_at})
    except Exception as e:
        logger.error("Save transform code error: %s", e, exc_info=True)
        return jsonify({"error": f"Failed to save code: {str(e)}"}), 500


@transform_bp.route("/api/transform/get-edits", methods=["POST"])
def transform_get_edits():
    """Retrieve previously saved user edits to modern code.

    Expects JSON body:
        repo_url (str): The repository URL.
        branch (str): Branch name.
        file_path (str): The source file path.
        target_lang (str): Target language id.

    Returns:
        JSON with the saved edits or { edits: null } if none exist.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    repo_url = data.get("repo_url", "")
    branch = data.get("branch", "")
    file_path = data.get("file_path", "")
    target_lang = data.get("target_lang", "java")

    if not repo_url or not branch or not file_path:
        return jsonify({"error": "repo_url, branch, and file_path are required"}), 400

    try:
        owner, repo, _ = _parse_github_url(repo_url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    _, program_id = _extract_program_id(file_path)

    edits = get_saved_transform_edits(owner, repo, branch, program_id, target_lang)
    return jsonify({"edits": edits})
