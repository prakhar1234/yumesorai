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
