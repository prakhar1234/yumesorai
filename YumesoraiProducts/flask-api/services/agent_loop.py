"""Agent loop: transform -> build -> run -> compare -> fix.

Uses Anthropic prompt caching so the system prompt and COBOL source are
billed at the cache-read rate on fix iterations (90 % cheaper than a
fresh input token).

Flow
----
1. LLM generates a standalone modern program from the COBOL source.
2. The runner compiles / syntax-checks it.
3. If build fails -> feed errors to LLM, go to 1.
4. Run the program with the provided test input.
5. If runtime error -> feed errors to LLM, go to 1.
6. Compare stdout with expected output.
7. If mismatch -> feed diff to LLM, go to 1.
8. If match -> done!

The generator yields status dicts (NDJSON-safe) so the caller can stream
progress to the frontend.
"""
from __future__ import annotations

import difflib
import json
import logging
import os
import re
import shutil
import tempfile
import threading
import time
from typing import Generator

from config import Config
from services.code_runner import get_runner

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

AGENT_LOOP_SYSTEM_PROMPT = (
    "You are a senior mainframe modernization architect inside an automated "
    "verification loop.  Your job is to convert a COBOL program to a modern "
    "language so that the resulting program, when compiled and executed with "
    "the provided test input, produces exactly the expected output.\n\n"
    "CRITICAL RULES:\n"
    "1. The program MUST be standalone — no frameworks, no ORMs, no external "
    "dependencies.  Use ONLY the language's standard library.\n"
    "2. It MUST be compilable / runnable as a single source file.\n"
    "3. It reads from stdin and writes to stdout.\n"
    "4. Input format: one record per line, fields separated by '|'.\n"
    "5. Output format: one record per line, fields separated by '|'.\n"
    "6. Preserve ALL business logic, conditions, and calculations exactly.\n"
    "7. Handle end-of-input gracefully (EOF on stdin).\n\n"
    "Return ONLY a JSON object with these keys:\n"
    "{\n"
    '  "modern_source": "complete source code as a single string",\n'
    '  "notes": "brief explanation of approach"\n'
    "}\n\n"
    "No markdown fences, no commentary outside the JSON."
)

FIX_BUILD = (
    "The code you produced failed to compile.  Here are the errors:\n\n"
    "```\n{errors}\n```\n\n"
    "Fix the code and return the same JSON structure.  "
    "Remember: standalone, standard library only, reads stdin, writes stdout."
)

FIX_RUNTIME = (
    "The code compiled but crashed at runtime:\n\n"
    "```\n{errors}\n```\n\n"
    "Fix the code and return the same JSON structure."
)

FIX_OUTPUT = (
    "The code compiled and ran, but its output does not match the expected "
    "output.\n\n"
    "=== Expected (first 80 lines) ===\n```\n{expected}\n```\n\n"
    "=== Actual (first 80 lines) ===\n```\n{actual}\n```\n\n"
    "=== Unified diff (truncated) ===\n```\n{diff}\n```\n\n"
    "Fix the code so its stdout matches the expected output exactly.  "
    "Return the same JSON structure."
)


# ---------------------------------------------------------------------------
# Prompt-cache keep-alive
# ---------------------------------------------------------------------------

KEEPALIVE_INTERVAL = 240  # seconds — ping before the 5-min TTL expires


class _CacheKeeper:
    """Keep the Anthropic prompt cache alive during long build / run steps.

    Two complementary mechanisms:

    1. **Background timer** — a daemon thread fires every
       ``KEEPALIVE_INTERVAL`` seconds.  If no real LLM call has happened
       in that window it sends a tiny ``max_tokens=1`` request with the
       same cached prefix, refreshing the server-side TTL at negligible
       cost (cache-read price + 1 output token).

    2. **Synchronous ping** — ``ping_if_needed()`` can be called between
       steps (after build, after run) as a belt-and-suspenders check.

    Together they handle both the common case (build + run < 4 min) and
    the edge case where a single step (e.g. large dotnet build) exceeds
    the 5-minute cache TTL.
    """

    def __init__(self, client, model: str, system_blocks: list[dict]):
        self._client = client
        self._model = model
        self._system_blocks = system_blocks
        self._messages: list[dict] = []
        self._last_call = time.monotonic()
        self._timer: threading.Timer | None = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()

    # -- public API ----------------------------------------------------------

    def set_messages(self, messages: list[dict]):
        """Update the messages reference (call after appending fix turns)."""
        with self._lock:
            self._messages = messages

    def record_call(self):
        """Record that a real LLM call just completed (resets the clock)."""
        with self._lock:
            self._last_call = time.monotonic()

    def ping_if_needed(self):
        """Synchronous check — call between build/run steps."""
        with self._lock:
            if time.monotonic() - self._last_call >= KEEPALIVE_INTERVAL:
                self._do_ping()

    def start(self):
        """Start the background keep-alive timer."""
        self._stop_event.clear()
        self._schedule()

    def stop(self):
        """Cancel the background timer.  Safe to call multiple times."""
        self._stop_event.set()
        if self._timer:
            self._timer.cancel()

    # -- internals -----------------------------------------------------------

    def _schedule(self):
        if self._stop_event.is_set():
            return
        self._timer = threading.Timer(KEEPALIVE_INTERVAL, self._on_timer)
        self._timer.daemon = True
        self._timer.start()

    def _on_timer(self):
        if self._stop_event.is_set():
            return
        with self._lock:
            if time.monotonic() - self._last_call >= KEEPALIVE_INTERVAL:
                self._do_ping()
        self._schedule()

    def _do_ping(self):
        """Minimal API call to refresh the prompt-cache TTL."""
        msgs = self._messages or [{"role": "user", "content": "ping"}]
        try:
            self._client.messages.create(
                model=self._model,
                max_tokens=1,
                system=self._system_blocks,
                messages=msgs,
            )
            self._last_call = time.monotonic()
            logger.info("Prompt-cache keep-alive sent (TTL refreshed)")
        except Exception as exc:
            logger.warning("Prompt-cache keep-alive failed: %s", exc)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_llm_json(raw: str) -> dict:
    """Parse JSON from an LLM response, stripping markdown fences."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return json.loads(cleaned)


def _head(text: str, n: int = 80) -> str:
    """Return at most *n* lines of *text*."""
    lines = text.splitlines()
    if len(lines) <= n:
        return text
    return "\n".join(lines[:n]) + f"\n... ({len(lines) - n} more lines)"


def _unified_diff(expected: str, actual: str) -> str:
    exp_lines = expected.strip().splitlines(keepends=True)
    act_lines = actual.strip().splitlines(keepends=True)
    return "".join(
        difflib.unified_diff(exp_lines, act_lines, fromfile="expected", tofile="actual")
    )


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def run_transform_loop(
    cobol_source: str,
    target_lang: str,
    target_db: str,
    test_input: str,
    expected_output: str,
    file_path: str = "unknown",
    max_iterations: int = 5,
) -> Generator[dict, None, None]:
    """Run the transform-build-test-fix agent loop.

    Yields status dicts for every step.  The **last** yielded dict always
    has ``type="result"`` and carries ``success``, ``iterations``, and
    ``modern_source``.

    Prompt caching
    ~~~~~~~~~~~~~~
    The *system* blocks and the first *user* message (COBOL source + test
    data) are tagged with ``cache_control: {"type": "ephemeral"}``.
    On iteration 2+ Anthropic serves those blocks from its prefix cache,
    reducing input-token cost by ~90 %.
    """
    import anthropic

    api_key = getattr(Config, "ANTHROPIC_API_KEY", "")
    if not api_key:
        yield {"type": "error", "message": "ANTHROPIC_API_KEY is not configured"}
        return

    client = anthropic.Anthropic(api_key=api_key)
    model = getattr(Config, "ANTHROPIC_MODEL", "claude-sonnet-4-6")

    # Resolve runner
    runner_lang = target_lang if target_lang != "microservices" else "java"
    try:
        runner = get_runner(runner_lang)
    except ValueError as exc:
        yield {"type": "error", "message": str(exc)}
        return

    lang_labels = {
        "java": "Java", "csharp": "C#", "python": "Python",
        "microservices": "Java (microservices)",
    }
    lang_label = lang_labels.get(target_lang, target_lang)

    # ------------------------------------------------------------------
    # Build the CACHED portions of the prompt
    # ------------------------------------------------------------------
    system_blocks: list[dict] = [
        {
            "type": "text",
            "text": AGENT_LOOP_SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},
        }
    ]

    initial_user_text = (
        f"Target Language: {lang_label}\n"
        f"File: {file_path}\n\n"
        f"=== COBOL Source ===\n```cobol\n{cobol_source}\n```\n\n"
        f"=== Test Input (stdin) ===\n```\n{test_input}\n```\n\n"
        f"=== Expected Output (stdout) ===\n```\n{expected_output}\n```\n\n"
        f"Transform the COBOL program into a standalone {lang_label} program "
        "that reads the test input from stdin and writes the expected output "
        "to stdout."
    )

    messages: list[dict] = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": initial_user_text,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
        }
    ]

    # ------------------------------------------------------------------
    # Cache keep-alive — prevents 5-min TTL expiry during long steps
    # ------------------------------------------------------------------
    keeper = _CacheKeeper(client, model, system_blocks)
    keeper.set_messages(messages)
    keeper.start()

    # ------------------------------------------------------------------
    # Iteration loop
    # ------------------------------------------------------------------
    for iteration in range(1, max_iterations + 1):
        yield {
            "type": "iteration_start",
            "iteration": iteration,
            "max_iterations": max_iterations,
        }

        # --- 1. LLM call ------------------------------------------------
        step = "transforming" if iteration == 1 else "fixing"
        yield {"type": "status", "iteration": iteration, "step": step,
               "message": f"{'Generating' if iteration == 1 else 'LLM fixing'} {lang_label} code..."}

        try:
            collected: list[str] = []
            with client.messages.stream(
                model=model,
                max_tokens=16384,
                system=system_blocks,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    collected.append(text)
            raw = "".join(collected).strip()
            keeper.record_call()

            parsed = _parse_llm_json(raw)
            modern_source: str = parsed.get("modern_source", "")
            notes: str = parsed.get("notes", "")
            if not modern_source:
                keeper.stop()
                yield {"type": "error", "iteration": iteration,
                       "message": "LLM returned empty modern_source"}
                return

        except json.JSONDecodeError as exc:
            keeper.stop()
            yield {"type": "error", "iteration": iteration,
                   "message": f"LLM returned invalid JSON: {exc}"}
            return
        except Exception as exc:
            keeper.stop()
            yield {"type": "error", "iteration": iteration,
                   "message": f"LLM call failed: {exc}"}
            return

        yield {"type": "status", "iteration": iteration, "step": "generated",
               "message": f"Code generated ({len(modern_source)} chars)", "notes": notes}

        # --- 2. Build ----------------------------------------------------
        yield {"type": "status", "iteration": iteration, "step": "building",
               "message": f"Building {lang_label} code..."}

        work_dir = tempfile.mkdtemp(prefix=f"xform_loop_{iteration}_")
        try:
            build = runner.build(modern_source, work_dir)
        except Exception as exc:
            build = _make_build_failed(str(exc))

        if not build.success:
            yield {"type": "status", "iteration": iteration, "step": "build_failed",
                   "message": "Build failed", "errors": build.errors[:4000]}
            if iteration == max_iterations:
                keeper.stop()
                yield _final(False, iteration, "build_failed", modern_source,
                             errors=build.errors)
                _cleanup(work_dir)
                return
            messages = _append_fix(messages, raw, FIX_BUILD.format(errors=build.errors[:3000]))
            keeper.set_messages(messages)
            _cleanup(work_dir)
            continue

        yield {"type": "status", "iteration": iteration, "step": "built",
               "message": "Build succeeded"}

        keeper.ping_if_needed()

        # --- 3. Run ------------------------------------------------------
        yield {"type": "status", "iteration": iteration, "step": "running",
               "message": "Running with test input..."}

        try:
            run = runner.run(work_dir, test_input)
        except Exception as exc:
            run = _make_run_failed(str(exc))

        if not run.success:
            yield {"type": "status", "iteration": iteration, "step": "run_failed",
                   "message": "Runtime error", "errors": run.stderr[:4000]}
            if iteration == max_iterations:
                keeper.stop()
                yield _final(False, iteration, "runtime_error", modern_source,
                             errors=run.stderr)
                _cleanup(work_dir)
                return
            messages = _append_fix(messages, raw, FIX_RUNTIME.format(errors=run.stderr[:3000]))
            keeper.set_messages(messages)
            _cleanup(work_dir)
            continue

        yield {"type": "status", "iteration": iteration, "step": "ran",
               "message": "Execution completed"}

        keeper.ping_if_needed()

        # --- 4. Compare --------------------------------------------------
        yield {"type": "status", "iteration": iteration, "step": "comparing",
               "message": "Comparing output..."}

        actual = run.stdout.strip()
        expected = expected_output.strip()

        if actual == expected:
            keeper.stop()
            yield {"type": "status", "iteration": iteration, "step": "match",
                   "message": "Output matches expected!"}
            yield _final(True, iteration, "match", modern_source,
                         actual_output=actual)
            _cleanup(work_dir)
            return

        diff = _unified_diff(expected, actual)
        yield {"type": "status", "iteration": iteration, "step": "mismatch",
               "message": "Output mismatch",
               "diff": _head(diff, 40), "actual_output": _head(actual, 30)}

        if iteration == max_iterations:
            keeper.stop()
            yield _final(False, iteration, "output_mismatch", modern_source,
                         diff=diff, actual_output=actual)
            _cleanup(work_dir)
            return

        messages = _append_fix(messages, raw, FIX_OUTPUT.format(
            expected=_head(expected, 80),
            actual=_head(actual, 80),
            diff=_head(diff, 60),
        ))
        keeper.set_messages(messages)
        _cleanup(work_dir)

    # Should not be reached, but safety net
    keeper.stop()
    yield _final(False, max_iterations, "max_iterations", "")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _append_fix(messages: list[dict], assistant_raw: str, fix_text: str) -> list[dict]:
    """Append the assistant turn and a user fix request to the conversation."""
    return messages + [
        {"role": "assistant", "content": assistant_raw},
        {"role": "user", "content": fix_text},
    ]


def _final(success: bool, iterations: int, reason: str,
           modern_source: str, **extra) -> dict:
    return {
        "type": "result",
        "success": success,
        "iterations": iterations,
        "reason": reason,
        "modern_source": modern_source,
        **extra,
    }


def _cleanup(work_dir: str) -> None:
    try:
        shutil.rmtree(work_dir, ignore_errors=True)
    except Exception:
        pass


def _make_build_failed(msg: str):
    from services.code_runner import BuildResult
    return BuildResult(False, errors=msg)


def _make_run_failed(msg: str):
    from services.code_runner import RunResult
    return RunResult(False, stderr=msg)
