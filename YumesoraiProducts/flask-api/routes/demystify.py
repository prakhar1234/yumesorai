"""Routes for the demystify endpoint."""

import json

from flask import Blueprint, Response, jsonify, request, stream_with_context

import logging

from services.llm_provider import get_provider
from services.prompt_builder import build_system_prompt, build_user_prompt
from services.storage import save_analysis
from services.github_files import list_repo_files, fetch_repo_sources
from services.coverage import compute_coverage
from services.cobol_graph_builder import build_graph_from_sources
from services.edge_validation import validate_graph
from config import Config

logger = logging.getLogger(__name__)

demystify_bp = Blueprint("demystify", __name__)


@demystify_bp.route("/api/demystify", methods=["POST"])
def demystify():
    """Analyze a COBOL repository and return a knowledge graph.

    Expects JSON body:
        repo_url (str): URL or path to the repository.
        input_type (str): One of "github", "server", or "local".
        source_type (str, optional): Additional source type qualifier.
        mode (str, optional): "static" for regex-based analysis (no LLM),
                              "llm" for LLM-based analysis,
                              "auto" (default) tries LLM first, falls back to static.

    Returns:
        JSON with nodes, edges, domains, and metadata.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    repo_url = data.get("repo_url")
    if not repo_url:
        return jsonify({"error": "repo_url is required"}), 400

    input_type = data.get("input_type", "github")
    if input_type not in ("github", "server"):
        return jsonify({"error": "input_type must be one of: github, server"}), 400

    source_type = data.get("source_type")
    mode = data.get("mode", "auto")

    try:
        # Fetch actual source files from GitHub when possible
        sources = None
        fetch_status = {"source": "url_only", "files_fetched": 0, "error": None}
        if input_type == "github":
            try:
                sources = fetch_repo_sources(repo_url)
                fetch_status["source"] = "github_api"
                fetch_status["files_fetched"] = len(sources) if sources else 0
                logger.info("Fetched %d source files from %s", len(sources or []), repo_url)
            except Exception as e:
                fetch_status["error"] = str(e)
                logger.warning("Source fetch failed for %s: %s", repo_url, e)

        # Decide analysis strategy
        result = None

        if mode == "static":
            # Static analysis only — no LLM
            result = _static_analysis(sources, repo_url, fetch_status)
        elif mode == "llm":
            # LLM only — raise on failure
            result = _llm_analysis(repo_url, input_type, source_type, sources)
        else:
            # Auto: try LLM first, fall back to static analysis
            try:
                result = _llm_analysis(repo_url, input_type, source_type, sources)
            except Exception as e:
                logger.warning(
                    "LLM analysis failed, falling back to static analysis: %s", e
                )
                result = _static_analysis(sources, repo_url, fetch_status)
                if result is None:
                    raise  # re-raise LLM error if static also can't help

        if result is None:
            return jsonify({"error": "No source files found to analyze"}), 400

        analysis_id = save_analysis(result, repo_url, input_type)
        result["analysis_id"] = analysis_id
        result["fetch_status"] = fetch_status

        # Edge validation (non-blocking)
        try:
            source_map = result.pop("_source_map", None)
            if source_map:
                result["validation"] = validate_graph(result, source_map)
        except Exception as e:
            logger.warning("Edge validation failed for %s: %s", repo_url, e)

        # Attempt coverage calculation for GitHub repos (non-blocking)
        if input_type == "github":
            try:
                repo_files = list_repo_files(repo_url)
                coverage = compute_coverage(result, repo_files)
                result["coverage"] = coverage
            except Exception as e:
                logger.warning("Auto-coverage failed for %s: %s", repo_url, e)

        # Remove internal maps before serializing
        result.pop("_file_stem_map", None)

        return jsonify(result), 200
    except ValueError as e:
        return jsonify({"error": "Configuration error", "message": str(e)}), 400
    except Exception as e:
        return jsonify({"error": "Analysis failed", "message": str(e)}), 500


def _llm_analysis(repo_url, input_type, source_type, sources):
    """Run LLM-based analysis."""
    provider = get_provider(Config)
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(repo_url, input_type, source_type, sources)
    return provider.analyze(system_prompt, user_prompt)


def _static_analysis(sources, repo_url, fetch_status):
    """Run static regex-based analysis on downloaded sources."""
    if not sources:
        return None
    result = build_graph_from_sources(sources, repo_url)
    fetch_status["analysis_mode"] = "static"
    return result


def _sse_event(event_type, data):
    """Format a server-sent event."""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


@demystify_bp.route("/api/demystify/stream", methods=["POST"])
def demystify_stream():
    """SSE streaming version of the demystify endpoint.

    Emits progress events as the pipeline executes, then a final result event.
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "Request body must be valid JSON"}), 400

    repo_url = data.get("repo_url")
    if not repo_url:
        return jsonify({"error": "repo_url is required"}), 400

    input_type = data.get("input_type", "github")
    if input_type not in ("github", "server"):
        return jsonify({"error": "input_type must be one of: github, server"}), 400

    source_type = data.get("source_type")
    mode = data.get("mode", "auto")

    def generate():
        try:
            # --- Stage: fetch ---
            sources = None
            fetch_status = {"source": "url_only", "files_fetched": 0, "error": None}

            if input_type == "github":
                yield _sse_event("progress", {
                    "stage": "fetch",
                    "status": "started",
                    "message": "Connecting to GitHub...",
                })

                def on_file_fetched(downloaded, total, current_file):
                    pass  # per-file events are yielded below via a list

                file_events = []

                def collect_file_event(downloaded, total, current_file):
                    file_events.append({
                        "downloaded": downloaded,
                        "total": total,
                        "current_file": current_file,
                    })

                try:
                    sources = fetch_repo_sources(repo_url, on_file_fetched=collect_file_event)
                    fetch_status["source"] = "github_api"
                    fetch_status["files_fetched"] = len(sources) if sources else 0
                    logger.info("Fetched %d source files from %s", len(sources or []), repo_url)
                except Exception as e:
                    fetch_status["error"] = str(e)
                    logger.warning("Source fetch failed for %s: %s", repo_url, e)

                yield _sse_event("progress", {
                    "stage": "fetch",
                    "status": "done",
                    "message": f"Downloaded {fetch_status['files_fetched']} files"
                              if not fetch_status["error"]
                              else f"Fetch failed: {fetch_status['error']}",
                    "detail": {
                        "files_fetched": fetch_status["files_fetched"],
                        "failed": 1 if fetch_status["error"] else 0,
                        "error": fetch_status["error"],
                    },
                })

            # --- Stage: analysis ---
            yield _sse_event("progress", {
                "stage": "analysis",
                "status": "started",
                "message": "Analyzing source code...",
                "detail": {"mode": mode},
            })

            # Keepalive before potentially long LLM call
            yield ": keepalive\n\n"

            result = None
            if mode == "static":
                result = _static_analysis(sources, repo_url, fetch_status)
            elif mode == "llm":
                result = _llm_analysis(repo_url, input_type, source_type, sources)
            else:
                try:
                    result = _llm_analysis(repo_url, input_type, source_type, sources)
                except Exception as e:
                    logger.warning(
                        "LLM analysis failed, falling back to static analysis: %s", e
                    )
                    result = _static_analysis(sources, repo_url, fetch_status)
                    if result is None:
                        raise

            if result is None:
                yield _sse_event("error", {
                    "message": "No source files found to analyze",
                })
                return

            node_count = len(result.get("nodes", []))
            edge_count = len(result.get("edges", []))

            yield _sse_event("progress", {
                "stage": "analysis",
                "status": "done",
                "message": f"Built graph: {node_count} nodes, {edge_count} edges",
                "detail": {"nodes": node_count, "edges": edge_count},
            })

            # --- Stage: validation ---
            yield _sse_event("progress", {
                "stage": "validation",
                "status": "started",
                "message": "Validating edges...",
            })

            try:
                source_map = result.pop("_source_map", None)
                if source_map:
                    result["validation"] = validate_graph(result, source_map)
                    score = result["validation"].get("score", 0)
                    yield _sse_event("progress", {
                        "stage": "validation",
                        "status": "done",
                        "message": f"Edge validation score: {score}",
                        "detail": {"score": score},
                    })
                else:
                    yield _sse_event("progress", {
                        "stage": "validation",
                        "status": "done",
                        "message": "Validation skipped (no source map)",
                    })
            except Exception as e:
                logger.warning("Edge validation failed for %s: %s", repo_url, e)
                yield _sse_event("progress", {
                    "stage": "validation",
                    "status": "done",
                    "message": "Validation skipped",
                })

            # --- Stage: coverage ---
            if input_type == "github":
                yield _sse_event("progress", {
                    "stage": "coverage",
                    "status": "started",
                    "message": "Computing coverage...",
                })

                try:
                    repo_files = list_repo_files(repo_url)
                    coverage = compute_coverage(result, repo_files)
                    result["coverage"] = coverage
                    pct = coverage.get("coverage_pct", 0)
                    yield _sse_event("progress", {
                        "stage": "coverage",
                        "status": "done",
                        "message": f"Coverage: {pct}%",
                        "detail": {"coverage_pct": pct},
                    })
                except Exception as e:
                    logger.warning("Auto-coverage failed for %s: %s", repo_url, e)
                    yield _sse_event("progress", {
                        "stage": "coverage",
                        "status": "done",
                        "message": "Coverage calculation skipped",
                    })

            # --- Save and emit result ---
            analysis_id = save_analysis(result, repo_url, input_type)
            result["analysis_id"] = analysis_id
            result["fetch_status"] = fetch_status

            # Remove internal maps before serializing
            result.pop("_file_stem_map", None)

            yield _sse_event("result", result)

        except Exception as e:
            logger.exception("Stream analysis failed for %s", repo_url)
            yield _sse_event("error", {
                "message": "Analysis failed",
                "detail": str(e),
            })

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
