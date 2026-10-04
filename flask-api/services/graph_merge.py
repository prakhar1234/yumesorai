"""Stage 3b — Merge LLM and static knowledge graphs.

Combines two independently-built COBOL dependency graphs (one from LLM analysis,
one from static regex parsing) into a single unified graph with provenance flags.
"""
from __future__ import annotations

import logging

from services.cobol_graph_builder import _guess_domain, DOMAIN_META

logger = logging.getLogger(__name__)


def merge_graphs(llm_graph: dict, static_graph: dict) -> tuple[dict, dict]:
    """Merge LLM-produced and static-produced graphs into one.

    Nodes present in both graphs keep static metrics (more reliable).
    LLM-only nodes are flagged with ``llm_only: True``.
    Static-only nodes are added as-is.

    Edges are merged by ``(source, target, type)`` key with the same flagging.

    Args:
        llm_graph: Graph dict with ``nodes`` and ``edges`` from LLM analysis.
        static_graph: Graph dict with ``nodes`` and ``edges`` from static analysis.

    Returns:
        Tuple of (merged_graph, merge_report).
    """
    # Index static nodes by id
    static_nodes: dict[str, dict] = {n["id"]: n for n in static_graph.get("nodes", [])}
    llm_nodes: dict[str, dict] = {n["id"]: n for n in llm_graph.get("nodes", [])}

    merged_nodes: dict[str, dict] = {}
    llm_only_nodes: list[str] = []
    static_only_nodes: list[str] = []
    both_nodes: list[str] = []

    # Start with all static nodes
    for nid, node in static_nodes.items():
        merged_nodes[nid] = {**node, "llm_only": False}
        if nid in llm_nodes:
            both_nodes.append(nid)
        else:
            static_only_nodes.append(nid)

    # Add LLM-only nodes
    for nid, node in llm_nodes.items():
        if nid not in merged_nodes:
            merged_nodes[nid] = {**node, "llm_only": True}
            llm_only_nodes.append(nid)

    # Merge edges by (source, target, type)
    static_edges = static_graph.get("edges", [])
    llm_edges = llm_graph.get("edges", [])

    static_edge_set: set[tuple[str, str, str]] = set()
    merged_edges: list[dict] = []
    llm_only_edges: list[dict] = []
    static_only_edges: list[dict] = []
    both_edges: list[dict] = []

    for edge in static_edges:
        key = (edge["source"], edge["target"], edge["type"])
        static_edge_set.add(key)
        merged_edges.append({**edge, "llm_only": False})

    llm_edge_keys_seen: set[tuple[str, str, str]] = set()
    for edge in llm_edges:
        key = (edge["source"], edge["target"], edge["type"])
        if key in llm_edge_keys_seen:
            continue
        llm_edge_keys_seen.add(key)
        if key in static_edge_set:
            both_edges.append(edge)
        else:
            merged_edges.append({**edge, "llm_only": True})
            llm_only_edges.append(edge)

    # Categorize static-only edges
    for edge in static_edges:
        key = (edge["source"], edge["target"], edge["type"])
        if key not in llm_edge_keys_seen:
            static_only_edges.append(edge)

    # Merge domains
    static_domains = {d["id"]: d for d in static_graph.get("domains", [])}
    llm_domains = {d["id"]: d for d in llm_graph.get("domains", [])}
    all_domain_ids = set(static_domains) | set(llm_domains)
    merged_domains = []
    for did in sorted(all_domain_ids):
        if did in static_domains:
            merged_domains.append(static_domains[did])
        else:
            merged_domains.append(llm_domains[did])

    # Merge source maps
    static_source_map = static_graph.get("_source_map", {})
    llm_source_map = llm_graph.get("_source_map", {})
    merged_source_map = {**llm_source_map, **static_source_map}  # static wins

    merged_graph = {
        "nodes": list(merged_nodes.values()),
        "edges": merged_edges,
        "domains": merged_domains,
        "metadata": {
            **(static_graph.get("metadata", {})),
            "merge_mode": "llm+static",
        },
        "_source_map": merged_source_map,
    }

    merge_report = {
        "total_nodes": len(merged_nodes),
        "llm_only_nodes": len(llm_only_nodes),
        "static_only_nodes": len(static_only_nodes),
        "both_nodes": len(both_nodes),
        "total_edges": len(merged_edges),
        "llm_only_edges": len(llm_only_edges),
        "static_only_edges": len(static_only_edges),
        "both_edges": len(both_edges),
        "llm_only_node_ids": llm_only_nodes,
    }

    logger.info(
        "Graph merge complete: %d nodes (%d both, %d LLM-only, %d static-only), "
        "%d edges (%d both, %d LLM-only, %d static-only)",
        merge_report["total_nodes"], merge_report["both_nodes"],
        merge_report["llm_only_nodes"], merge_report["static_only_nodes"],
        merge_report["total_edges"], merge_report["both_edges"],
        merge_report["llm_only_edges"], merge_report["static_only_edges"],
    )

    return merged_graph, merge_report


def recompute_graph_metrics(graph: dict) -> dict:
    """Recalculate fanIn, fanOut, dead, and risk for all nodes after merge.

    Uses the same risk formula as ``cobol_graph_builder.py`` lines ~326-341:
        risk = min(loc/1000, 0.4) + min((fanIn+fanOut)/20, 0.4) + (0.2 if dead else 0)

    Also re-classifies domains for nodes missing one.

    Args:
        graph: Merged graph dict with ``nodes`` and ``edges``.

    Returns:
        The same graph dict, mutated with updated metrics.
    """
    nodes_by_id = {n["id"]: n for n in graph.get("nodes", [])}

    # Reset fan counts
    for node in nodes_by_id.values():
        node["fanIn"] = 0
        node["fanOut"] = 0

    # Recompute fan-in / fan-out
    for edge in graph.get("edges", []):
        src_id = edge["source"]
        tgt_id = edge["target"]
        if src_id in nodes_by_id:
            nodes_by_id[src_id]["fanOut"] += 1
        if tgt_id in nodes_by_id:
            nodes_by_id[tgt_id]["fanIn"] += 1

    # Detect dead code: programs not called by anyone and with no source
    called_programs: set[str] = set()
    for e in graph.get("edges", []):
        if e["type"] in ("call", "job"):
            called_programs.add(e["target"])

    for node in nodes_by_id.values():
        if node["type"] == "program" and node.get("loc", 0) == 0:
            node["dead"] = node["id"] not in called_programs
        # Don't mark nodes with source as dead

    # Recompute risk
    for node in nodes_by_id.values():
        loc = node.get("loc", 0)
        fan_in = node["fanIn"]
        fan_out = node["fanOut"]
        loc_risk = min(loc / 1000, 0.4)
        dep_risk = min((fan_in + fan_out) / 20, 0.4)
        dead_risk = 0.2 if node.get("dead", False) else 0.0
        node["risk"] = round(min(loc_risk + dep_risk + dead_risk, 1.0), 2)

    # Re-classify domains for nodes with missing or default domain
    source_map = graph.get("_source_map", {})
    for node in nodes_by_id.values():
        if not node.get("domain") or node["domain"] == "GEN":
            source = source_map.get(node["id"], "")
            node["domain"] = _guess_domain(node.get("label", node["id"]), source)
            node["color"] = DOMAIN_META.get(node["domain"], ("", "#94a3b8"))[1]

    # Rebuild domains list
    domains_seen: set[str] = set()
    for node in nodes_by_id.values():
        domains_seen.add(node.get("domain", "GEN"))
    graph["domains"] = [
        {"id": did, "name": DOMAIN_META.get(did, (did, "#94a3b8"))[0],
         "color": DOMAIN_META.get(did, (did, "#94a3b8"))[1]}
        for did in sorted(domains_seen)
    ]

    return graph
