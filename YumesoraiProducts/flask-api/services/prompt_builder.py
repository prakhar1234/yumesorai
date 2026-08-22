"""Prompt construction for COBOL repository analysis."""
from __future__ import annotations


def build_system_prompt() -> str:
    """Build the system prompt for COBOL repository analysis.

    Returns:
        A system prompt string instructing the LLM to analyze COBOL code
        and return a structured JSON knowledge graph.
    """
    return """You are an expert COBOL and mainframe systems analyst. Your task is to analyze \
COBOL repositories and produce a structured knowledge graph representing the system architecture.

You MUST respond with valid JSON only, no additional text or explanation. The JSON must conform \
to this exact schema:

{
  "nodes": [
    {
      "id": "string (unique identifier)",
      "label": "string (human-readable name)",
      "type": "program | copybook | table | job | screen",
      "domain": "string (domain id this node belongs to)",
      "risk": 0.0 to 1.0 (modification risk score),
      "dead": false (true if the code is unreachable/unused),
      "loc": 0 (lines of code),
      "fanIn": 0 (number of incoming dependencies),
      "fanOut": 0 (number of outgoing dependencies)
    }
  ],
  "edges": [
    {
      "source": "string (source node id)",
      "target": "string (target node id)",
      "type": "call | copy | data | job | screen"
    }
  ],
  "domains": [
    {
      "id": "string (unique domain identifier)",
      "name": "string (human-readable domain name)",
      "color": "string (hex color code)"
    }
  ],
  "metadata": {
    "repo": "string (repository identifier)",
    "nodeCount": 0,
    "edgeCount": 0,
    "analyzedAt": "ISO 8601 timestamp"
  }
}

Guidelines for analysis:
- Group related programs into logical business domains (e.g., "accounts", "reporting", "batch").
- Assign meaningful colors to each domain using hex codes.
- Calculate risk scores based on complexity, number of dependencies, and code patterns.
- Mark dead code where COBOL paragraphs, sections, or programs are never called.
- Count lines of code excluding blank lines and comments.
- Track CALL statements as "call" edges, COPY statements as "copy" edges, \
file/table access as "data" edges, JCL job references as "job" edges, \
and CICS screen maps as "screen" edges.
- Compute fanIn and fanOut for each node based on the edges."""


def build_user_prompt(
    repo_url: str,
    input_type: str,
    source_type: str = None,
    sources: list[dict] | None = None,
) -> str:
    """Build the user prompt for a specific repository analysis request.

    Args:
        repo_url: URL or path to the COBOL repository.
        input_type: One of "github", "server", or "local".
        source_type: Optional qualifier for the source type.
        sources: Optional list of dicts with keys ``path``, ``name``,
            ``type``, and ``content`` — the actual source code fetched
            from the repository.

    Returns:
        A user prompt string with the specific repository details.
    """
    source_info = ""
    if source_type:
        source_info = f"\nSource type: {source_type}"

    # Build the source-code section when real files are available
    source_section = ""
    if sources:
        file_blocks: list[str] = []
        for src in sources:
            file_blocks.append(
                f"--- FILE: {src['path']} (type: {src['type']}) ---\n"
                f"{src['content']}\n"
                f"--- END FILE ---"
            )
        source_section = (
            "\n\nBelow are the actual source files from the repository. "
            "Analyze these files to build an accurate knowledge graph. "
            "Extract all CALL statements, COPY statements, file/table accesses, "
            "JCL job steps, and CICS screen references from the real code.\n\n"
            + "\n\n".join(file_blocks)
        )

    return f"""Analyze the following COBOL repository and produce the knowledge graph JSON.

Repository: {repo_url}
Input type: {input_type}{source_info}

Examine all COBOL programs (.cbl, .cob), copybooks (.cpy), JCL files (.jcl), \
and any related artifacts. Identify all programs, copybooks, database tables, \
batch jobs, and screen definitions. Map all dependencies between them.

Return ONLY the JSON knowledge graph, no other text.{source_section}"""


def build_correction_prompt(
    graph: dict,
    eval_failures: dict,
    sources: list[dict],
    repo_file_manifest: dict,
) -> str:
    """Build a prompt for the LLM to fix a graph that failed evaluation.

    Includes the current graph summary, lists each repo file NOT in the graph
    with its full source code, lists invalid edges, and asks the LLM to return
    a corrected full graph JSON.

    Args:
        graph: The current graph dict with ``nodes`` and ``edges``.
        eval_failures: Output of ``_evaluate_graph()`` with reconciliation,
            validation, and completeness results.
        sources: List of source dicts from ``fetch_repo_sources()``.
        repo_file_manifest: Output of ``list_repo_files()`` with ``files`` list.

    Returns:
        A user prompt string for the LLM correction loop.
    """
    # Current graph summary
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])
    node_ids = {n["id"] for n in nodes}
    node_summary = ", ".join(sorted(n["id"] for n in nodes)[:30])
    if len(nodes) > 30:
        node_summary += f" ... ({len(nodes)} total)"

    # Missing files (repo_only from reconciliation)
    reconciliation = eval_failures.get("reconciliation", {})
    repo_only = reconciliation.get("repo_only", [])

    # Build source lookup by stem
    source_by_stem: dict[str, dict] = {}
    for src in sources:
        stem = src["name"].upper().split(".")[0]
        source_by_stem[stem] = src

    missing_file_blocks: list[str] = []
    for stem in repo_only:
        src = source_by_stem.get(stem)
        if src:
            missing_file_blocks.append(
                f"--- MISSING FILE: {src['path']} (type: {src['type']}) ---\n"
                f"{src['content']}\n"
                f"--- END FILE ---"
            )
        else:
            missing_file_blocks.append(
                f"--- MISSING FILE: {stem} (source not available) ---"
            )

    missing_section = ""
    if missing_file_blocks:
        missing_section = (
            "\n\n## Missing Files\n"
            "The following files exist in the repository but are NOT represented "
            "in the current graph. You MUST add a node for each of them.\n\n"
            "**CRITICAL — Node ID rule:** The node `id` for each missing file "
            "MUST be the EXACT uppercased file stem (filename without extension) "
            "as shown below. For example, if the file is `error-handling.cbl`, "
            "the node id MUST be `ERROR-HANDLING` (not `ERRORHANDLING`, not "
            "`ERRHNDL`, not any other variation). Hyphens, underscores, and "
            "casing must match the stem exactly (uppercased).\n\n"
            + "\n\n".join(missing_file_blocks)
        )

    # Build the required node ID table from the missing stems
    missing_id_table = ""
    if repo_only:
        rows = []
        for stem in repo_only:
            src = source_by_stem.get(stem)
            path = src["path"] if src else "unknown"
            rows.append(f"  - File: `{path}` → required node id: `{stem}`")
        missing_id_table = (
            "\n\n## Required Node IDs (MUST match exactly)\n"
            + "\n".join(rows)
        )

    # Full repo manifest for reference
    repo_files = repo_file_manifest.get("files", [])
    manifest_lines = [f"  - `{f['name'].upper()}` ({f['path']})" for f in repo_files]
    manifest_section = (
        "\n\n## Complete Repo File Manifest\n"
        "Every file below MUST have a corresponding node in the graph. "
        "The node `id` MUST be the uppercased stem shown here:\n"
        + "\n".join(manifest_lines)
    )

    # Invalid edges
    validation = eval_failures.get("validation", {})
    invalid_edges = validation.get("edge_validation", {}).get("invalid_edges", [])
    invalid_section = ""
    if invalid_edges:
        edge_lines = []
        for ie in invalid_edges[:20]:
            edge_lines.append(
                f"  - {ie['source']} --({ie['type']})--> {ie['target']}: {ie['reason']}"
            )
        invalid_section = (
            "\n\n## Invalid Edges\n"
            "The following edges failed source-code verification. "
            "Fix or remove them:\n"
            + "\n".join(edge_lines)
        )

    # Coverage stats
    coverage_pct = reconciliation.get("coverage_pct", 0)
    matched = reconciliation.get("matched_count", 0)
    total_repo = reconciliation.get("total_repo_files", 0)

    return f"""The following COBOL knowledge graph has been evaluated and FAILED \
the 100% file coverage gate.

## Current Coverage
- Files matched: {matched}/{total_repo} ({coverage_pct}%)
- Files missing from graph: {len(repo_only)}
- Current graph: {len(nodes)} nodes, {len(edges)} edges
- Graph nodes: {node_summary}
{missing_section}{missing_id_table}{manifest_section}{invalid_section}

## Instructions
Fix the graph so that EVERY file in the repository is represented as a node \
with correct edges. Return the COMPLETE corrected knowledge graph as JSON \
(same schema as before — nodes, edges, domains, metadata). Do NOT omit \
existing correct nodes/edges.

**CRITICAL NODE ID RULE:** Every node `id` MUST be the EXACT uppercased file \
stem (filename without extension), preserving hyphens and special characters. \
For example: `db2-handling.cbl` → id `DB2-HANDLING`, `POSUPDT.cbl` → id `POSUPDT`. \
Do NOT strip hyphens, do NOT abbreviate, do NOT rename.

Return ONLY the JSON knowledge graph, no other text."""
