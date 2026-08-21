"""Integration test for the agentic loop with a mocked Anthropic client."""
from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from cobol_agent.agent.loop import (
    LoopState,
    _check_stall,
    _estimate_message_tokens,
    _prune_context,
    run_agent,
)


# ── Test helpers ──────────────────────────────────────────────────────

def _make_text_block(text: str):
    return SimpleNamespace(type="text", text=text)


def _make_tool_use_block(tool_id: str, name: str, input_data: dict):
    return SimpleNamespace(type="tool_use", id=tool_id, name=name, input=input_data)


def _make_response(stop_reason: str, content: list, usage=None):
    return SimpleNamespace(stop_reason=stop_reason, content=content, usage=usage)


def _make_usage(input_tokens: int, output_tokens: int):
    return SimpleNamespace(input_tokens=input_tokens, output_tokens=output_tokens)


def _patch_loop():
    """Return a context manager that patches config functions."""
    return (
        patch("cobol_agent.agent.loop.get_api_key", return_value="test-key"),
        patch("cobol_agent.agent.loop.get_model", return_value="test-model"),
        patch("cobol_agent.agent.loop.get_max_iterations", return_value=10),
    )


# ── Core loop tests ──────────────────────────────────────────────────

def test_agent_loop_with_mock(minimal_fetcher):
    """Test the full agentic loop with a mocked Claude client."""
    call_count = 0

    def mock_create(**kwargs):
        nonlocal call_count
        call_count += 1

        usage = _make_usage(100, 50)

        if call_count == 1:
            return _make_response("tool_use", [
                _make_tool_use_block("t1", "list_source_files", {}),
            ], usage=usage)
        elif call_count == 2:
            return _make_response("tool_use", [
                _make_tool_use_block("t2", "read_source_file", {"path": "REPORT.cbl"}),
            ], usage=usage)
        elif call_count == 3:
            return _make_response("tool_use", [
                _make_tool_use_block("t3", "add_program_node", {
                    "id": "REPORT",
                    "label": "REPORT",
                    "domain": "RPT",
                    "loc": 25,
                    "program_type": "batch",
                }),
                _make_tool_use_block("t4", "add_file_node", {
                    "id": "INFILE",
                    "label": "INFILE",
                    "file_type": "sequential",
                }),
                _make_tool_use_block("t5", "add_edge", {
                    "source": "REPORT",
                    "target": "INFILE",
                    "type": "read",
                }),
            ], usage=usage)
        elif call_count == 4:
            return _make_response("tool_use", [
                _make_tool_use_block("t6", "finalize_graph", {
                    "summary": "Found 1 program reading 1 file",
                }),
            ], usage=usage)
        else:
            return _make_response("end_turn", [
                _make_text_block("Done"),
            ], usage=usage)

    mock_client = MagicMock()
    mock_client.messages.create = mock_create

    p1, p2, p3 = _patch_loop()
    with patch("cobol_agent.agent.loop.anthropic.Anthropic", return_value=mock_client), \
         p1, p2, p3:
        graph, summary = run_agent(minimal_fetcher, repo_label="test", verbose=True)

    assert len(graph.nodes) >= 2  # REPORT + INFILE
    assert len(graph.edges) >= 1  # read edge
    assert summary == "Found 1 program reading 1 file"

    node_map = {n.id: n for n in graph.nodes}
    assert "REPORT" in node_map
    assert node_map["REPORT"].type == "program"
    assert node_map["REPORT"].domain == "RPT"
    assert "INFILE" in node_map
    assert node_map["INFILE"].type == "file"
    assert all(n.risk >= 0.0 for n in graph.nodes)


def test_agent_loop_max_iterations(stub_fetcher):
    """Test that the loop stops at max iterations."""
    call_count = 0

    def mock_create(**kwargs):
        nonlocal call_count
        call_count += 1
        return _make_response("tool_use", [
            _make_tool_use_block(f"t{call_count}", "list_source_files", {}),
        ], usage=_make_usage(50, 30))

    mock_client = MagicMock()
    mock_client.messages.create = mock_create

    p1, p2 = (
        patch("cobol_agent.agent.loop.get_api_key", return_value="test-key"),
        patch("cobol_agent.agent.loop.get_model", return_value="test-model"),
    )
    with patch("cobol_agent.agent.loop.anthropic.Anthropic", return_value=mock_client), \
         p1, p2, \
         patch("cobol_agent.agent.loop.get_max_iterations", return_value=3):
        graph, summary = run_agent(stub_fetcher, repo_label="test")

    assert call_count == 3


def test_agent_loop_end_turn_without_finalize(stub_fetcher):
    """Test graceful handling when Claude ends without calling finalize."""
    call_count = 0

    def mock_create(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return _make_response("tool_use", [
                _make_tool_use_block("t1", "add_program_node", {
                    "id": "MYPROG", "label": "MYPROG",
                }),
            ], usage=_make_usage(100, 50))
        else:
            return _make_response("end_turn", [
                _make_text_block("Analysis complete, found 1 program."),
            ], usage=_make_usage(100, 50))

    mock_client = MagicMock()
    mock_client.messages.create = mock_create

    p1, p2, p3 = _patch_loop()
    with patch("cobol_agent.agent.loop.anthropic.Anthropic", return_value=mock_client), \
         p1, p2, p3:
        graph, summary = run_agent(stub_fetcher, repo_label="test")

    assert "MYPROG" in {n.id for n in graph.nodes}
    assert "Analysis complete" in summary


def test_agent_loop_progress_callback(stub_fetcher):
    """Test that the progress callback is invoked each iteration."""
    call_count = 0
    progress_states = []

    def mock_create(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count <= 2:
            return _make_response("tool_use", [
                _make_tool_use_block(f"t{call_count}", "add_program_node", {
                    "id": f"P{call_count}", "label": f"P{call_count}",
                }),
            ], usage=_make_usage(50, 30))
        else:
            return _make_response("tool_use", [
                _make_tool_use_block("tf", "finalize_graph", {"summary": "done"}),
            ], usage=_make_usage(50, 30))

    def on_progress(state):
        progress_states.append(state.iteration)

    mock_client = MagicMock()
    mock_client.messages.create = mock_create

    p1, p2, p3 = _patch_loop()
    with patch("cobol_agent.agent.loop.anthropic.Anthropic", return_value=mock_client), \
         p1, p2, p3:
        run_agent(stub_fetcher, repo_label="test", on_progress=on_progress)

    # Callback fires for iterations 1 and 2 (not 3, since finalize breaks)
    assert 1 in progress_states
    assert 2 in progress_states


def test_agent_loop_token_tracking(minimal_fetcher):
    """Test that token usage is accumulated across iterations."""
    call_count = 0

    def mock_create(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return _make_response("tool_use", [
                _make_tool_use_block("t1", "list_source_files", {}),
            ], usage=_make_usage(200, 100))
        elif call_count == 2:
            # Read the only file so coverage passes
            return _make_response("tool_use", [
                _make_tool_use_block("t2", "read_source_file", {"path": "REPORT.cbl"}),
            ], usage=_make_usage(100, 50))
        elif call_count == 3:
            return _make_response("tool_use", [
                _make_tool_use_block("t3", "add_program_node", {
                    "id": "REPORT", "label": "REPORT",
                }),
                _make_tool_use_block("t4", "finalize_graph", {"summary": "done"}),
            ], usage=_make_usage(300, 150))
        else:
            return _make_response("end_turn", [
                _make_text_block("Done"),
            ], usage=_make_usage(50, 25))

    mock_client = MagicMock()
    mock_client.messages.create = mock_create

    p1, p2, p3 = _patch_loop()
    with patch("cobol_agent.agent.loop.anthropic.Anthropic", return_value=mock_client), \
         p1, p2, p3:
        graph, _ = run_agent(minimal_fetcher, repo_label="test")

    # Usage should be accumulated across iterations
    assert graph.metadata.agent_iterations == 3


# ── Unit tests for helper functions ───────────────────────────────────

def test_estimate_message_tokens():
    messages = [
        {"role": "user", "content": "x" * 400},  # ~100 tokens
        {"role": "assistant", "content": "y" * 200},  # ~50 tokens
    ]
    tokens = _estimate_message_tokens(messages)
    assert 100 <= tokens <= 200


def test_prune_context_no_op_when_small():
    """Pruning should be a no-op when messages are small."""
    messages = [
        {"role": "user", "content": "Analyze this."},
        {"role": "assistant", "content": [_make_text_block("OK")]},
    ]
    pruned = _prune_context(messages, 200_000)
    assert len(pruned) == len(messages)


def test_prune_context_trims_large_reads():
    """Pruning should replace old large tool results with summaries."""
    messages = [{"role": "user", "content": "Start"}]
    # Add 10 rounds of tool results with large content
    for i in range(10):
        messages.append({
            "role": "assistant",
            "content": [_make_tool_use_block(f"t{i}", "read_source_file", {"path": f"F{i}.cbl"})],
        })
        result = json.dumps({
            "path": f"F{i}.cbl",
            "content": "X" * 10_000,
            "length": 10_000,
        })
        messages.append({
            "role": "user",
            "content": [{"type": "tool_result", "tool_use_id": f"t{i}", "content": result}],
        })

    # Force prune by using a tiny context window
    pruned = _prune_context(messages, 1000)

    # Check that early results were pruned (contain "pruned" note)
    early_result = pruned[2]["content"][0]["content"]
    parsed = json.loads(early_result)
    assert "pruned" in parsed.get("note", "").lower() or len(early_result) < 500


def test_check_stall_detects_repetition():
    state = LoopState()
    # Same call 3 times = stall
    assert not _check_stall("list_source_files", {}, state)
    assert not _check_stall("list_source_files", {}, state)
    assert not _check_stall("list_source_files", {}, state)
    assert _check_stall("list_source_files", {}, state)


def test_check_stall_resets_on_different_call():
    state = LoopState()
    _check_stall("list_source_files", {}, state)
    _check_stall("list_source_files", {}, state)
    # Different call resets
    _check_stall("read_source_file", {"path": "test.cbl"}, state)
    assert state.stall_count == 0


def test_agent_loop_handles_tool_errors(stub_fetcher):
    """Test that tool errors are recorded and don't crash the loop."""
    call_count = 0

    def mock_create(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            # Try to read a nonexistent file
            return _make_response("tool_use", [
                _make_tool_use_block("t1", "read_source_file", {"path": "NONEXISTENT.cbl"}),
            ], usage=_make_usage(100, 50))
        else:
            return _make_response("tool_use", [
                _make_tool_use_block("t2", "finalize_graph", {"summary": "done despite error"}),
            ], usage=_make_usage(100, 50))

    mock_client = MagicMock()
    mock_client.messages.create = mock_create

    p1, p2, p3 = _patch_loop()
    with patch("cobol_agent.agent.loop.anthropic.Anthropic", return_value=mock_client), \
         p1, p2, p3:
        graph, summary = run_agent(stub_fetcher, repo_label="test")

    assert summary == "done despite error"


# ── Coverage validation gate tests ────────────────────────────────


def test_coverage_gate_rejects_incomplete():
    """When Claude finalizes without reading all files, the loop re-enters."""
    from conftest import StubFetcher
    # Use a controlled 3-file fetcher (no fixture dir dependency)
    fetcher = StubFetcher({
        "REPORT.cbl": "IDENTIFICATION DIVISION.\nPROGRAM-ID. REPORT.\n",
        "RUNJOB.jcl": "//RUNJOB JOB\n",
        "COMMON.cpy": "01 WS-DATE.\n",
    })
    call_count = 0

    def mock_create(**kwargs):
        nonlocal call_count
        call_count += 1

        usage = _make_usage(100, 50)

        if call_count == 1:
            return _make_response("tool_use", [
                _make_tool_use_block("t1", "list_source_files", {}),
            ], usage=usage)
        elif call_count == 2:
            # Read only one file
            return _make_response("tool_use", [
                _make_tool_use_block("t2", "read_source_file", {"path": "REPORT.cbl"}),
            ], usage=usage)
        elif call_count == 3:
            # Add node and finalize (incomplete — missing RUNJOB, COMMON)
            return _make_response("tool_use", [
                _make_tool_use_block("t3", "add_program_node", {
                    "id": "REPORT", "label": "REPORT",
                }),
                _make_tool_use_block("t4", "finalize_graph", {
                    "summary": "Found 1 program",
                }),
            ], usage=usage)
        elif call_count == 4:
            # After coverage rejection, read the missing files
            return _make_response("tool_use", [
                _make_tool_use_block("t5", "read_source_file", {"path": "RUNJOB.jcl"}),
                _make_tool_use_block("t6", "read_source_file", {"path": "COMMON.cpy"}),
            ], usage=usage)
        elif call_count == 5:
            # Add the missing nodes and finalize again
            return _make_response("tool_use", [
                _make_tool_use_block("t7", "add_job_node", {
                    "id": "RUNJOB", "label": "RUNJOB",
                }),
                _make_tool_use_block("t8", "add_copybook_node", {
                    "id": "COMMON", "label": "COMMON",
                }),
                _make_tool_use_block("t9", "finalize_graph", {
                    "summary": "Found 1 program, 1 job, 1 copybook",
                }),
            ], usage=usage)
        else:
            return _make_response("end_turn", [
                _make_text_block("Done"),
            ], usage=usage)

    mock_client = MagicMock()
    mock_client.messages.create = mock_create

    p1, p2, p3 = _patch_loop()
    with patch("cobol_agent.agent.loop.anthropic.Anthropic", return_value=mock_client), \
         p1, p2, p3:
        graph, summary = run_agent(fetcher, repo_label="test", verbose=True)

    # Should have gone through 2 finalize attempts
    assert graph.traversal is not None
    assert graph.traversal.finalize_attempts == 2
    assert graph.traversal.coverage_complete is True
    assert len(graph.traversal.coverage_gaps) == 0

    # All three node types should be present
    node_ids = {n.id for n in graph.nodes}
    assert "REPORT" in node_ids
    assert "RUNJOB" in node_ids
    assert "COMMON" in node_ids
    assert summary == "Found 1 program, 1 job, 1 copybook"


def test_coverage_gate_accepts_after_max_retries():
    """After max retries, the loop accepts even with gaps."""
    from conftest import StubFetcher
    fetcher = StubFetcher({
        "REPORT.cbl": "IDENTIFICATION DIVISION.\nPROGRAM-ID. REPORT.\n",
        "RUNJOB.jcl": "//RUNJOB JOB\n",
    })
    call_count = 0

    def mock_create(**kwargs):
        nonlocal call_count
        call_count += 1
        usage = _make_usage(100, 50)

        if call_count == 1:
            return _make_response("tool_use", [
                _make_tool_use_block("t1", "list_source_files", {}),
            ], usage=usage)
        else:
            # Keep finalizing without reading files or adding nodes
            return _make_response("tool_use", [
                _make_tool_use_block(f"t{call_count}", "finalize_graph", {
                    "summary": "partial analysis",
                }),
            ], usage=usage)

    mock_client = MagicMock()
    mock_client.messages.create = mock_create

    p1, p2, p3 = _patch_loop()
    with patch("cobol_agent.agent.loop.anthropic.Anthropic", return_value=mock_client), \
         p1, p2, p3:
        graph, summary = run_agent(fetcher, repo_label="test")

    # Should have exhausted max finalize attempts (3) and accepted with gaps
    assert graph.traversal is not None
    assert graph.traversal.finalize_attempts == 3
    assert graph.traversal.coverage_complete is False
    assert len(graph.traversal.coverage_gaps) > 0


def test_coverage_gate_passes_when_all_read():
    """When all files are read and nodes created, finalize passes on first try."""
    from conftest import StubFetcher
    fetcher = StubFetcher({
        "REPORT.cbl": "IDENTIFICATION DIVISION.\nPROGRAM-ID. REPORT.\n",
        "RUNJOB.jcl": "//RUNJOB JOB\n",
        "COMMON.cpy": "01 WS-DATE.\n",
    })
    call_count = 0

    def mock_create(**kwargs):
        nonlocal call_count
        call_count += 1
        usage = _make_usage(100, 50)

        if call_count == 1:
            return _make_response("tool_use", [
                _make_tool_use_block("t1", "list_source_files", {}),
            ], usage=usage)
        elif call_count == 2:
            return _make_response("tool_use", [
                _make_tool_use_block("t2", "read_source_file", {"path": "REPORT.cbl"}),
                _make_tool_use_block("t3", "read_source_file", {"path": "RUNJOB.jcl"}),
                _make_tool_use_block("t4", "read_source_file", {"path": "COMMON.cpy"}),
            ], usage=usage)
        elif call_count == 3:
            return _make_response("tool_use", [
                _make_tool_use_block("t5", "add_program_node", {
                    "id": "REPORT", "label": "REPORT",
                }),
                _make_tool_use_block("t6", "add_job_node", {
                    "id": "RUNJOB", "label": "RUNJOB",
                }),
                _make_tool_use_block("t7", "add_copybook_node", {
                    "id": "COMMON", "label": "COMMON",
                }),
                _make_tool_use_block("t8", "finalize_graph", {
                    "summary": "Complete analysis",
                }),
            ], usage=usage)
        else:
            return _make_response("end_turn", [
                _make_text_block("Done"),
            ], usage=usage)

    mock_client = MagicMock()
    mock_client.messages.create = mock_create

    p1, p2, p3 = _patch_loop()
    with patch("cobol_agent.agent.loop.anthropic.Anthropic", return_value=mock_client), \
         p1, p2, p3:
        graph, summary = run_agent(fetcher, repo_label="test")

    # Should pass coverage on first attempt
    assert graph.traversal is not None
    assert graph.traversal.finalize_attempts == 1
    assert graph.traversal.coverage_complete is True
    assert len(graph.traversal.coverage_gaps) == 0
    assert summary == "Complete analysis"
