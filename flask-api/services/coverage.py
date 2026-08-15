"""Service for computing file coverage between a graph and a GitHub repository."""
from __future__ import annotations


def compute_coverage(graph_data: dict, repo_files: dict) -> dict:
    """Compare graph nodes against repository files to compute coverage.

    Args:
        graph_data: The analysis result containing nodes and edges.
        repo_files: Output from list_repo_files().

    Returns:
        Coverage report with overall stats, missing files, extra nodes,
        and per-type breakdown.
    """
    nodes = graph_data.get("nodes", [])
    files = repo_files.get("files", [])

    # Build a set of normalized node identifiers (uppercase label and id)
    node_set: set[str] = set()
    node_by_name: dict[str, dict] = {}
    for node in nodes:
        label_upper = node.get("label", "").upper().strip()
        id_upper = node.get("id", "").upper().strip()
        node_set.add(label_upper)
        node_set.add(id_upper)
        node_by_name[label_upper] = node
        node_by_name[id_upper] = node

    # Build a set of normalized file names
    file_names: set[str] = set()
    for f in files:
        file_names.add(f["name"].upper().strip())

    # Check coverage
    covered_files = []
    missing_files = []
    for f in files:
        name = f["name"].upper().strip()
        if name in node_set:
            covered_files.append(f)
        else:
            missing_files.append({
                "path": f["path"],
                "name": f["name"],
                "expected_type": f["type"],
            })

    # Find extra nodes (in graph but not in repo files)
    extra_nodes = []
    for node in nodes:
        label_upper = node.get("label", "").upper().strip()
        id_upper = node.get("id", "").upper().strip()
        if label_upper not in file_names and id_upper not in file_names:
            extra_nodes.append({
                "id": node.get("id", ""),
                "type": node.get("type", ""),
            })

    total = len(files)
    covered = len(covered_files)
    coverage_pct = round((covered / total * 100), 1) if total > 0 else 100.0

    # Per-type breakdown
    by_type: dict[str, dict] = {}
    for f in files:
        t = f["type"]
        if t not in by_type:
            by_type[t] = {"total": 0, "covered": 0}
        by_type[t]["total"] += 1

    for f in covered_files:
        t = f["type"]
        by_type[t]["covered"] += 1

    for t in by_type:
        bt = by_type[t]
        bt["pct"] = round((bt["covered"] / bt["total"] * 100), 1) if bt["total"] > 0 else 100.0

    return {
        "total_files": total,
        "covered_files": covered,
        "coverage_pct": coverage_pct,
        "missing_files": missing_files,
        "extra_nodes": extra_nodes,
        "by_type": by_type,
    }
