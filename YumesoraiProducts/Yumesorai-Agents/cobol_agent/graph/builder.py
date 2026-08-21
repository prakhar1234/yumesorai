"""Stateful graph accumulator — tools add nodes/edges here."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from .schema import (
    Domain,
    GraphData,
    GraphEdge,
    GraphMetadata,
    GraphNode,
)

logger = logging.getLogger(__name__)

DOMAIN_META: dict[str, tuple[str, str]] = {
    "ACT": ("Accounts", "#4ade80"),
    "PAY": ("Payments", "#60a5fa"),
    "CUS": ("Customer", "#f472b6"),
    "BIL": ("Billing", "#fbbf24"),
    "RPT": ("Reporting", "#a78bfa"),
    "BAT": ("Batch/Infra", "#22d3ee"),
    "ONL": ("Online/CICS", "#f97316"),
    "GEN": ("General", "#94a3b8"),
}


class GraphBuilder:
    """Accumulates nodes and edges during agentic analysis."""

    def __init__(self) -> None:
        self.nodes: dict[str, GraphNode] = {}
        self.edges: list[GraphEdge] = []
        self._edge_set: set[tuple[str, str, str]] = set()
        self._domains_seen: set[str] = set()

    def add_node(self, node: GraphNode) -> str:
        """Add or update a node. Returns the node id."""
        if node.id in self.nodes:
            existing = self.nodes[node.id]
            # Merge: prefer non-default values from the new node
            if node.loc > 0:
                existing.loc = node.loc
            if node.domain != "GEN":
                existing.domain = node.domain
                existing.color = node.color
            if node.file_type is not None:
                existing.file_type = node.file_type
            if node.dsn is not None:
                existing.dsn = node.dsn
            if node.record_format is not None:
                existing.record_format = node.record_format
            if node.record_length is not None:
                existing.record_length = node.record_length
            if node.program_type is not None:
                existing.program_type = node.program_type
            if node.steps is not None:
                existing.steps = node.steps
        else:
            self.nodes[node.id] = node
            self._domains_seen.add(node.domain)
        return node.id

    def add_edge(self, edge: GraphEdge) -> bool:
        """Add an edge if it doesn't already exist. Returns True if added."""
        key = (edge.source, edge.target, edge.type)
        if key in self._edge_set:
            return False
        self._edge_set.add(key)
        self.edges.append(edge)
        return True

    def build(self, repo: str = "", model: str = "", iterations: int = 0) -> GraphData:
        """Assemble the final GraphData."""
        # Build domain list
        domains = []
        for did in sorted(self._domains_seen):
            name, color = DOMAIN_META.get(did, (did, "#94a3b8"))
            domains.append(Domain(id=did, name=name, color=color))

        node_list = list(self.nodes.values())

        metadata = GraphMetadata(
            repo=repo,
            nodeCount=len(node_list),
            edgeCount=len(self.edges),
            analyzedAt=datetime.now(timezone.utc).isoformat(),
            agent_iterations=iterations,
            model=model,
        )

        return GraphData(
            nodes=node_list,
            edges=list(self.edges),
            domains=domains,
            metadata=metadata,
        )
