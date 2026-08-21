"""Tests for graph schema models."""
from cobol_agent.graph.schema import GraphData, GraphEdge, GraphNode


def test_graph_node_defaults():
    node = GraphNode(id="TEST", label="TEST", type="program")
    assert node.domain == "GEN"
    assert node.risk == 0.0
    assert node.dead is False
    assert node.fan_in == 0
    assert node.fan_out == 0
    assert node.file_type is None


def test_graph_node_extended_fields():
    node = GraphNode(
        id="CUSTFILE",
        label="CUSTFILE",
        type="file",
        file_type="vsam_ksds",
        dsn="PROD.CUST.MASTER",
        record_format="FB",
        record_length=200,
    )
    assert node.file_type == "vsam_ksds"
    assert node.dsn == "PROD.CUST.MASTER"


def test_graph_edge_basic():
    edge = GraphEdge(source="PROG1", target="FILE1", type="read")
    assert edge.source == "PROG1"
    assert edge.dd_name is None


def test_graph_edge_with_jcl_metadata():
    edge = GraphEdge(
        source="JOB1",
        target="DATASET1",
        type="job_step",
        dd_name="INDD",
        disp="SHR",
        jcl_step="STEP01",
    )
    assert edge.dd_name == "INDD"
    assert edge.disp == "SHR"


def test_graph_data_serialization():
    graph = GraphData(
        nodes=[GraphNode(id="P1", label="P1", type="program")],
        edges=[GraphEdge(source="P1", target="F1", type="read")],
    )
    data = graph.model_dump(by_alias=True, exclude_none=True)
    assert data["nodes"][0]["fanIn"] == 0
    assert data["edges"][0]["type"] == "read"
