"""Routes for the program BRD (Business Requirements Document) endpoint."""

import json
import logging
import re

from flask import Blueprint, jsonify, request

from config import Config
from services.brd_cache import get_cached_brd, save_brd_cache, check_brd_freshness, delete_cached_brd
from services.code_edits_cache import save_code_edits
from services.github_files import _parse_github_url
from services.llm_provider import get_provider

logger = logging.getLogger(__name__)

program_brd_bp = Blueprint("program_brd", __name__)

SYSTEM_PROMPT = (
    "You are a senior COBOL business analyst. Given the full source code of a COBOL "
    "program, produce a comprehensive Business Requirements Document (BRD) as a JSON "
    "object with full code traceability. Every statement you make must be traceable "
    "back to the actual COBOL source.\n\n"
    "The JSON must have exactly these keys. Each key's value is an array of "
    "traceable item objects (except data_inputs_outputs, described below). "
    "Each traceable item has this shape:\n"
    "{\n"
    '  "statement": "English description of the business logic",\n'
    '  "code_references": [\n'
    "    {\n"
    '      "paragraph": "2100-VALIDATE-RECORD",\n'
    '      "lines": "129-136",\n'
    '      "snippet": "       2100-VALIDATE-RECORD.\\n'
    '           MOVE \'Y\' TO WS-VALID-FLAG\\n           ..."\n'
    "    }\n"
    "  ]\n"
    "}\n\n"
    "Keys:\n"
    "1. \"purpose\" - An array with one traceable item: the program summary, with "
    "code_references pointing to the key paragraphs that define the program's purpose "
    "(e.g. PROGRAM-ID, main SECTION, top-level PERFORM).\n"
    "2. \"business_rules\" - An array of traceable items, one per business rule "
    "(validations, thresholds, conditions, routing logic). Each must cite the exact "
    "COBOL paragraph and lines that implement the rule.\n"
    "3. \"data_inputs_outputs\" - An object with \"inputs\" and \"outputs\" keys, each an "
    "array of traceable items describing a file, database table, queue, or copybook, "
    "with code_references to the relevant FD, SELECT, EXEC SQL, or COPY statements.\n"
    "4. \"processing_logic\" - An array of traceable items describing each step of the "
    "main processing flow, from initialization through termination.\n"
    "5. \"dependencies\" - An array of traceable items, one per external program, "
    "copybook, vendor module, CICS transaction, or DB2 table dependency.\n"
    "6. \"error_handling\" - An array of traceable items, one per error-handling "
    "mechanism (abend handling, error flags, rollback, logging).\n"
    "7. \"downstream_effects\" - An array of traceable items, one per downstream "
    "system, process, or report affected by this program's output.\n\n"
    "Rules for code_references:\n"
    "- \"paragraph\": The COBOL paragraph or section name (e.g. \"2100-VALIDATE-RECORD\").\n"
    "- \"lines\": The line range in the source (e.g. \"129-136\").\n"
    "- \"snippet\": Quote the exact COBOL source lines, preserving original indentation. "
    "Keep snippets concise (typically 3-10 lines). Use \"...\" to abbreviate long blocks.\n"
    "- Every traceable item must have at least one code_reference.\n\n"
    "Return ONLY the JSON object, no markdown fences, no commentary."
)


def _extract_program_id(file_path: str) -> tuple[str, str]:
    """Extract program_name and program_id from a file path."""
    program_name = file_path.split("/")[-1] if "/" in file_path else file_path
    program_id = program_name.replace(".cbl", "").replace(".CBL", "")
    return program_name, program_id


@program_brd_bp.route("/api/program-brd", methods=["POST"])
def program_brd():
    """Generate a full BRD for an entire COBOL program.

    Expects JSON body:
        program_content (str): The full COBOL source code.
        file_path (str, optional): The source file name for context.
        repo_url (str, optional): The repository URL for context.
        commit_sha (str, optional): Current commit SHA for cache freshness.
        branch (str, optional): Branch name for cache key.

    Returns:
        JSON with a "brd" object, "cached" boolean, and "generated_at" timestamp.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    program_content = data.get("program_content", "").strip()
    if not program_content:
        return jsonify({"error": "program_content is required"}), 400

    file_path = data.get("file_path", "unknown")
    repo_url = data.get("repo_url", "")
    commit_sha = data.get("commit_sha", "")
    branch = data.get("branch", "")

    program_name, program_id = _extract_program_id(file_path)

    # --- Cache lookup ---
    # Only attempt cache if we have enough info to key on
    owner, repo = None, None
    if repo_url and commit_sha and branch:
        try:
            owner, repo, _ = _parse_github_url(repo_url)
        except ValueError:
            logger.warning("Could not parse repo_url for cache: %s", repo_url)

    if owner and repo and commit_sha and branch:
        cached = get_cached_brd(owner, repo, branch, program_id)
        if cached and cached.get("commit_sha") == commit_sha:
            logger.info(
                "Serving cached BRD for %s/%s@%s program=%s (sha=%s)",
                owner, repo, branch, program_id, commit_sha[:8],
            )
            return jsonify({
                "brd": cached["brd"],
                "cached": True,
                "generated_at": cached.get("generated_at", ""),
            })

    # --- Generate via LLM ---
    user_prompt = f"File: {file_path}\n\n```cobol\n{program_content}\n```"
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

        brd_data = {
            "program_id": program_id,
            "program_name": program_name,
            "sections": sections,
        }

        # --- Save to cache ---
        generated_at = ""
        if owner and repo and commit_sha and branch:
            save_brd_cache(
                owner, repo, branch, program_id, commit_sha, file_path, brd_data
            )
            # Read back the generated_at from what we just saved
            fresh = get_cached_brd(owner, repo, branch, program_id)
            if fresh:
                generated_at = fresh.get("generated_at", "")

        return jsonify({
            "brd": brd_data,
            "cached": False,
            "generated_at": generated_at,
        })

    except json.JSONDecodeError as e:
        logger.error("BRD JSON parse error: %s\nRaw: %s", e, raw[:500] if 'raw' in dir() else 'N/A')
        return jsonify({"error": f"Failed to parse BRD response as JSON: {str(e)}"}), 502

    except Exception as e:
        logger.error("Program BRD error: %s", e, exc_info=True)
        return jsonify({"error": f"BRD generation failed: {str(e)}"}), 500


@program_brd_bp.route("/api/program-brd/check-freshness", methods=["POST"])
def check_freshness():
    """Check if a cached BRD is stale compared to GitHub's latest commit.

    Expects JSON body:
        repo_url (str): The repository URL.
        branch (str): Branch name.
        file_path (str): The source file path.

    Returns:
        JSON with freshness info including timestamps.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    repo_url = data.get("repo_url", "")
    branch = data.get("branch", "")
    file_path = data.get("file_path", "")

    if not repo_url or not branch or not file_path:
        return jsonify({"error": "repo_url, branch, and file_path are required"}), 400

    try:
        owner, repo, _ = _parse_github_url(repo_url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    _, program_id = _extract_program_id(file_path)

    try:
        result = check_brd_freshness(owner, repo, branch, program_id)
        return jsonify(result)
    except Exception as e:
        logger.error("Freshness check error: %s", e, exc_info=True)
        return jsonify({"error": f"Freshness check failed: {str(e)}"}), 500


@program_brd_bp.route("/api/program-brd/save-code", methods=["POST"])
def save_code():
    """Save user-edited code to the local disk cache and invalidate the BRD cache.

    Expects JSON body:
        repo_url (str): The repository URL.
        branch (str): Branch name.
        file_path (str): The source file path.
        content (str): The edited code content.

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

    if not repo_url or not branch or not file_path or content is None:
        return jsonify({"error": "repo_url, branch, file_path, and content are required"}), 400

    try:
        owner, repo, _ = _parse_github_url(repo_url)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    _, program_id = _extract_program_id(file_path)
    commit_sha = data.get("commit_sha", "")

    try:
        saved_at = save_code_edits(
            owner, repo, branch, program_id, file_path, content, commit_sha
        )
        # Invalidate the BRD cache so next BRD request regenerates
        delete_cached_brd(owner, repo, branch, program_id)

        return jsonify({"saved": True, "saved_at": saved_at})
    except Exception as e:
        logger.error("Save code error: %s", e, exc_info=True)
        return jsonify({"error": f"Failed to save code: {str(e)}"}), 500
