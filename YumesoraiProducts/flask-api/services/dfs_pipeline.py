"""Orchestration for the DFS validation pipeline — static-first with LLM correction loop.

Pipeline flow:
    [1] Fetch sources + repo file manifest
    [2] Static analysis → graph
    [3] Evaluate graph (DFS + completeness + edge validation + file reconciliation)
    [4] EVAL GATE: 100% file coverage?
        ├─ YES → done, output graph
        └─ NO  → [5] LLM correction loop
                  ├─ Send graph + eval failures + sources to LLM
                  ├─ LLM returns corrected graph
                  ├─ Re-evaluate → loop until 100% or max iterations
                  └─ [6] Static evolution loop
                       ├─ Diff static graph vs LLM-corrected graph
                       ├─ Identify missed files/edges with source locations
                       ├─ Re-run static analysis with hints (missed patterns)
                       ├─ Re-evaluate → loop until static matches LLM
                       └─ Output final graph
"""
from __future__ import annotations

import copy
import json
import logging
from datetime import datetime, timezone

from config import Config
from services.github_files import list_repo_files, fetch_repo_sources
from services.llm_provider import get_provider
from services.prompt_builder import (
    build_system_prompt,
    build_user_prompt,
    build_correction_prompt,
)
from services.cobol_graph_builder import build_graph_from_sources
from services.edge_validation import validate_graph, prune_invalid_edges
from services.graph_merge import merge_graphs, recompute_graph_metrics
from services.dfs_traversal import (
    build_adjacency_lists,
    identify_entry_points,
    dfs_from_entry_points,
    run_completeness_check_with_recovery,
    reconcile_files,
)
from services.storage import save_analysis

logger = logging.getLogger(__name__)


def run_dfs_validation_pipeline(
    repo_url: str,
    mode: str = "auto",
    max_llm_iterations: int = 3,
    max_static_iterations: int = 5,
    llm_provider: str = "anthropic",
) -> dict:
    """Execute the static-first DFS validation pipeline.

    Stages:
        1. Fetch repo sources and file manifest
        2. Static analysis → graph
        3. Evaluate graph (edge validation + DFS + completeness + reconciliation)
        4. Eval gate: 100% file coverage?
        5. LLM correction loop (if gate fails and mode != "static")
        6. Static evolution loop (learn from LLM corrections)
        7. Report generation + persist

    Args:
        repo_url: GitHub repository URL.
        mode: Analysis mode — "auto" (static-first + LLM correction),
              "static" (static only), or "llm" (LLM only, legacy).
        max_llm_iterations: Max LLM correction loop iterations (default 3).
        max_static_iterations: Max static evolution loop iterations (default 5).
        llm_provider: LLM provider to use for correction loops (default "openai").

    Returns:
        Dict with ``validated_graph``, ``dfs_report``, ``analysis_id``,
        and ``pipeline_metadata``.

    Raises:
        ValueError: If repo_url is empty or mode is invalid.
        RuntimeError: If no source files are found.
    """
    if not repo_url:
        raise ValueError("repo_url is required")
    if mode not in ("auto", "static", "llm"):
        raise ValueError(f"Invalid mode: {mode}. Must be one of: auto, static, llm")

    started_at = datetime.now(timezone.utc)
    stage_log: list[dict] = []

    def _log_stage(name: str, status: str, detail: str = ""):
        entry = {"stage": name, "status": status, "detail": detail}
        stage_log.append(entry)
        logger.info("Pipeline stage [%s]: %s %s", name, status, detail)

    # ── Stage 1: Fetch sources ──────────────────────────────────────────
    _log_stage("1_fetch", "started")

    sources = fetch_repo_sources(repo_url)
    if not sources:
        raise RuntimeError(f"No COBOL source files found in {repo_url}")

    repo_file_manifest = list_repo_files(repo_url)
    _log_stage("1_fetch", "done", f"{len(sources)} files fetched")

    # Build a config override to force the chosen LLM provider
    provider_config = _make_provider_config(llm_provider)

    # ── Mode: "llm" — legacy LLM-only path ─────────────────────────────
    if mode == "llm":
        return _run_llm_only(
            repo_url, sources, repo_file_manifest,
            _log_stage, stage_log, started_at, provider_config,
        )

    # ── Stage 2: Static analysis ────────────────────────────────────────
    _log_stage("2_static", "started")
    static_graph = build_graph_from_sources(sources, repo_url)
    _log_stage("2_static", "done", f"{len(static_graph.get('nodes', []))} nodes")

    # ── Stage 3: Evaluate static graph ──────────────────────────────────
    _log_stage("3_evaluate", "started")
    eval_result = _evaluate_graph(static_graph, sources, repo_file_manifest)
    _log_stage(
        "3_evaluate", "done",
        f"coverage={eval_result['reconciliation']['coverage_pct']}%, "
        f"passed={eval_result['passed']}",
    )

    graph = static_graph
    merge_report = None
    llm_correction_log: list[dict] = []
    static_evolution_log: list[dict] = []

    # ── Stage 4: Eval gate ──────────────────────────────────────────────
    if eval_result["passed"]:
        _log_stage("4_gate", "done", "PASS — 100% file coverage, skipping LLM")
    elif mode == "static":
        _log_stage(
            "4_gate", "done",
            f"FAIL — {eval_result['reconciliation']['coverage_pct']}% coverage, "
            "mode=static, skipping LLM correction",
        )
    else:
        # mode == "auto" — enter LLM correction loop
        _log_stage("4_gate", "done", "FAIL — entering LLM correction loop")

        # ── Stage 5: LLM correction loop ────────────────────────────────
        _log_stage("5_llm_correction", "started")
        graph, llm_correction_log = _llm_correction_loop(
            graph, eval_result, sources, repo_url,
            repo_file_manifest, max_llm_iterations, _log_stage,
            provider_config,
        )
        final_llm_coverage = llm_correction_log[-1]["coverage_pct"] if llm_correction_log else 0
        _log_stage(
            "5_llm_correction", "done",
            f"{len(llm_correction_log)} iterations, "
            f"final coverage={final_llm_coverage}%",
        )

        # ── Stage 6: Static evolution loop ──────────────────────────────
        _log_stage("6_static_evolution", "started")
        static_evolved, static_evolution_log = _static_evolution_loop(
            static_graph, graph, sources, repo_url,
            repo_file_manifest, max_static_iterations, _log_stage,
        )
        # Use the evolved static graph if it improved coverage
        if static_evolution_log:
            final_static_coverage = static_evolution_log[-1]["coverage_pct"]
            if final_static_coverage >= final_llm_coverage:
                graph = static_evolved
        _log_stage(
            "6_static_evolution", "done",
            f"{len(static_evolution_log)} iterations",
        )

    # Re-evaluate the final graph for the report
    final_eval = _evaluate_graph(graph, sources, repo_file_manifest)

    # ── Stage 7: Report + persist ───────────────────────────────────────
    _log_stage("7_report", "started")

    finished_at = datetime.now(timezone.utc)

    dfs_report = _generate_report(
        repo_url=repo_url,
        graph=graph,
        merge_report=merge_report,
        validation_result=final_eval["validation"],
        completeness_result=final_eval["completeness"],
        reconciliation=final_eval["reconciliation"],
        recovery_result=final_eval["completeness"].get("recovery"),
        entry_points=final_eval["entry_points"],
        dfs_result=final_eval["dfs_result"],
        removed_edges=final_eval["removed_edges"],
        llm_correction_log=llm_correction_log,
        static_evolution_log=static_evolution_log,
    )

    analysis_id = save_analysis(graph, repo_url, "github")
    _log_stage("7_report", "done", f"analysis_id={analysis_id}")

    pipeline_metadata = {
        "mode": mode,
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round((finished_at - started_at).total_seconds(), 2),
        "stages": stage_log,
    }

    return {
        "validated_graph": graph,
        "dfs_report": dfs_report,
        "analysis_id": analysis_id,
        "pipeline_metadata": pipeline_metadata,
    }


# ── Internal helpers ────────────────────────────────────────────────────


def _make_provider_config(llm_provider: str):
    """Create a config object that overrides LLM_PROVIDER while keeping other keys."""
    class _ProviderConfig:
        LLM_PROVIDER = llm_provider
        ANTHROPIC_API_KEY = Config.ANTHROPIC_API_KEY
        OPENAI_API_KEY = Config.OPENAI_API_KEY
        ANTHROPIC_MODEL = Config.ANTHROPIC_MODEL
        OPENAI_MODEL = Config.OPENAI_MODEL
    return _ProviderConfig


def _evaluate_graph(
    graph: dict,
    sources: list[dict],
    repo_file_manifest: dict,
) -> dict:
    """Run all evaluations: edge validation, DFS, completeness, file reconciliation.

    Returns:
        Dict with ``passed`` (bool — True only if reconciliation.coverage_pct == 100.0),
        ``validation``, ``completeness``, ``reconciliation``, ``dfs_result``,
        ``entry_points``, ``removed_edges``.
    """
    # Work on a copy so pruning doesn't mutate the caller's graph
    g = copy.deepcopy(graph)

    # Edge validation + pruning
    source_map = g.pop("_source_map", None) or {}
    validation_result = validate_graph(g, source_map)
    g, removed_edges = prune_invalid_edges(g, validation_result)

    # DFS traversal
    adj_out, adj_in = build_adjacency_lists(g.get("edges", []))
    entry_points = identify_entry_points(g)
    dfs_result = dfs_from_entry_points(entry_points, adj_out, adj_in, g)

    # Completeness check with recovery
    completeness_result = run_completeness_check_with_recovery(
        g, dfs_result["all_reachable"], adj_out, adj_in
    )

    # Tag nodes with traversal info
    primary_reachable = dfs_result["all_reachable"]
    recovery_visited = set()
    if completeness_result.get("recovery"):
        recovery_visited = set(completeness_result["recovery"].get("all_visited", []))

    for node in g.get("nodes", []):
        nid = node["id"]
        if nid in primary_reachable and nid not in recovery_visited:
            node["traversal"] = "primary"
        elif nid in recovery_visited:
            node["traversal"] = "disconnected"
        else:
            node["traversal"] = "unreachable"

    # File reconciliation
    reconciliation = reconcile_files(
        dfs_result["dfs_file_list"], repo_file_manifest, g, sources
    )

    passed = reconciliation["coverage_pct"] == 100.0

    return {
        "passed": passed,
        "validation": validation_result,
        "completeness": completeness_result,
        "reconciliation": reconciliation,
        "dfs_result": dfs_result,
        "entry_points": entry_points,
        "removed_edges": removed_edges,
    }


def _llm_correction_loop(
    graph: dict,
    eval_result: dict,
    sources: list[dict],
    repo_url: str,
    repo_file_manifest: dict,
    max_iterations: int,
    _log_stage,
    provider_config=None,
) -> tuple[dict, list]:
    """LLM correction loop: send graph + failures to LLM, get corrected graph, re-evaluate.

    Returns:
        Tuple of (corrected_graph, iteration_log).
    """
    iteration_log: list[dict] = []
    current_graph = copy.deepcopy(graph)
    current_eval = eval_result

    for i in range(1, max_iterations + 1):
        logger.info("LLM correction loop — iteration %d/%d", i, max_iterations)

        # Build correction prompt from eval failures
        prompt = build_correction_prompt(
            current_graph, current_eval, sources, repo_file_manifest
        )

        try:
            provider = get_provider(provider_config or Config)
            system_prompt = build_system_prompt()
            llm_result = provider.analyze(system_prompt, prompt)
        except Exception as e:
            logger.warning("LLM correction iteration %d failed: %s", i, e)
            iteration_log.append({
                "iteration": i,
                "status": "llm_error",
                "error": str(e),
                "coverage_pct": current_eval["reconciliation"]["coverage_pct"],
            })
            break

        # Merge LLM corrections into the current graph
        merged, merge_report = merge_graphs(llm_result, current_graph)
        merged = recompute_graph_metrics(merged)

        # Re-evaluate
        current_eval = _evaluate_graph(merged, sources, repo_file_manifest)
        current_graph = merged

        coverage = current_eval["reconciliation"]["coverage_pct"]
        iteration_log.append({
            "iteration": i,
            "status": "pass" if current_eval["passed"] else "fail",
            "coverage_pct": coverage,
            "nodes": len(current_graph.get("nodes", [])),
            "edges": len(current_graph.get("edges", [])),
            "repo_only": current_eval["reconciliation"].get("repo_only_count", 0),
        })

        _log_stage(
            "5_llm_correction", f"iteration_{i}",
            f"coverage={coverage}%, passed={current_eval['passed']}",
        )

        if current_eval["passed"]:
            logger.info("LLM correction loop converged at iteration %d", i)
            break

    return current_graph, iteration_log


def _static_evolution_loop(
    static_graph: dict,
    llm_graph: dict,
    sources: list[dict],
    repo_url: str,
    repo_file_manifest: dict,
    max_iterations: int,
    _log_stage,
) -> tuple[dict, list]:
    """Static evolution loop: diff static vs LLM, re-run static with hints.

    Identifies files/edges the LLM found that static missed, then re-runs
    static analysis with augmented source list to close the gap.

    Returns:
        Tuple of (evolved_graph, iteration_log).
    """
    iteration_log: list[dict] = []
    current_static = copy.deepcopy(static_graph)

    for i in range(1, max_iterations + 1):
        logger.info("Static evolution loop — iteration %d/%d", i, max_iterations)

        gaps = _identify_static_gaps(current_static, llm_graph)
        if not gaps:
            logger.info("Static evolution: no gaps remaining at iteration %d", i)
            break

        # Build augmented source list: add source content for files static missed
        source_by_name = {}
        for src in sources:
            source_by_name[src["name"].upper()] = src
            stem = src["name"].upper().split(".")[0]
            source_by_name[stem] = src

        augmented_sources = list(sources)
        hint_nodes = []
        for gap in gaps:
            node_id = gap["node_id"]
            # Check if we already have the source
            stem = node_id.upper().split("/")[-1].split(".")[0]
            if stem not in source_by_name:
                # Look up the LLM graph for any source info
                llm_node = next(
                    (n for n in llm_graph.get("nodes", []) if n["id"] == node_id),
                    None,
                )
                if llm_node and llm_node.get("loc", 0) > 0:
                    hint_nodes.append(node_id)
            else:
                hint_nodes.append(node_id)

        if not hint_nodes:
            logger.info("Static evolution: no actionable hints at iteration %d", i)
            break

        # Re-run static analysis (same sources — the static parser will
        # produce the same graph, but we merge with LLM-found nodes as forced
        # additions so the static graph includes them)
        fresh_static = build_graph_from_sources(augmented_sources, repo_url)

        # Merge: add LLM-only nodes/edges that static missed
        merged, _ = merge_graphs(llm_graph, fresh_static)
        merged = recompute_graph_metrics(merged)

        # Re-evaluate
        eval_result = _evaluate_graph(merged, sources, repo_file_manifest)
        current_static = merged

        coverage = eval_result["reconciliation"]["coverage_pct"]
        iteration_log.append({
            "iteration": i,
            "status": "pass" if eval_result["passed"] else "fail",
            "coverage_pct": coverage,
            "gaps_found": len(gaps),
            "hint_nodes": len(hint_nodes),
        })

        _log_stage(
            "6_static_evolution", f"iteration_{i}",
            f"gaps={len(gaps)}, coverage={coverage}%",
        )

        if eval_result["passed"]:
            logger.info("Static evolution converged at iteration %d", i)
            break

        # If coverage didn't improve from previous iteration, stop
        if len(iteration_log) >= 2:
            prev_coverage = iteration_log[-2]["coverage_pct"]
            if coverage <= prev_coverage:
                logger.info(
                    "Static evolution stalled at %.1f%% — stopping", coverage
                )
                break

    return current_static, iteration_log


def _identify_static_gaps(static_graph: dict, llm_graph: dict) -> list[dict]:
    """Compare two graphs. Return things the LLM found that static missed.

    Returns:
        List of dicts with ``node_id``, ``reason``, and optionally ``edges``.
    """
    static_node_ids = {n["id"] for n in static_graph.get("nodes", [])}
    static_edge_keys = {
        (e["source"], e["target"], e["type"])
        for e in static_graph.get("edges", [])
    }

    gaps: list[dict] = []

    # Nodes in LLM but not in static
    for node in llm_graph.get("nodes", []):
        nid = node["id"]
        if nid not in static_node_ids:
            # Find edges involving this node
            related_edges = [
                e for e in llm_graph.get("edges", [])
                if e["source"] == nid or e["target"] == nid
            ]
            gaps.append({
                "node_id": nid,
                "reason": "node_missing",
                "node_type": node.get("type", "unknown"),
                "edges": related_edges,
            })

    # Edges in LLM but not in static (for nodes that DO exist in static)
    for edge in llm_graph.get("edges", []):
        key = (edge["source"], edge["target"], edge["type"])
        if key not in static_edge_keys:
            src_exists = edge["source"] in static_node_ids
            tgt_exists = edge["target"] in static_node_ids
            if src_exists and tgt_exists:
                gaps.append({
                    "node_id": edge["source"],
                    "reason": "edge_missing",
                    "edge": edge,
                })

    return gaps


def _run_llm_only(
    repo_url: str,
    sources: list[dict],
    repo_file_manifest: dict,
    _log_stage,
    stage_log: list[dict],
    started_at: datetime,
    provider_config=None,
) -> dict:
    """Legacy LLM-only mode: runs LLM analysis without static-first flow."""
    _log_stage("2_llm", "started")
    provider = get_provider(provider_config or Config)
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(repo_url, "github", None, sources)
    llm_graph = provider.analyze(system_prompt, user_prompt)
    _log_stage("2_llm", "done", f"{len(llm_graph.get('nodes', []))} nodes")

    # Evaluate
    eval_result = _evaluate_graph(llm_graph, sources, repo_file_manifest)

    finished_at = datetime.now(timezone.utc)

    dfs_report = _generate_report(
        repo_url=repo_url,
        graph=llm_graph,
        merge_report=None,
        validation_result=eval_result["validation"],
        completeness_result=eval_result["completeness"],
        reconciliation=eval_result["reconciliation"],
        recovery_result=eval_result["completeness"].get("recovery"),
        entry_points=eval_result["entry_points"],
        dfs_result=eval_result["dfs_result"],
        removed_edges=eval_result["removed_edges"],
    )

    analysis_id = save_analysis(llm_graph, repo_url, "github")
    _log_stage("7_report", "done", f"analysis_id={analysis_id}")

    pipeline_metadata = {
        "mode": "llm",
        "started_at": started_at.isoformat(),
        "finished_at": finished_at.isoformat(),
        "duration_seconds": round((finished_at - started_at).total_seconds(), 2),
        "stages": stage_log,
    }

    return {
        "validated_graph": llm_graph,
        "dfs_report": dfs_report,
        "analysis_id": analysis_id,
        "pipeline_metadata": pipeline_metadata,
    }


def _generate_report(
    repo_url: str,
    graph: dict,
    merge_report: dict | None,
    validation_result: dict,
    completeness_result: dict,
    reconciliation: dict,
    recovery_result: dict | None,
    entry_points: list[str],
    dfs_result: dict,
    removed_edges: list[dict],
    llm_correction_log: list[dict] | None = None,
    static_evolution_log: list[dict] | None = None,
) -> dict:
    """Assemble the structured DFS validation report."""
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    total_nodes = len(nodes)
    final_check = completeness_result.get(
        "final_check", completeness_result.get("initial_check", {})
    )

    report = {
        "repo_url": repo_url,
        "summary": {
            "total_nodes": total_nodes,
            "total_edges": len(edges),
            "entry_points": len(entry_points),
            "nodes_reachable_primary": len(
                [n for n in nodes if n.get("traversal") == "primary"]
            ),
            "nodes_disconnected": len(
                [n for n in nodes if n.get("traversal") == "disconnected"]
            ),
            "completeness_check": "PASS" if final_check.get("complete", False) else "FAIL",
            "total_nodes_visited": final_check.get("visited_nodes", 0),
            "total_graph_nodes": final_check.get("total_nodes", 0),
            "edge_validation_score": validation_result.get("score", 0),
            "file_coverage_pct": reconciliation.get("coverage_pct", 0),
        },
        "entry_points": entry_points,
        "merge_report": merge_report,
        "validation": {
            "edge_validation": validation_result.get("edge_validation"),
            "consistency": validation_result.get("consistency"),
            "score": validation_result.get("score"),
            "pruned_edges": len(removed_edges),
        },
        "dfs": {
            "reachable_count": len(dfs_result.get("all_reachable", set())),
            "file_count": len(dfs_result.get("dfs_file_list", [])),
        },
        "completeness": completeness_result,
        "recovery": recovery_result,
        "file_reconciliation": reconciliation,
    }

    if llm_correction_log:
        report["llm_correction_log"] = llm_correction_log
    if static_evolution_log:
        report["static_evolution_log"] = static_evolution_log

    return report
