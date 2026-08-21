"""Tests for tool dispatcher."""
import json

from cobol_agent.agent.tools import ToolDispatcher
from cobol_agent.graph.builder import GraphBuilder


def test_list_source_files(stub_fetcher):
    builder = GraphBuilder()
    dispatcher = ToolDispatcher(stub_fetcher, builder)
    result = json.loads(dispatcher.dispatch("list_source_files", {}))
    assert "files" in result
    assert result["total_files"] > 0


def test_read_source_file(stub_fetcher):
    builder = GraphBuilder()
    dispatcher = ToolDispatcher(stub_fetcher, builder)

    # List first to get paths
    listing = json.loads(dispatcher.dispatch("list_source_files", {}))
    path = listing["files"][0]["path"]

    result = json.loads(dispatcher.dispatch("read_source_file", {"path": path}))
    assert "content" in result
    assert result["length"] > 0


def test_add_program_node(stub_fetcher):
    builder = GraphBuilder()
    dispatcher = ToolDispatcher(stub_fetcher, builder)
    result = json.loads(dispatcher.dispatch("add_program_node", {
        "id": "TESTPROG",
        "label": "TESTPROG",
        "domain": "ACT",
        "loc": 100,
        "program_type": "batch",
    }))
    assert result["status"] == "ok"
    assert "TESTPROG" in builder.nodes


def test_add_file_node(stub_fetcher):
    builder = GraphBuilder()
    dispatcher = ToolDispatcher(stub_fetcher, builder)
    result = json.loads(dispatcher.dispatch("add_file_node", {
        "id": "CUSTFILE",
        "label": "CUSTFILE",
        "file_type": "vsam_ksds",
        "dsn": "PROD.CUST.MASTER",
    }))
    assert result["status"] == "ok"
    assert builder.nodes["CUSTFILE"].file_type == "vsam_ksds"


def test_add_edge(stub_fetcher):
    builder = GraphBuilder()
    dispatcher = ToolDispatcher(stub_fetcher, builder)
    dispatcher.dispatch("add_program_node", {"id": "P1", "label": "P1"})
    dispatcher.dispatch("add_file_node", {"id": "F1", "label": "F1"})
    result = json.loads(dispatcher.dispatch("add_edge", {
        "source": "P1",
        "target": "F1",
        "type": "read",
        "dd_name": "INDD",
        "disp": "SHR",
    }))
    assert result["status"] == "ok"
    assert result["added"] is True
    assert len(builder.edges) == 1
    assert builder.edges[0].dd_name == "INDD"


def test_finalize_graph(stub_fetcher):
    builder = GraphBuilder()
    dispatcher = ToolDispatcher(stub_fetcher, builder)
    result = json.loads(dispatcher.dispatch("finalize_graph", {
        "summary": "Analysis complete",
    }))
    assert result["status"] == "finalized"
    assert dispatcher.finalized is True
    assert dispatcher.summary == "Analysis complete"


def test_unknown_tool(stub_fetcher):
    builder = GraphBuilder()
    dispatcher = ToolDispatcher(stub_fetcher, builder)
    result = json.loads(dispatcher.dispatch("nonexistent_tool", {}))
    assert "error" in result
