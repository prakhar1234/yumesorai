"""Main agentic loop using the Anthropic SDK tool_use pattern.

This implements a production-grade agentic loop with:
- Retry with exponential backoff on transient API errors
- Token budget tracking and context window pruning
- Phase-aware progress reporting (JCL -> COBOL -> copybooks -> BMS)
- Structured error recovery (tool failures are fed back to Claude)
- Stall detection (repeated identical tool calls)
"""
from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

import anthropic

from ..config import get_api_key, get_max_iterations, get_model
from ..graph.builder import GraphBuilder
from ..graph.enrichment import enrich, validate_coverage
from ..graph.schema import GraphData
from ..sources.base import SourceFetcher
from .prompts import SYSTEM_PROMPT
from .tools import TOOL_DEFINITIONS, ToolDispatcher

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────

# Approximate token-per-char ratio for context budget estimation
_CHARS_PER_TOKEN = 4

# When estimated conversation tokens exceed this fraction of the model's
# context window, old read_source_file results get pruned to summaries.
_CONTEXT_PRUNE_THRESHOLD = 0.6

# Model context window sizes (tokens)
_MODEL_CONTEXT_WINDOWS: dict[str, int] = {
    "claude-sonnet-4-20250514": 200_000,
    "claude-opus-4-20250514": 200_000,
    "claude-haiku-3-20250307": 200_000,
}
_DEFAULT_CONTEXT_WINDOW = 200_000

# Retry configuration
_MAX_RETRIES = 3
_RETRY_BASE_DELAY = 2.0  # seconds
_RETRY_MAX_DELAY = 30.0

# Stall detection: if the same tool call signature repeats this many
# times consecutively, inject a nudge message.
_STALL_THRESHOLD = 3

# Maximum number of times the loop will re-enter after coverage validation
# fails. Prevents infinite loops if Claude can't produce the missing nodes.
_MAX_FINALIZE_ATTEMPTS = 3


# ── Data structures ───────────────────────────────────────────────────

@dataclass
class TokenUsage:
    """Tracks cumulative token usage across the loop."""
    input_tokens: int = 0
    output_tokens: int = 0

    @property
    def total(self) -> int:
        return self.input_tokens + self.output_tokens


@dataclass
class LoopState:
    """Mutable state carried across loop iterations."""
    iteration: int = 0
    phase: str = "init"
    files_read: set = field(default_factory=set)
    files_total: int = 0
    nodes_added: int = 0
    edges_added: int = 0
    last_tool_signature: str = ""
    stall_count: int = 0
    finalize_attempts: int = 0
    coverage_gaps: list = field(default_factory=list)
    errors: list = field(default_factory=list)
    token_usage: TokenUsage = field(default_factory=TokenUsage)


# Type alias for the optional progress callback
ProgressCallback = Optional[Callable[[LoopState], None]]


# ── Retry helper ──────────────────────────────────────────────────────

def _api_call_with_retry(
    client: anthropic.Anthropic,
    *,
    model: str,
    max_tokens: int,
    system: str,
    tools: list[dict],
    messages: list[dict],
    token_usage: TokenUsage,
) -> Any:
    """Call the Anthropic API with exponential backoff on transient errors."""
    last_error = None
    for attempt in range(_MAX_RETRIES):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=max_tokens,
                system=system,
                tools=tools,
                messages=messages,
            )
            # Accumulate token usage from response
            if hasattr(response, "usage") and response.usage is not None:
                token_usage.input_tokens += getattr(response.usage, "input_tokens", 0)
                token_usage.output_tokens += getattr(response.usage, "output_tokens", 0)
            return response

        except anthropic.RateLimitError as e:
            last_error = e
            delay = min(_RETRY_BASE_DELAY * (2 ** attempt), _RETRY_MAX_DELAY)
            logger.warning(
                "Rate limited (attempt %d/%d), retrying in %.1fs",
                attempt + 1, _MAX_RETRIES, delay,
            )
            time.sleep(delay)

        except anthropic.InternalServerError as e:
            last_error = e
            delay = min(_RETRY_BASE_DELAY * (2 ** attempt), _RETRY_MAX_DELAY)
            logger.warning(
                "Server error (attempt %d/%d), retrying in %.1fs: %s",
                attempt + 1, _MAX_RETRIES, delay, e,
            )
            time.sleep(delay)

        except anthropic.APIConnectionError as e:
            last_error = e
            delay = min(_RETRY_BASE_DELAY * (2 ** attempt), _RETRY_MAX_DELAY)
            logger.warning(
                "Connection error (attempt %d/%d), retrying in %.1fs: %s",
                attempt + 1, _MAX_RETRIES, delay, e,
            )
            time.sleep(delay)

    raise RuntimeError(
        f"API call failed after {_MAX_RETRIES} attempts: {last_error}"
    ) from last_error


# ── Context window management ─────────────────────────────────────────

def _estimate_message_tokens(messages: list[dict]) -> int:
    """Rough estimate of token count from message content."""
    total_chars = 0
    for msg in messages:
        content = msg.get("content", "")
        if isinstance(content, str):
            total_chars += len(content)
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, dict):
                    # tool_result content
                    total_chars += len(str(block.get("content", "")))
                else:
                    # SDK content block objects
                    if hasattr(block, "text"):
                        total_chars += len(block.text)
                    elif hasattr(block, "input"):
                        total_chars += len(json.dumps(block.input))
    return total_chars // _CHARS_PER_TOKEN


def _prune_context(messages: list[dict], context_window: int) -> list[dict]:
    """Prune old read_source_file results to stay within context budget.

    Strategy: walk backwards through tool_result messages and replace
    large file content blobs with a short summary, keeping the most
    recent reads intact. The first user message and all non-tool messages
    are preserved.
    """
    token_estimate = _estimate_message_tokens(messages)
    budget = int(context_window * _CONTEXT_PRUNE_THRESHOLD)

    if token_estimate <= budget:
        return messages

    logger.info(
        "Context pruning: ~%d tokens estimated, budget %d — trimming old reads",
        token_estimate, budget,
    )

    # Find indices of user messages containing tool_results
    result_indices = []
    for i, msg in enumerate(messages):
        if msg["role"] != "user":
            continue
        content = msg.get("content", "")
        if isinstance(content, list) and any(
            isinstance(b, dict) and b.get("type") == "tool_result"
            for b in content
        ):
            result_indices.append(i)

    # Prune from oldest to newest, skipping the last 4 tool_result turns
    # (keep recent context hot)
    pruned = list(messages)
    prune_candidates = result_indices[:-4] if len(result_indices) > 4 else []

    for idx in prune_candidates:
        if _estimate_message_tokens(pruned) <= budget:
            break
        msg = pruned[idx]
        content = msg["content"]
        if not isinstance(content, list):
            continue
        new_content = []
        for block in content:
            if not isinstance(block, dict) or block.get("type") != "tool_result":
                new_content.append(block)
                continue
            raw = block.get("content", "")
            if isinstance(raw, str) and len(raw) > 500:
                # Try to parse and summarize
                try:
                    data = json.loads(raw)
                    if "content" in data and len(data["content"]) > 200:
                        # This is a read_source_file result — summarize
                        path = data.get("path", "unknown")
                        length = data.get("length", len(data["content"]))
                        summary = json.dumps({
                            "path": path,
                            "length": length,
                            "note": "Content pruned for context management. "
                                    "Call read_source_file again if needed.",
                        })
                        new_content.append({**block, "content": summary})
                        continue
                except (json.JSONDecodeError, TypeError):
                    pass
            new_content.append(block)
        pruned[idx] = {**msg, "content": new_content}

    logger.info(
        "Context after pruning: ~%d tokens",
        _estimate_message_tokens(pruned),
    )
    return pruned


# ── Phase detection ───────────────────────────────────────────────────

def _detect_phase(tool_name: str, tool_input: dict, state: LoopState) -> str:
    """Infer the current analysis phase from the tool being called."""
    if tool_name == "list_source_files":
        return "discovery"
    if tool_name == "read_source_file":
        path = tool_input.get("path", "").lower()
        if path.endswith(".jcl"):
            return "jcl_analysis"
        if path.endswith((".cbl", ".cob")):
            return "cobol_analysis"
        if path.endswith(".cpy"):
            return "copybook_analysis"
        if path.endswith(".bms"):
            return "bms_analysis"
        return "reading"
    if tool_name == "finalize_graph":
        return "finalizing"
    if tool_name.startswith("add_"):
        return "graph_building"
    return state.phase


# ── Stall detection ───────────────────────────────────────────────────

def _check_stall(tool_name: str, tool_input: dict, state: LoopState) -> bool:
    """Detect if the agent is stuck repeating the same tool call.

    Returns True if a stall nudge should be injected.
    """
    signature = f"{tool_name}:{json.dumps(tool_input, sort_keys=True)}"
    if signature == state.last_tool_signature:
        state.stall_count += 1
    else:
        state.stall_count = 0
        state.last_tool_signature = signature

    return state.stall_count >= _STALL_THRESHOLD


# ── Verbose logging ───────────────────────────────────────────────────

def _log_tool_call(tool_name: str, tool_input: dict, state: LoopState) -> None:
    """Log a tool call with context-appropriate detail."""
    n, e = state.nodes_added, state.edges_added
    if tool_name == "read_source_file":
        logger.info(
            "  [%s] %s(%s) [nodes=%d edges=%d]",
            state.phase, tool_name, tool_input.get("path", ""), n, e,
        )
    elif tool_name in (
        "add_program_node", "add_file_node",
        "add_copybook_node", "add_job_node", "add_screen_node",
    ):
        logger.info(
            "  [%s] %s(id=%s) [nodes=%d edges=%d]",
            state.phase, tool_name, tool_input.get("id", ""), n, e,
        )
    elif tool_name == "add_edge":
        logger.info(
            "  [%s] %s(%s -[%s]-> %s) [nodes=%d edges=%d]",
            state.phase, tool_name,
            tool_input.get("source", ""),
            tool_input.get("type", ""),
            tool_input.get("target", ""),
            n, e,
        )
    elif tool_name == "finalize_graph":
        logger.info(
            "  [%s] finalize_graph [nodes=%d edges=%d]",
            state.phase, n, e,
        )
    else:
        logger.info(
            "  [%s] %s [nodes=%d edges=%d]",
            state.phase, tool_name, n, e,
        )


# ── Main agentic loop ────────────────────────────────────────────────

def run_agent(
    fetcher: SourceFetcher,
    *,
    repo_label: str = "",
    verbose: bool = False,
    on_progress: ProgressCallback = None,
) -> tuple[GraphData, str]:
    """Run the agentic analysis loop.

    Args:
        fetcher: Source fetcher providing file listing and content.
        repo_label: Label for the repository (used in metadata).
        verbose: Enable detailed logging of each tool call.
        on_progress: Optional callback invoked after each iteration
                     with the current LoopState.

    Returns:
        (graph_data, summary) — the enriched graph and Claude's summary.

    Raises:
        RuntimeError: If the API key is missing or API calls fail
                      after exhausting retries.
    """
    api_key = get_api_key()
    model = get_model()
    max_iterations = get_max_iterations()
    context_window = _MODEL_CONTEXT_WINDOWS.get(model, _DEFAULT_CONTEXT_WINDOW)

    client = anthropic.Anthropic(api_key=api_key)
    builder = GraphBuilder()
    dispatcher = ToolDispatcher(fetcher, builder)
    state = LoopState()

    messages: list[dict] = [
        {
            "role": "user",
            "content": (
                f"Analyze the mainframe codebase"
                f"{f' from {repo_label}' if repo_label else ''}. "
                "Start by listing all source files, then read and analyze each one. "
                "Read JCL files first to understand job structure and DISP parameters, "
                "then COBOL programs, then copybooks and BMS maps. "
                "Add every program, file, copybook, job, and screen node you find. "
                "Add every relationship (read, write, update, delete, call, copy, "
                "job_step, screen_send, screen_receive, cics_link, cics_xctl). "
                "When done, call finalize_graph with a summary."
            ),
        }
    ]

    while state.iteration < max_iterations:
        state.iteration += 1

        if verbose:
            logger.info(
                "--- Iteration %d / %d [phase=%s, nodes=%d, edges=%d, "
                "tokens=%d] ---",
                state.iteration, max_iterations, state.phase,
                len(builder.nodes), len(builder.edges),
                state.token_usage.total,
            )

        # Prune context if approaching budget limits
        messages = _prune_context(messages, context_window)

        # Call the API with retry logic
        response = _api_call_with_retry(
            client,
            model=model,
            max_tokens=16384,
            system=SYSTEM_PROMPT,
            tools=TOOL_DEFINITIONS,
            messages=messages,
            token_usage=state.token_usage,
        )

        # ── Handle end_turn (Claude finished without tool_use) ────
        if response.stop_reason == "end_turn":
            text_parts = [
                block.text
                for block in response.content
                if block.type == "text"
            ]
            if not dispatcher.finalized:
                dispatcher.summary = " ".join(text_parts) if text_parts else ""
                logger.info(
                    "Agent ended without finalize_graph at iteration %d",
                    state.iteration,
                )
            break

        if response.stop_reason != "tool_use":
            logger.warning(
                "Unexpected stop_reason=%s at iteration %d",
                response.stop_reason, state.iteration,
            )
            break

        # ── Process tool calls ────────────────────────────────────
        assistant_content = response.content
        tool_results = []
        stall_detected = False

        for block in assistant_content:
            if block.type != "tool_use":
                continue

            tool_name = block.name
            tool_input = block.input

            # Phase and stall detection
            state.phase = _detect_phase(tool_name, tool_input, state)
            if _check_stall(tool_name, tool_input, state):
                stall_detected = True

            if verbose:
                _log_tool_call(tool_name, tool_input, state)

            # Dispatch the tool call
            result_str = dispatcher.dispatch(tool_name, tool_input)

            # Track state changes
            state.nodes_added = len(builder.nodes)
            state.edges_added = len(builder.edges)

            if tool_name == "read_source_file":
                state.files_read.add(tool_input.get("path", ""))
            elif tool_name == "list_source_files":
                try:
                    listing = json.loads(result_str)
                    state.files_total = listing.get("total_files", 0)
                except (json.JSONDecodeError, TypeError):
                    pass

            # Check for tool errors in the result
            try:
                result_data = json.loads(result_str)
                if "error" in result_data:
                    state.errors.append({
                        "tool": tool_name,
                        "error": result_data["error"],
                        "iteration": state.iteration,
                    })
                    logger.warning(
                        "Tool %s returned error: %s",
                        tool_name, result_data["error"],
                    )
            except (json.JSONDecodeError, TypeError):
                pass

            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": result_str,
            })

        # Append assistant message and tool results to conversation
        messages.append({"role": "assistant", "content": assistant_content})
        messages.append({"role": "user", "content": tool_results})

        # ── Stall recovery ────────────────────────────────────────
        if stall_detected:
            logger.warning(
                "Stall detected at iteration %d — nudging agent",
                state.iteration,
            )
            nudge = (
                "You appear to be repeating the same tool call. "
                "Please proceed to the next step in your analysis. "
                f"Files read so far: {len(state.files_read)}/{state.files_total}. "
                f"Nodes: {state.nodes_added}, Edges: {state.edges_added}. "
                "If you have analyzed all files, call finalize_graph."
            )
            messages.append({"role": "user", "content": nudge})
            state.stall_count = 0

        # ── Coverage validation gate ──────────────────────────────
        if dispatcher.finalized:
            state.finalize_attempts += 1

            # Build a temporary graph to validate coverage
            temp_graph = builder.build(
                repo=repo_label, model=model, iterations=state.iteration,
            )
            gaps = validate_coverage(
                dispatcher.source_files, state.files_read, temp_graph,
            )
            state.coverage_gaps = gaps

            if not gaps or state.finalize_attempts >= _MAX_FINALIZE_ATTEMPTS:
                # Coverage complete or retries exhausted — accept
                if verbose:
                    if gaps:
                        logger.warning(
                            "Coverage incomplete after %d attempts, "
                            "accepting with %d gaps: %s",
                            state.finalize_attempts, len(gaps),
                            "; ".join(gaps[:5]),
                        )
                    else:
                        logger.info(
                            "Coverage validated at iteration %d "
                            "[nodes=%d, edges=%d, files=%d/%d, tokens=%d]",
                            state.iteration, state.nodes_added,
                            state.edges_added, len(state.files_read),
                            state.files_total, state.token_usage.total,
                        )
                break

            # Coverage gaps found — push Claude back into the loop
            dispatcher.finalized = False
            gap_msg = (
                "COVERAGE VALIDATION FAILED — the following source files "
                "have not been fully analyzed. You MUST read and analyze "
                "these files and add the corresponding nodes before "
                "calling finalize_graph again.\n\n"
                + "\n".join(f"- {g}" for g in gaps)
                + f"\n\nAttempt {state.finalize_attempts}/{_MAX_FINALIZE_ATTEMPTS}."
            )
            messages.append({"role": "user", "content": gap_msg})

            if verbose:
                logger.info(
                    "Coverage validation failed (attempt %d/%d), "
                    "%d gaps — re-entering loop",
                    state.finalize_attempts, _MAX_FINALIZE_ATTEMPTS,
                    len(gaps),
                )

        # ── Progress callback ─────────────────────────────────────
        if on_progress is not None:
            on_progress(state)

    # ── Post-loop warnings ────────────────────────────────────────────
    if state.iteration >= max_iterations and not dispatcher.finalized:
        logger.warning(
            "Reached max iterations (%d) without finalize_graph "
            "[nodes=%d, edges=%d, files=%d/%d]",
            max_iterations, state.nodes_added, state.edges_added,
            len(state.files_read), state.files_total,
        )

    if state.errors:
        logger.warning(
            "%d tool errors occurred during analysis", len(state.errors),
        )

    # ── Build and enrich the graph ────────────────────────────────────
    graph = builder.build(
        repo=repo_label,
        model=model,
        iterations=state.iteration,
    )
    report = enrich(graph)

    # Attach coverage info to the traversal report
    report.coverage_gaps = state.coverage_gaps
    report.coverage_complete = len(state.coverage_gaps) == 0
    report.finalize_attempts = state.finalize_attempts

    return graph, dispatcher.summary
