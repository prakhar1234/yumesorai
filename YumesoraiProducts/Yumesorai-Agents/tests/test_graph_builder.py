"""Tests for the graph builder, traverser, and enrichment."""
from cobol_agent.graph.builder import GraphBuilder
from cobol_agent.graph.enrichment import (
    GraphTraverser,
    compute_fan_metrics,
    compute_risk_scores,
    detect_dead_code,
    enrich,
    to_compat_edges,
    validate_coverage,
)
from cobol_agent.graph.schema import GraphData, GraphEdge, GraphNode
from cobol_agent.sources.base import SourceFile


# ── Builder tests ─────────────────────────────────────────────────────

def test_add_node(builder):
    node = GraphNode(id="PROG1", label="PROG1", type="program", domain="ACT")
    result = builder.add_node(node)
    assert result == "PROG1"
    assert "PROG1" in builder.nodes


def test_add_node_merge(builder):
    builder.add_node(GraphNode(id="PROG1", label="PROG1", type="program", loc=0))
    builder.add_node(GraphNode(id="PROG1", label="PROG1", type="program", loc=500, domain="PAY"))
    assert builder.nodes["PROG1"].loc == 500
    assert builder.nodes["PROG1"].domain == "PAY"


def test_add_edge_dedup(builder):
    edge = GraphEdge(source="A", target="B", type="read")
    assert builder.add_edge(edge) is True
    assert builder.add_edge(edge) is False
    assert len(builder.edges) == 1


def test_build_output(builder):
    builder.add_node(GraphNode(id="P1", label="P1", type="program", domain="GEN"))
    builder.add_edge(GraphEdge(source="P1", target="F1", type="read"))
    graph = builder.build(repo="test-repo", model="test-model", iterations=5)
    assert graph.metadata.repo == "test-repo"
    assert len(graph.nodes) == 1
    assert len(graph.edges) == 1


# ── Flat metric tests ────────────────────────────────────────────────

def test_compute_fan_metrics():
    graph = _make_sample_graph()
    compute_fan_metrics(graph)
    node_map = {n.id: n for n in graph.nodes}
    assert node_map["P1"].fan_out == 2
    assert node_map["F1"].fan_in == 1
    assert node_map["F2"].fan_in == 1


def test_detect_dead_code():
    graph = _make_sample_graph()
    graph.nodes.append(GraphNode(id="ORPHAN", label="ORPHAN", type="program", loc=0))
    detect_dead_code(graph)
    node_map = {n.id: n for n in graph.nodes}
    assert node_map["ORPHAN"].dead is True
    assert node_map["P1"].dead is False


def test_risk_scores():
    graph = _make_sample_graph()
    compute_fan_metrics(graph)
    compute_risk_scores(graph)
    for node in graph.nodes:
        assert 0.0 <= node.risk <= 1.0


def test_compat_edges():
    graph = _make_sample_graph()
    compat = to_compat_edges(graph)
    edge_types = {e.type for e in compat.edges}
    assert "data" in edge_types
    assert "read" not in edge_types
    assert "write" not in edge_types


def test_enrich_runs():
    graph = _make_sample_graph()
    report = enrich(graph)
    for node in graph.nodes:
        assert node.risk >= 0.0
    assert graph.traversal is not None
    assert report is graph.traversal


# ── GraphTraverser tests ─────────────────────────────────────────────

def test_traverser_repair_dangling_edges():
    """Edges referencing nonexistent nodes should get stub nodes created."""
    graph = GraphData(
        nodes=[GraphNode(id="P1", label="P1", type="program", loc=100)],
        edges=[
            GraphEdge(source="P1", target="MISSING_FILE", type="read"),
            GraphEdge(source="P1", target="MISSING_PROG", type="call"),
            GraphEdge(source="P1", target="MISSING_CPY", type="copy"),
        ],
    )
    traverser = GraphTraverser(graph)
    repaired = traverser.repair_dangling_edges()

    assert "MISSING_FILE" in repaired
    assert "MISSING_PROG" in repaired
    assert "MISSING_CPY" in repaired

    node_map = {n.id: n for n in graph.nodes}
    assert node_map["MISSING_FILE"].type == "file"
    assert node_map["MISSING_PROG"].type == "program"
    assert node_map["MISSING_CPY"].type == "copybook"


def test_traverser_connected_components():
    """Two disconnected subgraphs should yield two components."""
    graph = GraphData(
        nodes=[
            GraphNode(id="A", label="A", type="program"),
            GraphNode(id="B", label="B", type="program"),
            GraphNode(id="C", label="C", type="program"),
            GraphNode(id="X", label="X", type="program"),
            GraphNode(id="Y", label="Y", type="program"),
        ],
        edges=[
            GraphEdge(source="A", target="B", type="call"),
            GraphEdge(source="B", target="C", type="call"),
            GraphEdge(source="X", target="Y", type="call"),
        ],
    )
    traverser = GraphTraverser(graph)
    components = traverser.find_connected_components()

    assert len(components) == 2
    # Largest component first
    assert len(components[0]) == 3
    assert len(components[1]) == 2
    assert set(components[0]) == {"A", "B", "C"}
    assert set(components[1]) == {"X", "Y"}


def test_traverser_single_component():
    """Fully connected graph should yield one component."""
    graph = _make_sample_graph()
    traverser = GraphTraverser(graph)
    components = traverser.find_connected_components()
    assert len(components) == 1
    assert set(components[0]) == {"P1", "F1", "F2"}


def test_traverser_detect_cycles():
    """Mutual call should be detected as a cycle."""
    graph = GraphData(
        nodes=[
            GraphNode(id="A", label="A", type="program"),
            GraphNode(id="B", label="B", type="program"),
            GraphNode(id="C", label="C", type="program"),
        ],
        edges=[
            GraphEdge(source="A", target="B", type="call"),
            GraphEdge(source="B", target="C", type="call"),
            GraphEdge(source="C", target="A", type="call"),
        ],
    )
    traverser = GraphTraverser(graph)
    cycles = traverser.detect_cycles()
    assert len(cycles) >= 1
    # The cycle should contain A, B, C
    cycle_nodes = set()
    for cycle in cycles:
        cycle_nodes.update(cycle)
    assert {"A", "B", "C"}.issubset(cycle_nodes)


def test_traverser_no_cycles():
    """A DAG should have no cycles."""
    graph = _make_sample_graph()
    traverser = GraphTraverser(graph)
    cycles = traverser.detect_cycles()
    assert len(cycles) == 0


def test_traverser_depth_layers():
    """Topological depth should propagate from entry points."""
    graph = GraphData(
        nodes=[
            GraphNode(id="JOB1", label="JOB1", type="job"),
            GraphNode(id="PROG1", label="PROG1", type="program"),
            GraphNode(id="PROG2", label="PROG2", type="program"),
            GraphNode(id="FILE1", label="FILE1", type="file"),
        ],
        edges=[
            GraphEdge(source="JOB1", target="PROG1", type="job_step"),
            GraphEdge(source="PROG1", target="PROG2", type="call"),
            GraphEdge(source="PROG2", target="FILE1", type="read"),
        ],
    )
    traverser = GraphTraverser(graph)
    depth = traverser.compute_depth_layers()

    assert depth["JOB1"] == 0
    assert depth["PROG1"] == 1
    assert depth["PROG2"] == 2
    # FILE1 has no structural incoming edges, so depth 0
    assert depth["FILE1"] == 0

    # Check that node.depth is set
    node_map = {n.id: n for n in graph.nodes}
    assert node_map["PROG1"].depth == 1
    assert node_map["PROG2"].depth == 2


def test_traverser_entry_points():
    """Entry points are programs/jobs with no structural incoming edges."""
    graph = GraphData(
        nodes=[
            GraphNode(id="JOB1", label="JOB1", type="job"),
            GraphNode(id="PROG1", label="PROG1", type="program"),
            GraphNode(id="PROG2", label="PROG2", type="program"),
            GraphNode(id="FILE1", label="FILE1", type="file"),
        ],
        edges=[
            GraphEdge(source="JOB1", target="PROG1", type="job_step"),
            GraphEdge(source="PROG1", target="PROG2", type="call"),
        ],
    )
    traverser = GraphTraverser(graph)
    entry = traverser.find_entry_points()
    assert "JOB1" in entry
    assert "PROG1" not in entry  # called by JOB1
    assert "PROG2" not in entry  # called by PROG1


def test_traverser_sinks():
    """Sinks are nodes with no outgoing edges."""
    graph = _make_sample_graph()
    traverser = GraphTraverser(graph)
    sinks = traverser.find_sinks()
    assert "F1" in sinks
    assert "F2" in sinks
    assert "P1" not in sinks


def test_traverser_execution_chains():
    """Chains should trace job -> program -> data file."""
    graph = GraphData(
        nodes=[
            GraphNode(id="JOB1", label="JOB1", type="job"),
            GraphNode(id="PROG1", label="PROG1", type="program"),
            GraphNode(id="INFILE", label="INFILE", type="file"),
            GraphNode(id="OUTFILE", label="OUTFILE", type="file"),
        ],
        edges=[
            GraphEdge(source="JOB1", target="PROG1", type="job_step"),
            GraphEdge(source="PROG1", target="INFILE", type="read"),
            GraphEdge(source="PROG1", target="OUTFILE", type="write"),
        ],
    )
    traverser = GraphTraverser(graph)
    chains = traverser.trace_execution_chains()

    assert len(chains) == 2
    assert ["JOB1", "PROG1", "INFILE"] in chains
    assert ["JOB1", "PROG1", "OUTFILE"] in chains


def test_traverser_execution_chains_with_call():
    """Chains should follow one level of call edges."""
    graph = GraphData(
        nodes=[
            GraphNode(id="JOB1", label="JOB1", type="job"),
            GraphNode(id="MAIN", label="MAIN", type="program"),
            GraphNode(id="SUB1", label="SUB1", type="program"),
            GraphNode(id="DATAFILE", label="DATAFILE", type="file"),
        ],
        edges=[
            GraphEdge(source="JOB1", target="MAIN", type="job_step"),
            GraphEdge(source="MAIN", target="SUB1", type="call"),
            GraphEdge(source="SUB1", target="DATAFILE", type="read"),
        ],
    )
    traverser = GraphTraverser(graph)
    chains = traverser.trace_execution_chains()
    assert ["JOB1", "MAIN", "SUB1", "DATAFILE"] in chains


def test_traverser_jcl_cross_reference():
    """JCL step metadata should infer read/write edges."""
    graph = GraphData(
        nodes=[
            GraphNode(
                id="JOB1", label="JOB1", type="job",
                steps=[{
                    "step_name": "STEP01",
                    "program": "PROG1",
                    "dd_inputs": ["INFILE"],
                    "dd_outputs": ["OUTFILE"],
                }],
            ),
            GraphNode(id="PROG1", label="PROG1", type="program"),
            GraphNode(id="INFILE", label="INFILE", type="file"),
            GraphNode(id="OUTFILE", label="OUTFILE", type="file"),
        ],
        edges=[
            GraphEdge(source="JOB1", target="PROG1", type="job_step"),
        ],
    )
    traverser = GraphTraverser(graph)
    inferred = traverser.cross_reference_jcl_steps()

    assert inferred == 2
    edge_types = {(e.source, e.target, e.type) for e in graph.edges}
    assert ("PROG1", "INFILE", "read") in edge_types
    assert ("PROG1", "OUTFILE", "write") in edge_types


def test_traverser_jcl_cross_reference_no_duplicates():
    """JCL cross-reference should not duplicate existing edges."""
    graph = GraphData(
        nodes=[
            GraphNode(
                id="JOB1", label="JOB1", type="job",
                steps=[{
                    "step_name": "STEP01",
                    "program": "PROG1",
                    "dd_inputs": ["INFILE"],
                    "dd_outputs": [],
                }],
            ),
            GraphNode(id="PROG1", label="PROG1", type="program"),
            GraphNode(id="INFILE", label="INFILE", type="file"),
        ],
        edges=[
            GraphEdge(source="JOB1", target="PROG1", type="job_step"),
            # Edge already exists
            GraphEdge(source="PROG1", target="INFILE", type="read"),
        ],
    )
    traverser = GraphTraverser(graph)
    inferred = traverser.cross_reference_jcl_steps()
    assert inferred == 0


def test_traverser_component_ids():
    """Component IDs should be assigned to nodes."""
    graph = GraphData(
        nodes=[
            GraphNode(id="A", label="A", type="program"),
            GraphNode(id="B", label="B", type="program"),
            GraphNode(id="X", label="X", type="program"),
        ],
        edges=[
            GraphEdge(source="A", target="B", type="call"),
        ],
    )
    traverser = GraphTraverser(graph)
    components = traverser.find_connected_components()
    traverser.assign_component_ids(components)

    node_map = {n.id: n for n in graph.nodes}
    assert node_map["A"].component == node_map["B"].component
    assert node_map["X"].component != node_map["A"].component


def test_full_traversal_report():
    """The full traverse() method should produce a complete report."""
    graph = GraphData(
        nodes=[
            GraphNode(id="JOB1", label="JOB1", type="job",
                      steps=[{"step_name": "S1", "program": "P1",
                              "dd_inputs": ["F1"], "dd_outputs": ["F2"]}]),
            GraphNode(id="P1", label="P1", type="program", loc=200),
            GraphNode(id="F1", label="F1", type="file"),
            GraphNode(id="F2", label="F2", type="file"),
        ],
        edges=[
            GraphEdge(source="JOB1", target="P1", type="job_step"),
        ],
    )

    traverser = GraphTraverser(graph)
    report = traverser.traverse()

    assert report.jcl_edges_inferred == 2
    assert "JOB1" in report.entry_points
    assert len(report.connected_components) == 1
    assert len(report.cycles) == 0
    assert report.max_depth >= 1
    assert len(report.execution_chains) >= 1


def test_enrich_attaches_traversal():
    """enrich() should attach a TraversalReport to the graph."""
    graph = _make_sample_graph()
    report = enrich(graph)
    assert graph.traversal is not None
    assert report is graph.traversal
    assert isinstance(report.entry_points, list)
    assert isinstance(report.connected_components, list)


def test_enrich_with_dangling():
    """enrich() should auto-create stubs for dangling edges."""
    graph = GraphData(
        nodes=[GraphNode(id="P1", label="P1", type="program", loc=50)],
        edges=[GraphEdge(source="P1", target="GHOST", type="read")],
    )
    report = enrich(graph)
    assert "GHOST" in report.dangling_repaired
    assert any(n.id == "GHOST" for n in graph.nodes)


# ── Coverage validation tests ─────────────────────────────────────────

def test_validate_coverage_all_covered():
    """No gaps when all files are read and have nodes."""
    source_files = [
        SourceFile(path="PROG1.cbl", name="PROG1", ext=".cbl", file_type="program"),
        SourceFile(path="JOB1.jcl", name="JOB1", ext=".jcl", file_type="job"),
    ]
    files_read = {"PROG1.cbl", "JOB1.jcl"}
    graph = GraphData(
        nodes=[
            GraphNode(id="PROG1", label="PROG1", type="program"),
            GraphNode(id="JOB1", label="JOB1", type="job"),
        ],
    )
    gaps = validate_coverage(source_files, files_read, graph)
    assert gaps == []


def test_validate_coverage_unread_file():
    """Gap reported for files not read."""
    source_files = [
        SourceFile(path="PROG1.cbl", name="PROG1", ext=".cbl", file_type="program"),
        SourceFile(path="PROG2.cbl", name="PROG2", ext=".cbl", file_type="program"),
    ]
    files_read = {"PROG1.cbl"}
    graph = GraphData(
        nodes=[GraphNode(id="PROG1", label="PROG1", type="program")],
    )
    gaps = validate_coverage(source_files, files_read, graph)
    assert len(gaps) == 1
    assert "UNREAD" in gaps[0]
    assert "PROG2.cbl" in gaps[0]


def test_validate_coverage_missing_node():
    """Gap reported when file was read but no node exists."""
    source_files = [
        SourceFile(path="PROG1.cbl", name="PROG1", ext=".cbl", file_type="program"),
        SourceFile(path="COMMON.cpy", name="COMMON", ext=".cpy", file_type="copybook"),
    ]
    files_read = {"PROG1.cbl", "COMMON.cpy"}
    graph = GraphData(
        nodes=[GraphNode(id="PROG1", label="PROG1", type="program")],
    )
    gaps = validate_coverage(source_files, files_read, graph)
    assert len(gaps) == 1
    assert "MISSING_NODE" in gaps[0]
    assert "COMMON" in gaps[0]


# ── Helpers ───────────────────────────────────────────────────────────

def _make_sample_graph():
    return GraphData(
        nodes=[
            GraphNode(id="P1", label="P1", type="program", loc=200),
            GraphNode(id="F1", label="F1", type="file", file_type="sequential"),
            GraphNode(id="F2", label="F2", type="file", file_type="vsam_ksds"),
        ],
        edges=[
            GraphEdge(source="P1", target="F1", type="read"),
            GraphEdge(source="P1", target="F2", type="write"),
        ],
    )
