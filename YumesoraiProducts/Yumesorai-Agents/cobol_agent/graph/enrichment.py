"""Post-processing: deterministic graph traversal, metrics, and compat mapping.

After Claude's agentic analysis populates nodes and edges, this module runs
a fully deterministic Python traversal over the graph structure:

1. Repair dangling edges (auto-create stub nodes for missing endpoints)
2. Build adjacency lists (outgoing + incoming edges per node)
3. Find connected components (BFS on undirected view)
4. Detect cycles in call/transfer edges (DFS with back-edge detection)
5. Compute topological depth layers (BFS from entry points)
6. Cross-reference JCL job steps (infer read/write edges from DD params)
7. Trace execution chains (job -> program -> data file paths)
8. Compute fan-in/fan-out, dead code, risk scores
"""
from __future__ import annotations

import logging
from collections import defaultdict, deque
from typing import Optional

from ..sources.base import COBOL_EXTENSIONS, SourceFile
from .schema import GraphData, GraphEdge, GraphNode, TraversalReport

logger = logging.getLogger(__name__)

# Edge types that represent program-to-program control flow
_CALL_EDGE_TYPES = frozenset({"call", "cics_link", "cics_xctl"})

# Edge types that represent data access direction
_DATA_READ_TYPES = frozenset({"read"})
_DATA_WRITE_TYPES = frozenset({"write"})
_DATA_UPDATE_TYPES = frozenset({"update"})

# DISP values that indicate input vs output in JCL
_INPUT_DISPS = frozenset({"SHR", "OLD"})
_OUTPUT_DISPS = frozenset({"NEW", "MOD"})

# Mapping from extended edge types to the base 5 compat types
_COMPAT_MAP: dict[str, str] = {
    "read": "data",
    "write": "data",
    "update": "data",
    "delete": "data",
    "call": "call",
    "copy": "copy",
    "job_step": "job",
    "screen_send": "screen",
    "screen_receive": "screen",
    "cics_link": "call",
    "cics_xctl": "call",
}


class GraphTraverser:
    """Deterministic graph traversal for post-processing.

    Builds adjacency lists from edges and provides traversal algorithms
    that operate on the graph as a directed graph structure.
    """

    def __init__(self, graph: GraphData) -> None:
        self.graph = graph
        self.node_map: dict[str, GraphNode] = {n.id: n for n in graph.nodes}
        self.outgoing: dict[str, list[GraphEdge]] = defaultdict(list)
        self.incoming: dict[str, list[GraphEdge]] = defaultdict(list)
        self._edge_set: set[tuple[str, str, str]] = set()
        self._build_adjacency()

    def _build_adjacency(self) -> None:
        """Build outgoing and incoming adjacency lists from edges."""
        for edge in self.graph.edges:
            self.outgoing[edge.source].append(edge)
            self.incoming[edge.target].append(edge)
            self._edge_set.add((edge.source, edge.target, edge.type))

    def _has_edge(self, source: str, target: str, edge_type: str) -> bool:
        return (source, target, edge_type) in self._edge_set

    def _add_edge(self, edge: GraphEdge) -> bool:
        """Add an edge to both the graph and adjacency lists if new."""
        key = (edge.source, edge.target, edge.type)
        if key in self._edge_set:
            return False
        self._edge_set.add(key)
        self.graph.edges.append(edge)
        self.outgoing[edge.source].append(edge)
        self.incoming[edge.target].append(edge)
        return True

    # ── 1. Repair dangling edges ──────────────────────────────────────

    def repair_dangling_edges(self) -> list[str]:
        """Create stub nodes for edge endpoints that don't exist as nodes.

        Returns list of auto-created node IDs.
        """
        referenced_ids: set[str] = set()
        for edge in self.graph.edges:
            referenced_ids.add(edge.source)
            referenced_ids.add(edge.target)

        created: list[str] = []
        for node_id in sorted(referenced_ids):
            if node_id in self.node_map:
                continue
            # Infer type from edge context
            node_type = self._infer_stub_type(node_id)
            stub = GraphNode(
                id=node_id,
                label=node_id,
                type=node_type,
                domain="GEN",
                color="#94a3b8",
                loc=0,
                dead=False,
            )
            self.graph.nodes.append(stub)
            self.node_map[node_id] = stub
            created.append(node_id)
            logger.info("Created stub node: %s (type=%s)", node_id, node_type)

        return created

    def _infer_stub_type(self, node_id: str) -> str:
        """Guess what type a missing node should be based on its edges."""
        # Check what edges reference this node
        for edge in self.graph.edges:
            if edge.target == node_id:
                if edge.type in ("read", "write", "update", "delete"):
                    return "file"
                if edge.type in ("call", "cics_link", "cics_xctl", "job_step"):
                    return "program"
                if edge.type == "copy":
                    return "copybook"
                if edge.type in ("screen_send", "screen_receive"):
                    return "screen"
            if edge.source == node_id:
                if edge.type == "job_step":
                    return "job"
                if edge.type in ("read", "write", "update", "delete",
                                 "call", "copy", "cics_link", "cics_xctl"):
                    return "program"
        return "program"

    # ── 2. Connected components (BFS, undirected) ─────────────────────

    def find_connected_components(self) -> list[list[str]]:
        """Find connected components treating the graph as undirected.

        Returns components sorted by size (largest first), each component
        sorted alphabetically.
        """
        # Build undirected neighbor map
        neighbors: dict[str, set[str]] = defaultdict(set)
        for edge in self.graph.edges:
            neighbors[edge.source].add(edge.target)
            neighbors[edge.target].add(edge.source)

        visited: set[str] = set()
        components: list[list[str]] = []

        for node in self.graph.nodes:
            if node.id in visited:
                continue
            # BFS from this node
            component: list[str] = []
            queue: deque[str] = deque([node.id])
            visited.add(node.id)
            while queue:
                current = queue.popleft()
                component.append(current)
                for neighbor in sorted(neighbors.get(current, set())):
                    if neighbor not in visited and neighbor in self.node_map:
                        visited.add(neighbor)
                        queue.append(neighbor)
            components.append(sorted(component))

        # Sort by size descending, then alphabetically for stability
        components.sort(key=lambda c: (-len(c), c[0] if c else ""))
        return components

    # ── 3. Cycle detection (DFS on call edges) ────────────────────────

    def detect_cycles(self) -> list[list[str]]:
        """Detect cycles in call/transfer edges using DFS.

        Only considers edges that represent control flow: call,
        cics_link, cics_xctl. Returns a list of cycles, each as an
        ordered list of node IDs.
        """
        # Build call-only adjacency
        call_adj: dict[str, list[str]] = defaultdict(list)
        for edge in self.graph.edges:
            if edge.type in _CALL_EDGE_TYPES:
                call_adj[edge.source].append(edge.target)

        WHITE, GRAY, BLACK = 0, 1, 2
        color: dict[str, int] = {n.id: WHITE for n in self.graph.nodes}
        parent: dict[str, Optional[str]] = {n.id: None for n in self.graph.nodes}
        cycles: list[list[str]] = []

        def dfs(u: str) -> None:
            color[u] = GRAY
            for v in sorted(call_adj.get(u, [])):
                if v not in color:
                    continue
                if color[v] == GRAY:
                    # Back edge found → extract cycle
                    cycle = [v]
                    cur = u
                    while cur != v:
                        cycle.append(cur)
                        cur = parent.get(cur, v)
                    cycle.append(v)
                    cycle.reverse()
                    cycles.append(cycle)
                elif color[v] == WHITE:
                    parent[v] = u
                    dfs(v)
            color[u] = BLACK

        for node in self.graph.nodes:
            if color.get(node.id) == WHITE:
                dfs(node.id)

        return cycles

    # ── 4. Topological depth (BFS from entry points) ─────────────────

    def compute_depth_layers(self) -> dict[str, int]:
        """Compute topological depth for each node.

        Entry points (nodes with no incoming call/job_step edges) get
        depth 0. Each subsequent layer of dependencies gets depth + 1.
        Nodes in cycles get the depth at which they were first reached.

        Also sets node.depth on each GraphNode.
        """
        # Build directed adjacency for depth propagation
        # We use call, job_step, cics_link, cics_xctl for structural depth
        structural_types = _CALL_EDGE_TYPES | {"job_step"}
        successors: dict[str, list[str]] = defaultdict(list)
        has_structural_incoming: set[str] = set()

        for edge in self.graph.edges:
            if edge.type in structural_types:
                successors[edge.source].append(edge.target)
                has_structural_incoming.add(edge.target)

        # Entry points: nodes with no structural incoming edges
        depth: dict[str, int] = {}
        queue: deque[str] = deque()

        for node in self.graph.nodes:
            if node.id not in has_structural_incoming:
                depth[node.id] = 0
                queue.append(node.id)

        # BFS layer by layer
        while queue:
            current = queue.popleft()
            current_depth = depth[current]
            for successor in successors.get(current, []):
                if successor not in depth:
                    depth[successor] = current_depth + 1
                    queue.append(successor)

        # Assign depth=0 to any nodes not reached (isolated data nodes, etc.)
        for node in self.graph.nodes:
            if node.id not in depth:
                depth[node.id] = 0

        # Write back to nodes
        for node in self.graph.nodes:
            node.depth = depth.get(node.id, 0)

        return depth

    # ── 5. Cross-reference JCL steps → infer data edges ──────────────

    def cross_reference_jcl_steps(self) -> int:
        """Walk job nodes with step metadata and infer read/write edges.

        If a job node has steps listing dd_inputs and dd_outputs for a
        program, and that program doesn't already have corresponding
        read/write edges to those datasets, add them.

        Returns the number of edges inferred.
        """
        inferred = 0

        for node in self.graph.nodes:
            if node.type != "job" or not node.steps:
                continue

            for step in node.steps:
                program_id = step.get("program", "").upper()
                if not program_id:
                    continue

                # Ensure the program node exists
                if program_id not in self.node_map:
                    continue

                # Infer read edges from dd_inputs
                for dd_input in step.get("dd_inputs", []):
                    dataset_id = dd_input.upper()
                    if not dataset_id or dataset_id == program_id:
                        continue
                    if not self._has_edge(program_id, dataset_id, "read"):
                        if self._add_edge(GraphEdge(
                            source=program_id,
                            target=dataset_id,
                            type="read",
                            jcl_step=step.get("step_name"),
                        )):
                            inferred += 1

                # Infer write edges from dd_outputs
                for dd_output in step.get("dd_outputs", []):
                    dataset_id = dd_output.upper()
                    if not dataset_id or dataset_id == program_id:
                        continue
                    if not self._has_edge(program_id, dataset_id, "write"):
                        if self._add_edge(GraphEdge(
                            source=program_id,
                            target=dataset_id,
                            type="write",
                            jcl_step=step.get("step_name"),
                        )):
                            inferred += 1

        # Also infer from job_step edges with DISP metadata
        for edge in list(self.graph.edges):
            if edge.type != "job_step":
                continue
            if not edge.disp or not edge.dd_name:
                continue

            # The job_step edge goes job -> program.
            # DD params reference datasets. We need the dataset ID.
            # The dd_name alone is not a dataset ID; skip unless we can
            # resolve it from context. This is handled by the step-based
            # logic above which has explicit dd_inputs/dd_outputs.

        if inferred > 0:
            logger.info("Inferred %d read/write edges from JCL step metadata", inferred)
        return inferred

    # ── 6. Trace execution chains ─────────────────────────────────────

    def trace_execution_chains(self) -> list[list[str]]:
        """Trace paths from job nodes through programs to data files.

        Walks: job -[job_step]-> program -[read|write|update]-> file/table.
        Returns each chain as an ordered list of node IDs.
        """
        chains: list[list[str]] = []
        data_edge_types = frozenset({"read", "write", "update", "delete"})

        for node in self.graph.nodes:
            if node.type != "job":
                continue

            # Find programs this job steps into
            for edge in self.outgoing.get(node.id, []):
                if edge.type != "job_step":
                    continue
                program_id = edge.target
                if program_id not in self.node_map:
                    continue

                # Find data nodes this program accesses
                for data_edge in self.outgoing.get(program_id, []):
                    if data_edge.type in data_edge_types:
                        chains.append([node.id, program_id, data_edge.target])

                # Also follow call chains one level deeper
                for call_edge in self.outgoing.get(program_id, []):
                    if call_edge.type not in _CALL_EDGE_TYPES:
                        continue
                    callee = call_edge.target
                    for data_edge in self.outgoing.get(callee, []):
                        if data_edge.type in data_edge_types:
                            chains.append([
                                node.id, program_id, callee, data_edge.target
                            ])

        # Deduplicate and sort for determinism
        seen: set[tuple] = set()
        unique_chains: list[list[str]] = []
        for chain in chains:
            key = tuple(chain)
            if key not in seen:
                seen.add(key)
                unique_chains.append(chain)
        unique_chains.sort(key=lambda c: tuple(c))
        return unique_chains

    # ── 7. Find entry points and sinks ────────────────────────────────

    def find_entry_points(self) -> list[str]:
        """Find nodes with no incoming call/job_step edges (roots).

        These are top-level entry points: jobs not invoked by other jobs,
        and programs not called by other programs.
        """
        structural_types = _CALL_EDGE_TYPES | {"job_step"}
        has_incoming: set[str] = set()
        for edge in self.graph.edges:
            if edge.type in structural_types:
                has_incoming.add(edge.target)

        entry = []
        for node in self.graph.nodes:
            if node.type in ("program", "job") and node.id not in has_incoming:
                entry.append(node.id)
        return sorted(entry)

    def find_sinks(self) -> list[str]:
        """Find nodes with no outgoing edges (leaves)."""
        has_outgoing: set[str] = set()
        for edge in self.graph.edges:
            has_outgoing.add(edge.source)

        sinks = []
        for node in self.graph.nodes:
            if node.id not in has_outgoing:
                sinks.append(node.id)
        return sorted(sinks)

    # ── 8. Assign component IDs to nodes ──────────────────────────────

    def assign_component_ids(self, components: list[list[str]]) -> None:
        """Set node.component based on connected component membership."""
        for idx, component in enumerate(components):
            for node_id in component:
                if node_id in self.node_map:
                    self.node_map[node_id].component = idx

    # ── Full traversal ────────────────────────────────────────────────

    def traverse(self) -> TraversalReport:
        """Run the full deterministic traversal and return a report."""
        # 1. Repair dangling edges
        repaired = self.repair_dangling_edges()
        # Rebuild adjacency after adding stub nodes
        if repaired:
            self.outgoing.clear()
            self.incoming.clear()
            self._edge_set.clear()
            self._build_adjacency()

        # 2. Cross-reference JCL steps (may add edges)
        jcl_inferred = self.cross_reference_jcl_steps()
        if jcl_inferred > 0:
            # Rebuild adjacency after adding inferred edges
            self.outgoing.clear()
            self.incoming.clear()
            self._edge_set.clear()
            self._build_adjacency()

        # 3. Connected components
        components = self.find_connected_components()
        self.assign_component_ids(components)

        # 4. Cycle detection
        cycles = self.detect_cycles()

        # 5. Topological depth
        depth_map = self.compute_depth_layers()
        max_depth = max(depth_map.values()) if depth_map else 0

        # 6. Entry points and sinks
        entry_points = self.find_entry_points()
        sinks = self.find_sinks()

        # 7. Execution chains
        chains = self.trace_execution_chains()

        return TraversalReport(
            entry_points=entry_points,
            sinks=sinks,
            connected_components=components,
            cycles=cycles,
            execution_chains=chains,
            dangling_repaired=repaired,
            max_depth=max_depth,
            jcl_edges_inferred=jcl_inferred,
        )


# ── Fan metrics, dead code, risk (operate on traversed graph) ─────────

def compute_fan_metrics(graph: GraphData) -> None:
    """Compute fan-in and fan-out for every node, in place."""
    fan_in: dict[str, int] = {}
    fan_out: dict[str, int] = {}
    for edge in graph.edges:
        fan_out[edge.source] = fan_out.get(edge.source, 0) + 1
        fan_in[edge.target] = fan_in.get(edge.target, 0) + 1
    for node in graph.nodes:
        node.fan_in = fan_in.get(node.id, 0)
        node.fan_out = fan_out.get(node.id, 0)


def compute_risk_scores(graph: GraphData) -> None:
    """Assign a 0-1 risk score to each node based on size and connectivity."""
    for node in graph.nodes:
        loc_risk = min(node.loc / 1000, 0.4)
        dep_risk = min((node.fan_in + node.fan_out) / 20, 0.4)
        dead_risk = 0.2 if node.dead else 0.0
        node.risk = round(min(loc_risk + dep_risk + dead_risk, 1.0), 2)


def detect_dead_code(graph: GraphData) -> None:
    """Mark nodes that are never referenced as dead."""
    referenced: set[str] = set()
    for edge in graph.edges:
        referenced.add(edge.target)

    for node in graph.nodes:
        if node.type != "program":
            continue
        if node.id in referenced:
            continue
        # Programs with source (loc > 0) are entry points, not dead
        if node.loc > 0:
            continue
        has_any_edge = any(
            e.source == node.id or e.target == node.id for e in graph.edges
        )
        if not has_any_edge:
            node.dead = True


# ── Compat mapping ────────────────────────────────────────────────────

def to_compat_edges(graph: GraphData) -> GraphData:
    """Return a new GraphData with edges mapped to the base 5 types.

    Also maps 'file' node type back to 'table' for frontend compat.
    """
    compat_edges: list[GraphEdge] = []
    seen: set[tuple[str, str, str]] = set()
    for edge in graph.edges:
        compat_type = _COMPAT_MAP.get(edge.type, edge.type)
        key = (edge.source, edge.target, compat_type)
        if key not in seen:
            seen.add(key)
            compat_edges.append(
                GraphEdge(source=edge.source, target=edge.target, type=compat_type)
            )

    compat_nodes = []
    for node in graph.nodes:
        n = node.model_copy()
        if n.type == "file":
            n.type = "table"
        compat_nodes.append(n)

    return GraphData(
        nodes=compat_nodes,
        edges=compat_edges,
        domains=list(graph.domains),
        metadata=graph.metadata.model_copy(),
        traversal=graph.traversal,
    )


# ── Coverage validation ───────────────────────────────────────────────

def validate_coverage(
    source_files: list[SourceFile],
    files_read: set[str],
    graph: GraphData,
) -> list[str]:
    """Check that every source file has been read and has a graph node.

    Compares the list of source files from the fetcher against:
    1. The set of files actually read by the agent
    2. The graph nodes that exist (each source file should map to a node
       of the expected type based on its extension)

    Returns a list of human-readable gap descriptions. An empty list
    means full coverage.
    """
    node_ids = {n.id for n in graph.nodes}
    gaps: list[str] = []

    for sf in source_files:
        # Check if the file was read
        if sf.path not in files_read:
            gaps.append(f"UNREAD: {sf.path} ({sf.file_type}) was never read")
            continue

        # Check if a node exists for this file.
        # The node ID is typically the uppercased stem of the file name.
        expected_id = sf.name.upper()
        expected_type = sf.file_type  # from COBOL_EXTENSIONS mapping

        if expected_id not in node_ids:
            gaps.append(
                f"MISSING_NODE: {sf.path} was read but no {expected_type} "
                f"node with ID '{expected_id}' exists in the graph"
            )

    return gaps


# ── Main entry point ─────────────────────────────────────────────────

def enrich(graph: GraphData) -> TraversalReport:
    """Run the full deterministic finalization pipeline.

    1. GraphTraverser walks the node/edge structure
    2. Fan metrics computed from final edge set
    3. Dead code flagged
    4. Risk scores assigned

    Returns the TraversalReport (also attached to graph.traversal).
    """
    # Deterministic traversal
    traverser = GraphTraverser(graph)
    report = traverser.traverse()
    graph.traversal = report

    # Metrics on the (potentially expanded) graph
    compute_fan_metrics(graph)
    detect_dead_code(graph)
    compute_risk_scores(graph)

    logger.info(
        "Finalization complete: %d nodes, %d edges, %d components, "
        "%d cycles, %d execution chains, %d stubs repaired, "
        "%d JCL edges inferred, max depth %d",
        len(graph.nodes), len(graph.edges),
        len(report.connected_components), len(report.cycles),
        len(report.execution_chains), len(report.dangling_repaired),
        report.jcl_edges_inferred, report.max_depth,
    )

    return report
