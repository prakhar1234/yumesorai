# Demystifier Graph DFS Validation Pipeline

**Summary:** Static-first COBOL dependency graph pipeline with LLM correction loop. Runs static analysis first, evaluates against a 100% file coverage gate, then uses OpenAI GPT-5.6-SOL in a correction loop to fix gaps, followed by a static evolution loop that teaches the static parser what the LLM found.

---

## Overview — Static-First Pipeline (v2)

```
                         Repo URL
                            |
                            v
                   ┌────────────────┐
                   │  [1] FETCH     │
                   │  Sources +     │
                   │  File Manifest │
                   └───────┬────────┘
                           |
                           v
                   ┌────────────────┐
                   │  [2] STATIC    │
                   │  Analysis      │
                   │  (regex parse) │
                   └───────┬────────┘
                           |
                           v
              ┌────────────────────────┐
              │  [3] EVALUATE          │
              │  Edge validation       │
              │  + DFS traversal       │
              │  + Completeness check  │
              │  + File reconciliation │
              └────────────┬───────────┘
                           |
                           v
              ┌────────────────────────┐
              │  [4] EVAL GATE         │
              │  100% file coverage?   │
              └────┬──────────┬────────┘
                   |          |
              YES  |          |  NO
                   |          |
                   v          v
            ┌──────────┐  ┌──────────────────────────────┐
            │  DONE    │  │  [5] LLM CORRECTION LOOP     │
            │  Output  │  │  (OpenAI GPT-5.6-SOL)             │
            │  graph   │  │                              │
            └──────────┘  │  ┌─────────────────────────┐ │
                          │  │ Build correction prompt  │ │
                          │  │ (graph + failures +      │ │
                          │  │  missing file sources)   │ │
                          │  └───────────┬─────────────┘ │
                          │              |               │
                          │              v               │
                          │  ┌─────────────────────────┐ │
                          │  │ LLM returns corrected   │ │
                          │  │ graph JSON               │ │
                          │  └───────────┬─────────────┘ │
                          │              |               │
                          │              v               │
                          │  ┌─────────────────────────┐ │
                          │  │ Merge corrections +     │ │
                          │  │ Re-evaluate             │ │
                          │  └───────────┬─────────────┘ │
                          │              |               │
                          │         100%? / max iter?    │
                          │           |          |       │
                          │       YES |      NO  |       │
                          │           |    (loop) ───────┘
                          │           |
                          └───────────┘
                                      |
                                      v
                   ┌──────────────────────────────────┐
                   │  [6] STATIC EVOLUTION LOOP       │
                   │                                  │
                   │  ┌────────────────────────────┐  │
                   │  │ Diff static vs LLM graph   │  │
                   │  │ Identify gaps (nodes/edges │  │
                   │  │ LLM found, static missed)  │  │
                   │  └────────────┬───────────────┘  │
                   │               |                  │
                   │               v                  │
                   │  ┌────────────────────────────┐  │
                   │  │ Re-run static analysis     │  │
                   │  │ with LLM hints merged in   │  │
                   │  └────────────┬───────────────┘  │
                   │               |                  │
                   │               v                  │
                   │  ┌────────────────────────────┐  │
                   │  │ Re-evaluate coverage       │  │
                   │  └────────────┬───────────────┘  │
                   │               |                  │
                   │     converged? / stalled?        │
                   │        |            |            │
                   │    YES |        NO  |            │
                   │        |      (loop) ────────────┘
                   │        |
                   └────────┘
                            |
                            v
                   ┌────────────────┐
                   │  [7] REPORT    │
                   │  + Persist     │
                   │  Final graph   │
                   └────────────────┘
```

## Mode Behavior

```
 mode="static"          mode="auto"              mode="llm"
 ──────────────         ───────────              ──────────
 [1] Fetch              [1] Fetch                [1] Fetch
       |                      |                        |
 [2] Static             [2] Static               [2] OpenAI LLM
       |                      |                    (full analysis)
 [3] Evaluate           [3] Evaluate                   |
       |                      |                  [3] Evaluate
 [4] Gate               [4] Gate ──NO──┐               |
   (report gaps,          |            |         [7] Report
    no LLM)          YES──┘      [5] LLM Loop
       |                |        (OpenAI GPT-5.6-SOL)
 [7] Report        [7] Report         |
                                 [6] Static
                                  Evolution
                                       |
                                 [7] Report
```

---

## Stage 1: Ingest

**Agent role:** File Fetcher

**Input:**
- `repo_url` — GitHub repository URL

**Actions:**
1. Call `github_files.list_repo_files(repo_url)` to get the full list of COBOL-related files in the repo (`.cbl`, `.cob`, `.cpy`, `.jcl`, `.bms`).
2. Call `github_files.fetch_repo_sources(repo_url)` to download the raw source content (respecting the 300K char limit).
3. Store the **repo file manifest** — the canonical list of every file path in the repo. This is the ground truth for Stage 6.

**Output:**
- `sources[]` — list of `{path, name, ext, type, content}`
- `repo_file_manifest[]` — list of `{path, name, ext, type}` (no content, just metadata)

**Error handling:**
- If GitHub API returns 404 or rate-limited, retry 3 times with exponential backoff.
- If total source exceeds `MAX_SOURCE_CHARS` (300K), log a warning and truncate by dropping the largest files last.

---

## Stage 2: Static Analysis (Primary)

**Agent role:** Static Analyzer

**Input:**
- `sources[]` from Stage 1

**Actions:**
1. Run `cobol_graph_builder.build_graph_from_sources(sources, repo_url)` to produce a regex-based graph.
2. This is the **primary** graph — static analysis always runs first.

**Output:**
- `static_graph: GraphData` — the initial statically-parsed graph

---

## Stage 3: Evaluate Graph

**Agent role:** Evaluator

**Input:**
- `static_graph` from Stage 2
- `sources[]` and `repo_file_manifest` from Stage 1

**Actions (all sub-stages run in sequence):**

1. **Edge validation** — verify each edge against source syntax (`edge_validation.validate_graph`), prune invalid LLM-only edges.
2. **DFS traversal** — iterative DFS from entry points (JCL jobs + programs with fanIn=0).
3. **Completeness check** — deterministic gate: all nodes visited? Recovery loop for disconnected components.
4. **File reconciliation** — diff DFS file list vs repo manifest, compute `coverage_pct`.

**Output:**
- `eval_result` with `passed: bool` (True only if `coverage_pct == 100.0`), plus all sub-stage results.

---

## Stage 4: Eval Gate (100% File Coverage)

**Decision point:** If `eval_result.passed == True`, skip to Stage 7. Otherwise:

| Mode | Action |
|------|--------|
| `static` | Report coverage gaps, do NOT enter LLM loop |
| `auto` | Enter Stage 5 (LLM correction loop) |
| `llm` | N/A (uses legacy LLM-only path) |

---

## Stage 5: LLM Correction Loop (OpenAI GPT-5.6-SOL)

**Agent role:** LLM Corrector (OpenAI provider, `gpt-4o` model)

**Input:**
- Current graph + eval failures + source code of missing files

**Actions (up to `max_llm_iterations`, default 3):**

1. **Build correction prompt** (`prompt_builder.build_correction_prompt`):
   - Current graph node/edge summary
   - List of each repo file NOT in the graph, with full source code
   - List of invalid edges
   - Instructions to return a corrected full graph JSON
2. Send to OpenAI GPT-5.6-SOL via `openai_provider.py`
3. **Merge** LLM corrections into the current graph (`merge_graphs` + `recompute_graph_metrics`)
4. **Re-evaluate** — run full eval (edge validation + DFS + completeness + reconciliation)
5. If `coverage_pct == 100.0` → break; else loop

**Output:**
- `corrected_graph` — the graph after LLM corrections
- `llm_correction_log[]` — per-iteration coverage, node/edge counts

**Key design:** The LLM does NOT re-analyze from scratch. It receives the current graph + specific failures and returns a corrected graph. This is cheaper and more targeted.

---

## Stage 6: Static Evolution Loop

**Agent role:** Static Evolver

**Input:**
- `static_graph` from Stage 2
- `corrected_graph` (LLM-corrected) from Stage 5

**Actions (up to `max_static_iterations`, default 5):**

1. **Diff** static graph vs LLM-corrected graph (`_identify_static_gaps`):
   - Nodes the LLM found that static missed
   - Edges between existing static nodes that static missed
2. **Re-run** static analysis with LLM-found nodes merged as forced additions
3. **Re-evaluate** coverage
4. If coverage matches LLM or stalls → break; else loop

**Output:**
- `evolved_graph` — the static graph augmented with LLM discoveries
- `static_evolution_log[]` — per-iteration gaps, coverage

**Purpose:** Over time, this loop teaches the static pipeline what the LLM found, reducing future LLM dependency.

---

## Stage 5: DFS Traversal

**Agent role:** Graph Walker

**Input:**
- `validated_graph` from Stage 4

**Actions:**
1. Build adjacency lists from the edge list:
   ```python
   adj_out = defaultdict(list)  # node -> [outgoing targets]
   adj_in  = defaultdict(list)  # node -> [incoming sources]
   for edge in validated_graph["edges"]:
       adj_out[edge["source"]].append(edge["target"])
       adj_in[edge["target"]].append(edge["source"])
   ```

2. Identify entry points — nodes that are natural DFS roots:
   - All `job` type nodes (JCL jobs are top-level entry points).
   - All `program` nodes with `fanIn == 0` (never called by anything else).
   - If no entry points found, use all nodes as roots (disconnected graph).

3. Run DFS from each entry point, collecting all reachable nodes:
   ```python
   def dfs(node_id, adj_out, visited):
       visited.add(node_id)
       for neighbor in adj_out.get(node_id, []):
           if neighbor not in visited:
               dfs(neighbor, adj_out, visited)
       return visited

   all_reachable = set()
   for entry in entry_points:
       dfs(entry, adj_out, all_reachable)
   ```

4. Also run reverse DFS (using `adj_in`) to find upstream dependencies from leaf nodes — catches files that are only referenced indirectly.

5. Produce a **DFS file list** — every node reachable by DFS, mapped back to its original file path.

6. Identify **unreachable nodes** — nodes in the graph that no DFS traversal visited (disconnected components).

**Output:**
- `dfs_file_list[]` — list of `{node_id, label, type, file_path, reached_from}` for every node reachable from entry points
- `unreachable_nodes[]` — nodes in the graph not reached by any DFS
- `traversal_tree` — the full DFS tree structure (parent-child relationships) for visualization

---

## Stage 5b: Completeness Check (Deterministic Gate)

**Agent role:** Completeness Verifier

This is the deterministic gate that makes the pipeline provably correct. It answers one question with a boolean: **were all graph nodes visited by DFS?** If not, it forces corrective action before the pipeline can proceed.

**Input:**
- `validated_graph` from Stage 4 (the full node set)
- `all_reachable` from Stage 5 (the DFS visited set)
- `entry_points` from Stage 5

**Actions:**

#### 5b-1. Node coverage assertion

```python
def check_completeness(validated_graph, all_reachable):
    """
    Deterministic check: returns True only if every node in the graph
    was visited by DFS. No probabilistic logic, no thresholds.
    """
    all_node_ids = {node["id"] for node in validated_graph["nodes"]}
    visited_ids  = set(all_reachable)

    missed = all_node_ids - visited_ids
    extra  = visited_ids - all_node_ids  # should never happen; sanity check

    return {
        "complete": len(missed) == 0 and len(extra) == 0,
        "total_nodes": len(all_node_ids),
        "visited_nodes": len(visited_ids),
        "missed_nodes": sorted(missed),
        "extra_nodes": sorted(extra),      # indicates a bug if non-empty
        "coverage_ratio": len(visited_ids) / len(all_node_ids) if all_node_ids else 1.0
    }
```

#### 5b-2. Decision logic

| Result | Action |
|--------|--------|
| `complete == True` | All nodes traversed. Proceed to Stage 6. |
| `complete == False` and missed nodes exist | Enter the **recovery loop** (5b-3). |
| `extra_nodes` is non-empty | Bug in the pipeline — a visited node ID doesn't exist in the graph. Halt and report. |

#### 5b-3. Recovery loop for missed nodes

When DFS misses nodes, it means they belong to disconnected components. The recovery loop deterministically resolves this:

```python
def recover_missed_nodes(missed_nodes, adj_out, adj_in, all_reachable):
    """
    Iteratively pick missed nodes as new DFS roots until every
    node has been visited. Guaranteed to terminate because each
    iteration visits at least one new node.
    """
    iteration = 0
    disconnected_components = []

    while missed_nodes:
        iteration += 1
        # Pick the first missed node as a new root
        new_root = missed_nodes.pop()

        # DFS forward from this root
        component = set()
        stack = [new_root]
        while stack:
            node = stack.pop()
            if node not in all_reachable:
                all_reachable.add(node)
                component.add(node)
                stack.extend(n for n in adj_out.get(node, []) if n not in all_reachable)
                stack.extend(n for n in adj_in.get(node, []) if n not in all_reachable)

        # Remove newly visited nodes from the missed set
        missed_nodes -= component

        disconnected_components.append({
            "root": new_root,
            "nodes": sorted(component),
            "size": len(component)
        })

    return {
        "iterations": iteration,
        "components": disconnected_components,
        "all_visited": True  # guaranteed — loop exits only when missed is empty
    }
```

**Termination guarantee:** Each iteration visits at least one node (`new_root`), and `missed_nodes` shrinks monotonically. The loop terminates in at most `N` iterations where `N` is the number of missed nodes.

#### 5b-4. Post-recovery re-check

After recovery, run `check_completeness()` again. This is a **hard assertion** — if it still fails, the pipeline halts with an error (indicates a bug in adjacency construction or node ID mismatch).

```python
result = check_completeness(validated_graph, all_reachable)
assert result["complete"], f"BUG: completeness check failed after recovery. Extra: {result['extra_nodes']}"
```

#### 5b-5. Annotate traversal results

After the completeness check passes, tag each node with how it was reached:

```python
for node in validated_graph["nodes"]:
    node_id = node["id"]
    if node_id in primary_reachable:        # reached from original entry points
        node["traversal"] = "primary"
    elif node_id in recovery_reachable:     # reached during recovery loop
        node["traversal"] = "disconnected"
        node["component_root"] = component_root_map[node_id]
```

**Output:**
- `completeness_result` — the check_completeness() output (must have `complete == True`)
- `disconnected_components[]` — list of components found during recovery, each with root and member nodes
- Updated `all_reachable` — now guaranteed to equal the full node set
- Updated `dfs_file_list[]` — now includes nodes from disconnected components, tagged with `traversal: "disconnected"`

**Invariant:** After Stage 5b, `len(all_reachable) == len(validated_graph["nodes"])`. This is asserted, not assumed.

---

## Stage 6: File Reconciliation

**Agent role:** Reconciler

**Input:**
- `dfs_file_list[]` from Stage 5
- `repo_file_manifest[]` from Stage 1
- `validated_graph` from Stage 4

**Actions:**

Compare the DFS-discovered files against the actual repo files:

#### 6a. Normalize for comparison
- Strip extensions and normalize case for matching (e.g., `src/ACCT0010.cbl` matches node `ACCT0010`).
- Handle path-prefixed IDs (e.g., `SRC/ACCT0010` maps to `src/ACCT0010.cbl`).

#### 6b. Compute sets

| Set | Definition |
|-----|-----------|
| **Matched** | Files in repo manifest that have a corresponding node in the DFS file list. |
| **In graph, not in repo** | Nodes found by DFS that don't match any file in the repo. These are likely external references (e.g., CICS system programs, DB2 tables, external copybooks). |
| **In repo, not in graph** | Files in the repo manifest that no graph node references. These are **coverage gaps** — files the Demystifier didn't pick up. |
| **Disconnected components** | Nodes not reachable from primary entry points, recovered during Stage 5b. These exist in the graph but required the completeness check to discover them. Tagged with `traversal: "disconnected"`. |

#### 6c. Classify gaps
For each file in "in repo, not in graph":
- Check if it was in `sources[]` (was it downloaded and analyzed?).
- If yes: the parser missed it — flag as `parser_gap`.
- If no: it was truncated during ingestion — flag as `ingestion_gap`.

**Output:**
- `reconciliation_report`:
  ```
  {
    matched: [{repo_path, node_id, type}],
    graph_only: [{node_id, label, type, reason}],       // external refs, system programs
    repo_only: [{repo_path, gap_type}],                  // parser_gap or ingestion_gap
    disconnected: [{node_id, label, type, component_root}],  // recovered by completeness check
    coverage_pct: float,                                   // matched / total repo files * 100
    graph_coverage_pct: float                              // matched / total graph nodes * 100
    traversal_complete: true                               // always true — enforced by Stage 5b
  }
  ```

---

## Stage 7: Report

**Agent role:** Reporter

**Input:**
- All outputs from Stages 2–6

**Actions:**
1. Generate a structured report:

```
=== Demystifier Graph DFS Validation Report ===

Repository: {repo_url}
Analyzed at: {timestamp}

--- Graph Summary ---
  Nodes: {nodeCount}  (programs: X, copybooks: Y, tables: Z, jobs: J, screens: S)
  Edges: {edgeCount}  (call: A, copy: B, data: C, job: D, screen: E)
  Entry points: {N}

--- Pipeline Comparison ---
  LLM-only nodes added:    {count} ({removed} removed after validation)
  Static-only nodes added:  {count}
  LLM-only edges added:     {count} ({removed} removed after validation)
  Static-only edges added:  {count}

--- DFS Traversal ---
  Reachable from entry points:  {primary_count}
  Disconnected components:      {component_count}  (recovered via completeness check)
  Total nodes visited:          {total}  (must equal graph node count)
  Completeness check:           PASS

--- File Reconciliation ---
  Repo files:             {total}
  Matched in graph:       {matched}  ({coverage_pct}%)
  In repo, not in graph:  {repo_only}
    - Parser gaps:        {parser_gap_count}  [list files]
    - Ingestion gaps:     {ingestion_gap_count}  [list files]
  In graph, not in repo:  {graph_only}  (external references)

--- Validation ---
  Edges validated:  {valid_count}
  Edges removed:    {removed_count}  [list with reasons]
```

2. Save the report alongside the analysis in `flask-api/data/analyses/{id}_dfs_report.json`.
3. Return the report to the caller.

**Error handling:**
- If any upstream stage produced partial results, the report should clearly mark which sections are incomplete and why.

---

## Pipeline Evolution Model — Static-First

The pipeline is now **static-first** — the LLM is a correction mechanism, not the primary analyzer:

```
    Static Pipeline (primary)         OpenAI LLM (correction)
   ┌──────────────────────┐         ┌───────────────────────┐
   │  Regex Parser         │         │  GPT-5.6-SOL               │
   │  builds initial       │─eval──> │  receives failures    │
   │  graph from source    │  fails  │  + missing file src   │
   └──────────────────────┘         │  returns corrections  │
          │                          └───────────┬───────────┘
          │                                      │
          │  ┌───────────────────────────────────┘
          │  │  merge corrections
          v  v
   ┌──────────────────────┐
   │  Static Evolution    │
   │  learns from LLM     │
   │  corrections         │
   └──────────────────────┘
```

**Convergence model:**
1. **Static runs first** — deterministic, fast, free.
2. **LLM corrects gaps** — targeted prompts with specific failures, not full re-analysis.
3. **Static evolves** — absorbs what the LLM found by merging corrections back.
4. **Over time**, the static parser covers more patterns, the LLM correction loop shrinks, and the pipeline converges faster.

---

## Tool / API Dependencies

| Dependency | Used in | Purpose |
|-----------|---------|---------|
| GitHub API | Stage 1 | `GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1` |
| GitHub Raw | Stage 1 | `GET raw.githubusercontent.com/{owner}/{repo}/HEAD/{path}` |
| OpenAI GPT-5.6-SOL API | Stage 5 | LLM correction loop (default provider) |
| `cobol_graph_builder.py` | Stage 2, 6 | Regex-based static analysis |
| `edge_validation.py` | Stage 3 | Source-level edge verification |
| `dfs_traversal.py` | Stage 3 | DFS traversal, completeness, reconciliation |
| `graph_merge.py` | Stage 5, 6 | Merge LLM corrections into static graph |
| `prompt_builder.py` | Stage 5 | Build correction prompts for LLM |
| `storage.py` | Stage 7 | Persist results to disk |

---

## Retry / Error Strategy

| Stage | Failure | Retry | Fallback |
|-------|---------|-------|----------|
| 1 - Fetch | GitHub API down | 3 retries, exponential backoff | Fail — cannot proceed without source |
| 2 - Static | Regex crash on malformed COBOL | Catch per-file, skip bad files | Partial graph (log skipped files) |
| 3 - Evaluate | Source map incomplete | Skip validation for missing files | Mark edges as `unverified` |
| 4 - Gate | N/A | N/A | Pure decision, no failure mode |
| 5 - LLM Correction | OpenAI timeout / bad JSON / API error | Log error, stop loop early | Return best-effort graph from previous iteration |
| 6 - Static Evolution | No actionable hints / coverage stalls | Stop loop | Keep LLM-corrected graph as final output |
| 7 - Report | Storage write fails | Retry once | Return report in-memory, skip persistence |
