"""Stages 5, 5b, 6 — DFS traversal, completeness check, and file reconciliation.

Provides iterative depth-first search over a COBOL knowledge graph, completeness
verification (deterministic gate), missed-node recovery, and file reconciliation
against a repository manifest.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from pathlib import PurePosixPath

logger = logging.getLogger(__name__)


def build_adjacency_lists(edges: list[dict]) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """Build forward and reverse adjacency lists from edge dicts.

    Args:
        edges: List of edge dicts with ``source`` and ``target`` keys.

    Returns:
        Tuple of (adj_out, adj_in) where each maps node ID -> list of neighbor IDs.
    """
    adj_out: dict[str, list[str]] = defaultdict(list)
    adj_in: dict[str, list[str]] = defaultdict(list)

    for edge in edges:
        src = edge["source"]
        tgt = edge["target"]
        adj_out[src].append(tgt)
        adj_in[tgt].append(src)

    return dict(adj_out), dict(adj_in)


def identify_entry_points(graph: dict) -> list[str]:
    """Identify entry points: JCL jobs and programs with fanIn == 0.

    Args:
        graph: Graph dict with ``nodes`` list.

    Returns:
        List of node IDs that are entry points.
    """
    entry_points = []
    for node in graph.get("nodes", []):
        nid = node["id"]
        ntype = node.get("type", "")
        fan_in = node.get("fanIn", 0)

        if ntype == "job":
            entry_points.append(nid)
        elif ntype == "program" and fan_in == 0:
            entry_points.append(nid)

    if not entry_points:
        # Fallback: use all nodes as entry points if none identified
        entry_points = [n["id"] for n in graph.get("nodes", [])]
        logger.warning("No natural entry points found, using all %d nodes", len(entry_points))

    logger.info("Identified %d entry points", len(entry_points))
    return entry_points


def dfs_from_entry_points(
    entry_points: list[str],
    adj_out: dict[str, list[str]],
    adj_in: dict[str, list[str]],
    graph: dict,
) -> dict:
    """Iterative DFS from entry points, traversing forward edges.

    Uses an explicit stack to avoid Python recursion limits.

    Args:
        entry_points: Starting node IDs.
        adj_out: Forward adjacency list.
        adj_in: Reverse adjacency list.
        graph: Graph dict (used for node metadata).

    Returns:
        Dict with ``all_reachable`` (set), ``dfs_file_list`` (list of node IDs
        that correspond to source files), and ``traversal_tree`` (parent mapping).
    """
    nodes_by_id = {n["id"]: n for n in graph.get("nodes", [])}
    all_reachable: set[str] = set()
    traversal_tree: dict[str, str | None] = {}  # child -> parent

    for ep in entry_points:
        if ep not in nodes_by_id:
            continue
        if ep in all_reachable:
            continue

        stack = [ep]
        traversal_tree[ep] = None  # root

        while stack:
            current = stack.pop()
            if current in all_reachable:
                continue
            all_reachable.add(current)

            for neighbor in adj_out.get(current, []):
                if neighbor not in all_reachable and neighbor in nodes_by_id:
                    stack.append(neighbor)
                    if neighbor not in traversal_tree:
                        traversal_tree[neighbor] = current

    # Build file list: reachable nodes that have source (loc > 0)
    dfs_file_list = []
    for nid in sorted(all_reachable):
        node = nodes_by_id.get(nid)
        if node and node.get("loc", 0) > 0:
            dfs_file_list.append(nid)

    logger.info(
        "DFS traversal: %d nodes reachable, %d source files",
        len(all_reachable), len(dfs_file_list),
    )

    return {
        "all_reachable": all_reachable,
        "dfs_file_list": dfs_file_list,
        "traversal_tree": traversal_tree,
    }


def check_completeness(graph: dict, all_reachable: set[str]) -> dict:
    """Deterministic completeness gate — pure set arithmetic.

    Args:
        graph: Graph dict with ``nodes`` list.
        all_reachable: Set of node IDs visited by DFS.

    Returns:
        Dict with ``complete`` (bool), ``total_nodes``, ``visited_nodes``,
        ``missed_nodes`` (list), ``extra_nodes`` (list), ``coverage_ratio`` (float).
    """
    all_node_ids = {n["id"] for n in graph.get("nodes", [])}
    visited = all_reachable & all_node_ids
    missed = all_node_ids - all_reachable
    extra = all_reachable - all_node_ids  # shouldn't happen, but check

    total = len(all_node_ids)
    coverage = len(visited) / total if total > 0 else 1.0

    result = {
        "complete": len(missed) == 0,
        "total_nodes": total,
        "visited_nodes": len(visited),
        "missed_nodes": sorted(missed),
        "extra_nodes": sorted(extra),
        "coverage_ratio": round(coverage, 4),
    }

    if result["complete"]:
        logger.info("Completeness check: PASS (%d/%d nodes)", len(visited), total)
    else:
        logger.warning(
            "Completeness check: FAIL — %d/%d missed: %s",
            len(missed), total, ", ".join(sorted(missed)[:10]),
        )

    return result


def recover_missed_nodes(
    missed_nodes: list[str],
    adj_out: dict[str, list[str]],
    adj_in: dict[str, list[str]],
    all_reachable: set[str],
    nodes_by_id: dict[str, dict],
) -> dict:
    """Recovery loop for missed nodes — DFS in both directions.

    For each missed node, runs bidirectional DFS to discover its connected
    component. Guaranteed to terminate in at most N iterations (one per missed node).

    Args:
        missed_nodes: List of node IDs not reached by initial DFS.
        adj_out: Forward adjacency list.
        adj_in: Reverse adjacency list.
        all_reachable: Set to update in place with newly discovered nodes.
        nodes_by_id: Node lookup dict.

    Returns:
        Dict with ``iterations`` (int), ``components`` (list of sets),
        ``all_visited`` (set of all nodes found during recovery).
    """
    remaining = set(missed_nodes)
    components: list[list[str]] = []
    all_visited: set[str] = set()
    iterations = 0

    while remaining:
        iterations += 1
        seed = remaining.pop()

        # Bidirectional DFS from seed
        component: set[str] = set()
        stack = [seed]

        while stack:
            current = stack.pop()
            if current in component:
                continue
            if current not in nodes_by_id:
                continue
            component.add(current)

            # Forward neighbors
            for neighbor in adj_out.get(current, []):
                if neighbor not in component and neighbor in nodes_by_id:
                    stack.append(neighbor)

            # Reverse neighbors
            for neighbor in adj_in.get(current, []):
                if neighbor not in component and neighbor in nodes_by_id:
                    stack.append(neighbor)

        all_reachable.update(component)
        all_visited.update(component)
        remaining -= component
        components.append(sorted(component))

    logger.info(
        "Recovery: %d iterations, %d components, %d nodes recovered",
        iterations, len(components), len(all_visited),
    )

    return {
        "iterations": iterations,
        "components": components,
        "all_visited": sorted(all_visited),
    }


def run_completeness_check_with_recovery(
    graph: dict,
    all_reachable: set[str],
    adj_out: dict[str, list[str]],
    adj_in: dict[str, list[str]],
) -> dict:
    """Run completeness check, then recover missed nodes if needed.

    Post-recovery, asserts completeness — raises AssertionError if any nodes
    remain unreachable (should not happen with bidirectional recovery).

    Args:
        graph: Graph dict with ``nodes`` list.
        all_reachable: Set of node IDs from initial DFS (mutated in place).
        adj_out: Forward adjacency list.
        adj_in: Reverse adjacency list.

    Returns:
        Dict with ``initial_check``, ``recovery`` (if needed), ``final_check``,
        and ``status`` ("PASS").
    """
    nodes_by_id = {n["id"]: n for n in graph.get("nodes", [])}
    initial = check_completeness(graph, all_reachable)

    result: dict = {
        "initial_check": initial,
        "recovery": None,
        "final_check": None,
        "status": "PASS" if initial["complete"] else "RECOVERING",
    }

    if initial["complete"]:
        result["final_check"] = initial
        return result

    # Recovery phase
    recovery = recover_missed_nodes(
        initial["missed_nodes"], adj_out, adj_in, all_reachable, nodes_by_id
    )
    result["recovery"] = recovery

    # Re-check
    final = check_completeness(graph, all_reachable)
    result["final_check"] = final

    assert final["complete"], (
        f"Completeness invariant violated after recovery: "
        f"{final['visited_nodes']}/{final['total_nodes']} nodes visited, "
        f"missed: {final['missed_nodes']}"
    )

    result["status"] = "PASS"
    return result


def reconcile_files(
    dfs_file_list: list[str],
    repo_file_manifest: dict,
    graph: dict,
    sources: list[dict],
) -> dict:
    """Diff DFS-discovered files against the repository file manifest.

    Normalizes file names by uppercasing stems and stripping extensions
    for comparison.

    Args:
        dfs_file_list: Node IDs of source files found by DFS.
        repo_file_manifest: Output of ``list_repo_files()`` with ``files`` list.
        graph: Graph dict with ``nodes``.
        sources: List of source dicts from ``fetch_repo_sources()``.

    Returns:
        Dict with ``matched``, ``graph_only``, ``repo_only``, ``disconnected``,
        ``coverage_pct``, and counts.
    """
    nodes_by_id = {n["id"]: n for n in graph.get("nodes", [])}

    # Normalize graph node IDs to uppercase stems
    graph_stems: dict[str, str] = {}  # normalized_name -> node_id
    for nid in dfs_file_list:
        node = nodes_by_id.get(nid)
        if node:
            label = node.get("label", nid)
            # Strip directory prefix if present (e.g. "SRC/ACCT0010" -> "ACCT0010")
            if "/" in label:
                label = label.split("/")[-1]
            stem = label.upper().split(".")[0]
            graph_stems[stem] = nid

    # Also add all graph nodes with source (not just DFS-traversed ones)
    all_graph_stems: dict[str, str] = {}
    for node in graph.get("nodes", []):
        if node.get("loc", 0) > 0:
            label = node.get("label", node["id"])
            if "/" in label:
                label = label.split("/")[-1]
            stem = label.upper().split(".")[0]
            all_graph_stems[stem] = node["id"]

    # Reverse map: source file stem -> node ID
    # Handles cases where PROGRAM-ID differs from the filename
    # (e.g. file "db2-handling.cbl" has PROGRAM-ID DB2HNDL)
    file_stem_map: dict[str, str] = graph.get("_file_stem_map", {})

    # Normalize repo file manifest
    repo_files = repo_file_manifest.get("files", [])
    repo_stems: dict[str, str] = {}  # normalized_name -> path
    for f in repo_files:
        stem = f["name"].upper()
        repo_stems[stem] = f["path"]

    # Compute sets — also count repo files matched via source path mapping
    graph_set = set(graph_stems.keys())
    repo_set = set(repo_stems.keys())

    matched = graph_set & repo_set

    # Additional matches via file stem -> node mapping
    # Catches files where PROGRAM-ID differs from the filename
    for repo_stem in repo_set - matched:
        if repo_stem in file_stem_map:
            matched.add(repo_stem)
            graph_stems[repo_stem] = file_stem_map[repo_stem]

    graph_only = graph_set - repo_set
    repo_only = repo_set - matched

    # Disconnected: in repo and in graph (all_graph_stems) but not in DFS file list
    disconnected_stems = set()
    for stem in repo_set:
        if stem in all_graph_stems and stem not in graph_set:
            disconnected_stems.add(stem)

    total_repo = len(repo_set)
    coverage_pct = round(len(matched) / total_repo * 100, 2) if total_repo > 0 else 100.0

    result = {
        "matched": sorted(matched),
        "matched_count": len(matched),
        "graph_only": sorted(graph_only),
        "graph_only_count": len(graph_only),
        "repo_only": sorted(repo_only),
        "repo_only_count": len(repo_only),
        "disconnected": sorted(disconnected_stems),
        "disconnected_count": len(disconnected_stems),
        "total_graph_files": len(graph_set),
        "total_repo_files": total_repo,
        "coverage_pct": coverage_pct,
    }

    logger.info(
        "File reconciliation: %d matched, %d graph-only, %d repo-only, %d disconnected (%.1f%% coverage)",
        len(matched), len(graph_only), len(repo_only), len(disconnected_stems), coverage_pct,
    )

    return result
