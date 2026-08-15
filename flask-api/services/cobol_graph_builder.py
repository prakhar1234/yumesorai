"""Static analysis of COBOL source files to build a knowledge graph.

Parses .cbl/.cob programs, .cpy copybooks, .jcl jobs, and .bms screens
to extract nodes and dependency edges without relying on an LLM.
"""
from __future__ import annotations

import re
import logging
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import PurePosixPath

logger = logging.getLogger(__name__)

# ── Regex patterns for COBOL statement extraction ─────────────────────

# PROGRAM-ID. <name>.
RE_PROGRAM_ID = re.compile(
    r"PROGRAM-ID\.\s+([A-Za-z0-9_-]+)", re.IGNORECASE
)

# CALL "PROGNAME" / CALL 'PROGNAME'
RE_CALL = re.compile(
    r"\bCALL\s+['\"]([A-Za-z0-9_-]+)['\"]", re.IGNORECASE
)

# COPY MEMBERNAME.  /  COPY "MEMBERNAME".
RE_COPY = re.compile(
    r"\bCOPY\s+['\"]?([A-Za-z0-9_-]+)['\"]?", re.IGNORECASE
)

# PERFORM paragraphname  (must not be a number-only label)
RE_PERFORM = re.compile(
    r"\bPERFORM\s+([A-Za-z][A-Za-z0-9_-]*)", re.IGNORECASE
)

# SELECT <logical-file> ASSIGN TO <physical>
RE_SELECT = re.compile(
    r"\bSELECT\s+([A-Za-z0-9_-]+)\s+ASSIGN\s+TO\s+['\"]?([A-Za-z0-9_./-]+)['\"]?",
    re.IGNORECASE,
)

# FD <file-name>
RE_FD = re.compile(
    r"^\s+FD\s+([A-Za-z0-9_-]+)", re.IGNORECASE | re.MULTILINE
)

# EXEC SQL ... END-EXEC  (DB2 table access)
RE_EXEC_SQL = re.compile(
    r"EXEC\s+SQL\b(.*?)END-EXEC", re.IGNORECASE | re.DOTALL
)

# Table references inside SQL: FROM/INTO/UPDATE/INSERT INTO <table>
RE_SQL_TABLE = re.compile(
    r"\b(?:FROM|INTO|UPDATE|JOIN)\s+([A-Za-z][A-Za-z0-9_]*)", re.IGNORECASE
)

# EXEC CICS SEND MAP("MAPNAME") / RECEIVE MAP("MAPNAME")
RE_CICS_MAP = re.compile(
    r"EXEC\s+CICS\s+(?:SEND|RECEIVE)\s+MAP\s*\(\s*['\"]?([A-Za-z0-9_-]+)['\"]?\s*\)",
    re.IGNORECASE,
)

# EXEC CICS LINK / XCTL PROGRAM("PROGNAME")
RE_CICS_CALL = re.compile(
    r"EXEC\s+CICS\s+(?:LINK|XCTL)\s+PROGRAM\s*\(\s*['\"]?([A-Za-z0-9_-]+)['\"]?\s*\)",
    re.IGNORECASE,
)

# JCL: //stepname EXEC PGM=PROGNAME  or  EXEC PROC=PROCNAME
RE_JCL_EXEC = re.compile(
    r"//\S+\s+EXEC\s+(?:PGM=|PROC=)([A-Za-z0-9_]+)", re.IGNORECASE
)

# JCL: DD DSN=dataset.name
RE_JCL_DD = re.compile(
    r"\bDD\s+(?:DSN|DSNAME)=([A-Za-z0-9_.()&]+)", re.IGNORECASE
)

# Paragraph / section headers:  label-name.  (in area A, col 8-11)
RE_PARAGRAPH = re.compile(
    r"^       ([A-Za-z][A-Za-z0-9_-]*)\s*\.\s*$", re.MULTILINE
)

# Domain colour palette
DOMAIN_COLORS = [
    "#4ade80", "#60a5fa", "#f472b6", "#fbbf24",
    "#a78bfa", "#22d3ee", "#f97316", "#e879f9",
]


def _strip_cobol_comments(source: str) -> str:
    """Remove COBOL comment lines (col 7 = '*' or '/') and blank lines."""
    lines = []
    for line in source.split("\n"):
        if len(line) >= 7 and line[6] in ("*", "/"):
            continue
        lines.append(line)
    return "\n".join(lines)


def _count_loc(source: str) -> int:
    """Count non-blank, non-comment lines."""
    count = 0
    for line in source.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        if len(line) >= 7 and line[6] in ("*", "/"):
            continue
        count += 1
    return count


def _guess_domain(name: str, source: str) -> str:
    """Heuristic domain assignment based on name patterns and content."""
    upper = name.upper()
    src_upper = source.upper()

    # Check name prefixes
    if any(kw in upper for kw in ("ACCT", "ACCOUNT", "LEDGER", "GL")):
        return "ACT"
    if any(kw in upper for kw in ("PAY", "PAYROLL", "SALARY", "WAGE")):
        return "PAY"
    if any(kw in upper for kw in ("CUST", "CLIENT", "MEMBER")):
        return "CUS"
    if any(kw in upper for kw in ("BILL", "INVOICE", "CHARGE")):
        return "BIL"
    if any(kw in upper for kw in ("RPT", "REPORT", "PRINT", "LIST", "SALES")):
        return "RPT"

    # Check content
    if "REPORT" in src_upper or "PRINT" in src_upper:
        return "RPT"
    if "EXEC CICS" in src_upper:
        return "ONL"
    if any(kw in src_upper for kw in ("SORT", "MERGE", "JOB")):
        return "BAT"

    return "GEN"


DOMAIN_META = {
    "ACT": ("Accounts", "#4ade80"),
    "PAY": ("Payments", "#60a5fa"),
    "CUS": ("Customer", "#f472b6"),
    "BIL": ("Billing", "#fbbf24"),
    "RPT": ("Reporting", "#a78bfa"),
    "BAT": ("Batch/Infra", "#22d3ee"),
    "ONL": ("Online/CICS", "#f97316"),
    "GEN": ("General", "#94a3b8"),
}


def build_graph_from_sources(sources: list[dict], repo_url: str) -> dict:
    """Build a knowledge graph by statically analysing COBOL source files.

    Args:
        sources: List of dicts from ``fetch_repo_sources()``, each with
                 keys ``path``, ``name``, ``ext``, ``type``, ``content``.
        repo_url: The repository URL (for metadata).

    Returns:
        A dict conforming to the GraphData schema used by the frontend:
        ``{nodes, edges, domains, metadata}``.
    """
    nodes: dict[str, dict] = {}          # id -> node dict
    edges: list[dict] = []               # list of edge dicts
    edge_set: set[tuple] = set()         # dedup (src, tgt, type)
    paragraphs_by_program: dict[str, set[str]] = defaultdict(set)
    performs_by_program: dict[str, set[str]] = defaultdict(set)
    domains_seen: set[str] = set()

    def add_node(node_id: str, label: str, ntype: str, domain: str,
                 loc: int = 0, source: str = "") -> None:
        if node_id not in nodes:
            nodes[node_id] = {
                "id": node_id,
                "label": label,
                "type": ntype,
                "domain": domain,
                "color": DOMAIN_META.get(domain, ("", "#94a3b8"))[1],
                "risk": 0.0,
                "dead": False,
                "loc": loc,
                "fanIn": 0,
                "fanOut": 0,
            }
            domains_seen.add(domain)

    def add_edge(source_id: str, target_id: str, etype: str) -> None:
        key = (source_id, target_id, etype)
        if key not in edge_set:
            edge_set.add(key)
            edges.append({"source": source_id, "target": target_id, "type": etype})

    # ── Pass 1: Parse each source file ─────────────────────────────────
    for src in sources:
        raw = src["content"]
        clean = _strip_cobol_comments(raw)
        name = src["name"]
        ext = src["ext"].lower()
        ftype = src["type"]
        loc = _count_loc(raw)
        path = src["path"]

        # Determine program id (may differ from filename)
        prog_match = RE_PROGRAM_ID.search(clean)
        prog_id = prog_match.group(1).upper() if prog_match else name

        # Use path-based id to handle duplicate PROGRAM-IDs across directories
        file_id = prog_id
        if file_id in nodes:
            # Disambiguate with the first meaningful directory component
            parts = PurePosixPath(path).parts
            prefix = parts[0].upper() if parts and len(parts) > 1 else ext.upper()
            file_id = f"{prefix}/{prog_id}"
            # Still colliding? use full parent path
            if file_id in nodes:
                file_id = f"{PurePosixPath(path).parent}/{prog_id}".upper()

        domain = _guess_domain(prog_id, clean)
        add_node(file_id, prog_id, ftype, domain, loc, clean)

        if ftype == "job":
            _parse_jcl(file_id, clean, nodes, add_node, add_edge, domains_seen)
        elif ftype in ("program", "copybook"):
            _parse_cobol(
                file_id, prog_id, clean, ftype,
                nodes, add_node, add_edge, paragraphs_by_program,
                performs_by_program, domains_seen,
            )

    # ── Pass 2: Detect dead code ───────────────────────────────────────
    # A program is "dead" if no other program CALLs it and no JCL references it
    called_programs: set[str] = set()
    for e in edges:
        if e["type"] in ("call", "job"):
            called_programs.add(e["target"])

    for nid, node in nodes.items():
        if node["type"] == "program" and nid not in called_programs:
            # The first/main program is not dead
            pass  # keep dead=False, we mark only truly orphaned ones below

    # Mark dead: programs that are never called AND have no outgoing
    # edges at all (not even data access).  Programs with source files
    # are real entry points, not dead code — only mark stub nodes that
    # were auto-created from references but never had source loaded.
    source_file_ids = {s["name"] for s in sources}
    program_ids = [nid for nid, n in nodes.items() if n["type"] == "program"]
    for pid in program_ids:
        if pid in called_programs:
            continue
        node = nodes[pid]
        # If this program came from a real source file, it's a top-level
        # entry point (driver), not dead code.
        if node["loc"] > 0:
            continue
        # Stub node with no source and nobody calls it
        has_any_edge = any(
            e["source"] == pid or e["target"] == pid for e in edges
        )
        if not has_any_edge:
            node["dead"] = True

    # ── Pass 3: Compute fan-in / fan-out and risk ──────────────────────
    for e in edges:
        src_id, tgt_id = e["source"], e["target"]
        if src_id in nodes:
            nodes[src_id]["fanOut"] += 1
        if tgt_id in nodes:
            nodes[tgt_id]["fanIn"] += 1

    for node in nodes.values():
        loc = node["loc"]
        fan_out = node["fanOut"]
        fan_in = node["fanIn"]
        # Risk heuristic: bigger files and higher connectivity = higher risk
        loc_risk = min(loc / 1000, 0.4)        # up to 0.4 for large files
        dep_risk = min((fan_in + fan_out) / 20, 0.4)  # up to 0.4 for highly connected
        dead_risk = 0.2 if node["dead"] else 0.0
        node["risk"] = round(min(loc_risk + dep_risk + dead_risk, 1.0), 2)

    # ── Build domain list ──────────────────────────────────────────────
    domains = []
    for did in sorted(domains_seen):
        name, color = DOMAIN_META.get(did, (did, "#94a3b8"))
        domains.append({"id": did, "name": name, "color": color})

    # ── Assemble result ────────────────────────────────────────────────
    node_list = list(nodes.values())
    return {
        "nodes": node_list,
        "edges": edges,
        "domains": domains,
        "metadata": {
            "repo": repo_url,
            "nodeCount": len(node_list),
            "edgeCount": len(edges),
            "analyzedAt": datetime.now(timezone.utc).isoformat(),
        },
    }


def _parse_cobol(
    file_id: str, prog_id: str, source: str, ftype: str,
    nodes: dict, add_node, add_edge,
    paragraphs_by_program: dict, performs_by_program: dict,
    domains_seen: set,
) -> None:
    """Extract edges from a COBOL program or copybook."""

    # CALL "PROG"
    for m in RE_CALL.finditer(source):
        target = m.group(1).upper()
        if target != prog_id:
            add_node(target, target, "program", _guess_domain(target, ""), 0)
            add_edge(file_id, target, "call")

    # COPY MEMBER
    for m in RE_COPY.finditer(source):
        target = m.group(1).upper()
        add_node(target, target, "copybook", "GEN", 0)
        add_edge(file_id, target, "copy")

    # SELECT ... ASSIGN TO (file access)
    for m in RE_SELECT.finditer(source):
        logical = m.group(1).upper()
        physical = m.group(2).strip("'\"").upper()
        # Create a data node for the file
        data_id = logical
        add_node(data_id, logical, "table", "GEN", 0)
        add_edge(file_id, data_id, "data")

    # EXEC SQL ... table references
    for sql_match in RE_EXEC_SQL.finditer(source):
        sql_block = sql_match.group(1)
        for tm in RE_SQL_TABLE.finditer(sql_block):
            table = tm.group(1).upper()
            # Skip SQL keywords that look like table names
            if table in ("VALUES", "SET", "WHERE", "SELECT", "TABLE",
                         "INDEX", "CURSOR", "END", "NULL"):
                continue
            add_node(table, table, "table", "GEN", 0)
            add_edge(file_id, table, "data")

    # EXEC CICS SEND/RECEIVE MAP
    for m in RE_CICS_MAP.finditer(source):
        map_name = m.group(1).upper()
        add_node(map_name, map_name, "screen", "ONL", 0)
        domains_seen.add("ONL")
        add_edge(file_id, map_name, "screen")

    # EXEC CICS LINK/XCTL PROGRAM
    for m in RE_CICS_CALL.finditer(source):
        target = m.group(1).upper()
        if target != prog_id:
            add_node(target, target, "program", _guess_domain(target, ""), 0)
            add_edge(file_id, target, "call")

    # Collect paragraphs defined in this program
    for m in RE_PARAGRAPH.finditer(source):
        para = m.group(1).upper()
        paragraphs_by_program[file_id].add(para)

    # Collect PERFORMs (internal calls)
    for m in RE_PERFORM.finditer(source):
        target = m.group(1).upper()
        # Skip COBOL keywords that follow PERFORM
        if target in ("UNTIL", "VARYING", "WITH", "TEST", "THRU", "THROUGH",
                       "TIMES", "AFTER", "BEFORE", "END-PERFORM"):
            continue
        performs_by_program[file_id].add(target)


def _parse_jcl(
    file_id: str, source: str,
    nodes: dict, add_node, add_edge, domains_seen: set,
) -> None:
    """Extract edges from a JCL job file."""

    # EXEC PGM=PROG / EXEC PROC=PROC
    for m in RE_JCL_EXEC.finditer(source):
        target = m.group(1).upper()
        add_node(target, target, "program", _guess_domain(target, ""), 0)
        add_edge(file_id, target, "job")

    # DD DSN=dataset references (treated as data nodes)
    skip_dsn = {
        "SYSIN", "SYSOUT", "SYSPRINT", "SYSUT1", "SYSUT2", "SYSUT3",
        "SYSLIB", "SYSLMOD", "DUMMY", "NULLFILE", "STEPLIB", "JOBLIB",
        "SYSLIN", "SYSUDUMP", "SYSABEND", "CEEDUMP",
    }
    for m in RE_JCL_DD.finditer(source):
        dsn = m.group(1).upper()
        # Strip symbolic parameters like &SYSUID.
        dsn = re.sub(r"&[A-Z0-9]+\.?", "", dsn).strip(".")
        if not dsn:
            continue
        # Handle PDS member: HLQ.QUAL(MEMBER) -> extract MEMBER as the name
        pds_match = re.search(r"\(([A-Za-z][A-Za-z0-9_]*)\)", dsn)
        if pds_match:
            short = pds_match.group(1)
        else:
            # Take the last qualifier
            short = dsn.split(".")[-1].strip("()")
        if short and short not in skip_dsn and len(short) > 1:
            add_node(short, short, "table", "GEN", 0)
            add_edge(file_id, short, "data")
