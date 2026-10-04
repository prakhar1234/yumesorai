"""Edge validation and graph consistency checks for Demystifier knowledge graphs.

Provides reverse-lookup validation (verifying edges trace to real source syntax)
and structural consistency checks (dangling edges, type mismatches, etc.).
"""
from __future__ import annotations

import re
import logging

logger = logging.getLogger(__name__)

# Expected edge-type -> target node type mapping
EDGE_TARGET_TYPES = {
    "call": "program",
    "copy": "copybook",
    "data": "table",
    "job": "program",
    "screen": "screen",
}

# Patterns to verify an edge exists in the source node's content.
# Each maps edge type -> list of regex pattern templates (with {target} placeholder).
_VERIFY_PATTERNS: dict[str, list[str]] = {
    "call": [
        r"\bCALL\s+['\"]{{target}}['\"]",
        r"EXEC\s+CICS\s+(?:LINK|XCTL)\s+PROGRAM\s*\(\s*['\"]?{{target}}['\"]?\s*\)",
    ],
    "copy": [
        r"\bCOPY\s+['\"]?{{target}}['\"]?",
    ],
    "data": [
        r"\b(?:FROM|INTO|UPDATE|JOIN)\s+{{target}}\b",
        r"\bSELECT\s+{{target}}\s+ASSIGN\b",
        r"\bDD\s+(?:DSN|DSNAME)=\S*{{target}}",
    ],
    "job": [
        r"EXEC\s+(?:PGM=|PROC=){{target}}\b",
    ],
    "screen": [
        r"(?:SEND|RECEIVE)\s+MAP\s*\(\s*['\"]?{{target}}['\"]?\s*\)",
        r"{{target}}\s+DFHM(?:SD|DI)\b",
    ],
}


def validate_edges(graph_data: dict, source_map: dict[str, str]) -> dict:
    """Validate each edge by checking for expected syntax in source content.

    Args:
        graph_data: The graph result with ``nodes`` and ``edges``.
        source_map: Mapping of node ID -> cleaned source content.

    Returns:
        Dict with counts and lists of invalid/unverifiable edges.
    """
    edges = graph_data.get("edges", [])
    valid = 0
    invalid = 0
    unverifiable = 0
    invalid_edges: list[dict] = []

    for edge in edges:
        src_id = edge["source"]
        tgt_id = edge["target"]
        etype = edge["type"]

        source_content = source_map.get(src_id)
        if not source_content:
            unverifiable += 1
            continue

        # Build the target label to search for
        nodes_by_id = {n["id"]: n for n in graph_data.get("nodes", [])}
        target_node = nodes_by_id.get(tgt_id)
        target_label = target_node["label"] if target_node else tgt_id
        # Strip any directory prefix from disambiguated IDs
        if "/" in target_label:
            target_label = target_label.split("/")[-1]

        patterns = _VERIFY_PATTERNS.get(etype, [])
        if not patterns:
            unverifiable += 1
            continue

        found = False
        for pat_template in patterns:
            pat = pat_template.replace("{{target}}", re.escape(target_label))
            if re.search(pat, source_content, re.IGNORECASE):
                found = True
                break

        if found:
            valid += 1
        else:
            invalid += 1
            invalid_edges.append({
                "source": src_id,
                "target": tgt_id,
                "type": etype,
                "reason": f"No matching '{etype}' syntax for '{target_label}' in source of '{src_id}'",
            })

    return {
        "total": len(edges),
        "valid": valid,
        "invalid": invalid,
        "unverifiable": unverifiable,
        "invalid_edges": invalid_edges,
    }


def check_consistency(graph_data: dict) -> dict:
    """Check graph for structural consistency issues.

    Args:
        graph_data: The graph result with ``nodes`` and ``edges``.

    Returns:
        Dict with lists of dangling edges, type mismatches, self-loops, orphan nodes.
    """
    nodes = {n["id"]: n for n in graph_data.get("nodes", [])}
    edges = graph_data.get("edges", [])

    dangling_edges: list[dict] = []
    type_mismatches: list[dict] = []
    self_loops: list[dict] = []
    orphan_nodes: list[str] = []

    connected_nodes: set[str] = set()

    for edge in edges:
        src_id = edge["source"]
        tgt_id = edge["target"]
        etype = edge["type"]

        # Self-loop check
        if src_id == tgt_id:
            self_loops.append({"node": src_id, "type": etype})

        # Dangling edge check
        src_exists = src_id in nodes
        tgt_exists = tgt_id in nodes
        if not src_exists or not tgt_exists:
            dangling_edges.append({
                "source": src_id,
                "target": tgt_id,
                "type": etype,
                "missing": "source" if not src_exists else "target",
            })
            # Still track connected nodes for what exists
            if src_exists:
                connected_nodes.add(src_id)
            if tgt_exists:
                connected_nodes.add(tgt_id)
            continue

        connected_nodes.add(src_id)
        connected_nodes.add(tgt_id)

        # Type mismatch check
        expected_type = EDGE_TARGET_TYPES.get(etype)
        if expected_type and nodes[tgt_id]["type"] != expected_type:
            type_mismatches.append({
                "source": src_id,
                "target": tgt_id,
                "edge_type": etype,
                "expected_target_type": expected_type,
                "actual_target_type": nodes[tgt_id]["type"],
            })

    # Orphan nodes — zero connections
    for nid in nodes:
        if nid not in connected_nodes:
            orphan_nodes.append(nid)

    return {
        "dangling_edges": dangling_edges,
        "type_mismatches": type_mismatches,
        "self_loops": self_loops,
        "orphan_nodes": orphan_nodes,
    }


def prune_invalid_edges(graph: dict, validation_result: dict) -> tuple[dict, list]:
    """Remove invalid edges and resulting orphan nodes from the graph.

    Uses the ``invalid_edges`` list from ``validate_edges()`` output.
    LLM-only edges that failed validation are removed first. Then any
    nodes left with zero edges and no source (loc == 0) are pruned.

    Args:
        graph: Graph dict with ``nodes`` and ``edges``.
        validation_result: Output of ``validate_graph()``.

    Returns:
        Tuple of (pruned_graph, removed_edges).
    """
    invalid_set = set()
    for ie in validation_result.get("edge_validation", {}).get("invalid_edges", []):
        invalid_set.add((ie["source"], ie["target"], ie["type"]))

    kept_edges = []
    removed_edges = []
    for edge in graph.get("edges", []):
        key = (edge["source"], edge["target"], edge["type"])
        # Only remove edges that are both invalid and LLM-only
        if key in invalid_set and edge.get("llm_only", False):
            removed_edges.append(edge)
        else:
            kept_edges.append(edge)

    graph["edges"] = kept_edges

    # Remove orphan nodes: no remaining edges and no source file
    connected: set[str] = set()
    for edge in kept_edges:
        connected.add(edge["source"])
        connected.add(edge["target"])

    pruned_nodes = []
    for node in graph.get("nodes", []):
        nid = node["id"]
        if nid in connected or node.get("loc", 0) > 0:
            pruned_nodes.append(node)
        # else: orphan stub node with no edges — drop it

    graph["nodes"] = pruned_nodes

    if removed_edges:
        logger.info(
            "Pruned %d invalid LLM-only edges and %d orphan nodes",
            len(removed_edges),
            len(graph.get("nodes", [])) - len(pruned_nodes) if False else 0,
        )

    return graph, removed_edges


def validate_graph(graph_data: dict, source_map: dict[str, str] | None = None) -> dict:
    """Run full validation: edge verification + consistency checks.

    Args:
        graph_data: The graph result with ``nodes`` and ``edges``.
        source_map: Optional mapping of node ID -> cleaned source content.

    Returns:
        Combined validation report with edge_validation, consistency, and score.
    """
    if source_map is None:
        source_map = graph_data.get("_source_map", {})

    edge_result = validate_edges(graph_data, source_map)
    consistency_result = check_consistency(graph_data)

    # Compute overall confidence score (0-100)
    total_edges = edge_result["total"]
    if total_edges > 0:
        edge_score = (edge_result["valid"] / total_edges) * 100
    else:
        edge_score = 100.0

    # Penalise for consistency issues
    issue_count = (
        len(consistency_result["dangling_edges"])
        + len(consistency_result["type_mismatches"])
    )
    consistency_penalty = min(issue_count * 5, 30)  # up to 30 points off
    score = max(0, round(edge_score - consistency_penalty))

    return {
        "edge_validation": edge_result,
        "consistency": consistency_result,
        "score": score,
    }
