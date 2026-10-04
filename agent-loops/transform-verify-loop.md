# Transform-Verify Agent Loop

Automated COBOL-to-modern-language transformation with build/run verification and self-healing via LLM fix iterations.

## Loop Stages

```
┌──────────────────────────────────────────────────────────┐
│  1. TRANSFORM  (LLM generates standalone modern code)    │
│       ↓                                                  │
│  2. BUILD      (javac / py_compile / dotnet build)       │
│       ↓ fail → feed errors to LLM → go to 1             │
│  3. RUN        (execute with test input via stdin)        │
│       ↓ fail → feed errors to LLM → go to 1             │
│  4. COMPARE    (diff actual stdout vs expected output)   │
│       ↓ mismatch → feed diff to LLM → go to 1           │
│  5. SUCCESS    (outputs match — loop ends)               │
└──────────────────────────────────────────────────────────┘
                Max iterations: 5 (configurable)
```

## Agent Roles

| Role | Description |
|------|-------------|
| **LLM (Claude)** | Generates initial code, receives error/diff feedback, produces fixes |
| **Code Runner** | Language-specific build & execution (Java, Python, C#) |
| **Comparator** | Unified diff between expected and actual stdout |
| **Orchestrator** | `agent_loop.py` — drives the loop, streams events |

## Input / Output per Stage

### Stage 1: Transform
- **Input**: COBOL source, target language, test input, expected output
- **Output**: JSON with `modern_source` and `notes`

### Stage 2: Build
- **Input**: Modern source code, temp work directory
- **Output**: `BuildResult(success, errors, output)`

### Stage 3: Run
- **Input**: Compiled code, test input string (stdin)
- **Output**: `RunResult(success, stdout, stderr, exit_code)`

### Stage 4: Compare
- **Input**: Actual stdout, expected stdout
- **Output**: Match (success) or unified diff (mismatch)

### Fix iteration (on failure)
- **Input**: Previous conversation + error/diff
- **Output**: Fixed `modern_source`

## Prompt Caching Strategy

Uses Anthropic prompt caching (`cache_control: {"type": "ephemeral"}`) on:

1. **System prompt** (~300 tokens) — cached after iteration 1
2. **Initial user message** (COBOL source + test data, potentially 10,000+ tokens) — cached after iteration 1

### Token savings per iteration

| Component | Iteration 1 | Iteration 2+ |
|-----------|-------------|--------------|
| System prompt | 1.25× (cache write) | 0.1× (cache read) |
| COBOL source + test data | 1.25× (cache write) | 0.1× (cache read) |
| Previous responses | Full price | Full price |
| Error feedback | Full price | Full price |

For a 10,000-token COBOL program over 5 iterations: ~70% savings on input tokens.

### Cache Keep-Alive (`_CacheKeeper`)

Anthropic's prompt cache has a **5-minute TTL** that resets on each hit. If a build or run step takes longer than 5 minutes the cache expires and the next LLM call pays the full cache-write cost again.

The `_CacheKeeper` class prevents this with two complementary mechanisms:

1. **Background timer** — a daemon thread fires every 240 seconds (4 min). If no real LLM call has happened in that window it sends a minimal `max_tokens=1` request with the same cached system + messages prefix, refreshing the TTL at negligible cost (cache-read price + 1 output token).

2. **Synchronous ping** — `ping_if_needed()` is called between steps (after build, after run). Covers the common case where no single step exceeds the interval but their combined time approaches the TTL.

```
LLM call  ──→  record_call()
  │
  ├──  build (may take minutes)
  │      └── background timer fires at 4 min if still running
  │
  ├──  ping_if_needed()   ← synchronous check after build
  │
  ├──  run (may take minutes)
  │      └── background timer fires at 4 min if still running
  │
  ├──  ping_if_needed()   ← synchronous check after run
  │
  └──  compare → next LLM call (record_call again)
```

The keeper is started before the first iteration and stopped at every exit point (success, failure, or error).

## Decision Points and Branching

- **Build failure**: Errors truncated to 3000 chars, sent as fix prompt
- **Runtime failure**: stderr truncated to 3000 chars, sent as fix prompt
- **Output mismatch**: Expected/actual heads (80 lines) + diff (60 lines) sent as fix prompt
- **Max iterations reached**: Returns last generated code with failure reason
- **LLM JSON parse error**: Hard stop (no recovery)
- **Missing language tools**: Hard stop with "tool not found" error

## Error Handling / Retry Strategy

- Each fix iteration appends to the conversation (maintains full context)
- Errors/diffs are truncated to avoid token limits
- Build/run timeouts: 30s for compile, 60s for execution
- LLM call: streaming with 16,384 max tokens
- Temp directories cleaned up after each iteration

## Tool / API Dependencies

- **Anthropic Claude API** — with streaming and prompt caching
- **javac / java** — for Java targets
- **python3** — for Python targets
- **dotnet CLI** — for C# targets
- **Flask** — streaming NDJSON response
- **Next.js** — proxy route forwarding the stream

## File Locations

| File | Purpose |
|------|---------|
| `flask-api/services/agent_loop.py` | Core loop engine with prompt caching |
| `flask-api/services/code_runner.py` | Build/run abstraction per language |
| `flask-api/routes/transform_loop.py` | POST `/api/transform/loop` (NDJSON stream) |
| `src/app/api/demystifier/transform/loop/route.ts` | Next.js proxy (10 min timeout) |
| `src/components/demystifier/XformWorkspace.tsx` | Frontend verification UI |
