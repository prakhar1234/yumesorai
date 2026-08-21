"""CLI summary output for analysis results."""
from __future__ import annotations

from collections import Counter

from ..graph.schema import GraphData


def print_summary(graph: GraphData, agent_summary: str) -> None:
    """Print a human-readable summary to stdout."""
    node_types = Counter(n.type for n in graph.nodes)
    edge_types = Counter(e.type for e in graph.edges)

    print("\n=== COBOL Knowledge Graph Analysis ===\n")

    if graph.metadata.repo:
        print(f"Repository: {graph.metadata.repo}")
    print(f"Model:      {graph.metadata.model}")
    print(f"Iterations: {graph.metadata.agent_iterations}")
    print()

    print(f"Nodes: {len(graph.nodes)}")
    for ntype, count in sorted(node_types.items()):
        print(f"  {ntype:12s} {count}")
    print()

    print(f"Edges: {len(graph.edges)}")
    for etype, count in sorted(edge_types.items()):
        print(f"  {etype:16s} {count}")
    print()

    print(f"Domains: {len(graph.domains)}")
    for d in graph.domains:
        nodes_in = sum(1 for n in graph.nodes if n.domain == d.id)
        print(f"  {d.id} ({d.name}): {nodes_in} nodes")
    print()

    # ── Traversal results ─────────────────────────────────────────
    t = graph.traversal
    if t is not None:
        print("--- Graph Traversal ---\n")

        print(f"Connected components: {len(t.connected_components)}")
        for i, comp in enumerate(t.connected_components):
            if len(comp) <= 8:
                print(f"  [{i}] {', '.join(comp)}")
            else:
                print(f"  [{i}] {', '.join(comp[:6])}, ... ({len(comp)} nodes)")
        print()

        print(f"Max topological depth: {t.max_depth}")
        print()

        if t.entry_points:
            print(f"Entry points: {len(t.entry_points)}")
            for ep in t.entry_points:
                node = next((n for n in graph.nodes if n.id == ep), None)
                depth_str = f" depth={node.depth}" if node and node.depth is not None else ""
                print(f"  - {ep}{depth_str}")
            print()

        if t.sinks:
            print(f"Sinks (leaf nodes): {len(t.sinks)}")
            for s in t.sinks:
                print(f"  - {s}")
            print()

        if t.cycles:
            print(f"Cycles detected: {len(t.cycles)}")
            for cycle in t.cycles:
                print(f"  - {' -> '.join(cycle)}")
            print()

        if t.execution_chains:
            print(f"Execution chains: {len(t.execution_chains)}")
            for chain in t.execution_chains[:10]:
                print(f"  {' -> '.join(chain)}")
            if len(t.execution_chains) > 10:
                print(f"  ... and {len(t.execution_chains) - 10} more")
            print()

        if t.dangling_repaired:
            print(f"Dangling edges repaired: {len(t.dangling_repaired)} stubs created")
            for stub_id in t.dangling_repaired:
                print(f"  - {stub_id}")
            print()

        if t.jcl_edges_inferred > 0:
            print(f"JCL-inferred data edges: {t.jcl_edges_inferred}")
            print()

    # ── Risk and dead code ────────────────────────────────────────
    dead_nodes = [n for n in graph.nodes if n.dead]
    if dead_nodes:
        print(f"Dead code: {len(dead_nodes)} nodes")
        for n in dead_nodes:
            print(f"  - {n.id} ({n.type})")
        print()

    high_risk = [n for n in graph.nodes if n.risk >= 0.5]
    if high_risk:
        print(f"High-risk nodes (risk >= 0.5): {len(high_risk)}")
        for n in sorted(high_risk, key=lambda x: x.risk, reverse=True):
            print(f"  - {n.id}: {n.risk:.2f}")
        print()

    if agent_summary:
        print(f"Agent summary: {agent_summary}")
        print()
