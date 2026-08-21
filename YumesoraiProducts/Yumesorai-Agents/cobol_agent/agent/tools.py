"""Tool definitions for Claude and dispatch logic."""
from __future__ import annotations

import json
import logging
from typing import Any

from ..graph.builder import DOMAIN_META, GraphBuilder
from ..graph.schema import GraphEdge, GraphNode
from ..sources.base import SourceFetcher

logger = logging.getLogger(__name__)

# ── Anthropic tool schemas ────────────────────────────────────────────

TOOL_DEFINITIONS: list[dict] = [
    {
        "name": "list_source_files",
        "description": (
            "List all available COBOL, JCL, copybook, and BMS files. "
            "Returns metadata only (path, name, extension, type). "
            "Call this first to see what files are available for analysis."
        ),
        "input_schema": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
    {
        "name": "read_source_file",
        "description": (
            "Read the full source code of a specific file. "
            "Use the path from list_source_files."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "File path as returned by list_source_files",
                },
            },
            "required": ["path"],
        },
    },
    {
        "name": "add_program_node",
        "description": (
            "Add a COBOL program node to the knowledge graph."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Unique program identifier (usually PROGRAM-ID)"},
                "label": {"type": "string", "description": "Display label"},
                "domain": {
                    "type": "string",
                    "description": "3-letter domain code: ACT, PAY, CUS, BIL, RPT, BAT, ONL, GEN",
                },
                "loc": {"type": "integer", "description": "Lines of code"},
                "program_type": {
                    "type": "string",
                    "enum": ["batch", "online", "subroutine", "unknown"],
                    "description": "Program classification",
                },
            },
            "required": ["id", "label"],
        },
    },
    {
        "name": "add_file_node",
        "description": (
            "Add a dataset/file node to the knowledge graph. "
            "Use for VSAM files, sequential datasets, GDGs, DB2 tables."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Unique file/dataset identifier"},
                "label": {"type": "string", "description": "Display label"},
                "file_type": {
                    "type": "string",
                    "enum": [
                        "vsam_ksds", "vsam_esds", "vsam_rrds",
                        "sequential", "gdg", "pds",
                        "db2_table", "flat_file", "unknown",
                    ],
                    "description": "Dataset type classification",
                },
                "dsn": {"type": "string", "description": "Full dataset name (DSN) if known"},
                "record_format": {
                    "type": "string",
                    "description": "RECFM (e.g., FB, VB, F)",
                },
                "record_length": {
                    "type": "integer",
                    "description": "LRECL in bytes",
                },
            },
            "required": ["id", "label"],
        },
    },
    {
        "name": "add_copybook_node",
        "description": "Add a copybook node to the knowledge graph.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Copybook member name"},
                "label": {"type": "string", "description": "Display label"},
                "defines_record_for": {
                    "type": "string",
                    "description": "ID of the file node whose record layout this copybook defines",
                },
            },
            "required": ["id", "label"],
        },
    },
    {
        "name": "add_job_node",
        "description": "Add a JCL job node with step information.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Job name"},
                "label": {"type": "string", "description": "Display label"},
                "steps": {
                    "type": "array",
                    "description": "Ordered list of job steps",
                    "items": {
                        "type": "object",
                        "properties": {
                            "step_name": {"type": "string"},
                            "program": {"type": "string"},
                            "dd_inputs": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "dd_outputs": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                    },
                },
            },
            "required": ["id", "label"],
        },
    },
    {
        "name": "add_screen_node",
        "description": "Add a BMS screen/map node.",
        "input_schema": {
            "type": "object",
            "properties": {
                "id": {"type": "string", "description": "Map/screen name"},
                "label": {"type": "string", "description": "Display label"},
            },
            "required": ["id", "label"],
        },
    },
    {
        "name": "add_edge",
        "description": (
            "Add a directed edge between two nodes. Use specific edge types: "
            "read, write, update, delete (for data access); "
            "call (CALL statement); copy (COPY copybook); "
            "job_step (JCL EXEC PGM); "
            "screen_send, screen_receive (CICS MAP); "
            "cics_link, cics_xctl (CICS program transfer)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "source": {"type": "string", "description": "Source node ID"},
                "target": {"type": "string", "description": "Target node ID"},
                "type": {
                    "type": "string",
                    "enum": [
                        "read", "write", "update", "delete",
                        "call", "copy", "job_step",
                        "screen_send", "screen_receive",
                        "cics_link", "cics_xctl",
                    ],
                    "description": "Edge type",
                },
                "dd_name": {"type": "string", "description": "JCL DD name (optional)"},
                "disp": {"type": "string", "description": "JCL DISP parameter (optional)"},
                "sql_operation": {"type": "string", "description": "SQL verb: SELECT, INSERT, UPDATE, DELETE (optional)"},
                "jcl_step": {"type": "string", "description": "JCL step name (optional)"},
            },
            "required": ["source", "target", "type"],
        },
    },
    {
        "name": "finalize_graph",
        "description": (
            "Signal that analysis is complete. Call this after you have "
            "analyzed all files and added all nodes and edges."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "Brief summary of the analysis findings",
                },
            },
            "required": ["summary"],
        },
    },
]


class ToolDispatcher:
    """Handles tool calls from Claude and routes them to the right handler."""

    def __init__(self, fetcher: SourceFetcher, builder: GraphBuilder) -> None:
        self.fetcher = fetcher
        self.builder = builder
        self.finalized = False
        self.summary = ""
        self.source_files: list = []  # Cached from list_source_files

    def dispatch(self, tool_name: str, tool_input: dict[str, Any]) -> str:
        """Execute a tool call and return the JSON result string."""
        handler = getattr(self, f"_handle_{tool_name}", None)
        if handler is None:
            return json.dumps({"error": f"Unknown tool: {tool_name}"})
        try:
            result = handler(tool_input)
            return json.dumps(result)
        except Exception as e:
            logger.error("Tool %s failed: %s", tool_name, e)
            return json.dumps({"error": str(e)})

    def _handle_list_source_files(self, _input: dict) -> dict:
        files = self.fetcher.list_files()
        self.source_files = files  # Cache for coverage validation
        return {
            "files": [f.to_metadata() for f in files],
            "total_files": len(files),
        }

    def _handle_read_source_file(self, inp: dict) -> dict:
        path = inp["path"]
        content = self.fetcher.read_file(path)
        return {"path": path, "content": content, "length": len(content)}

    def _handle_add_program_node(self, inp: dict) -> dict:
        domain = inp.get("domain", "GEN")
        color = DOMAIN_META.get(domain, ("", "#94a3b8"))[1]
        node = GraphNode(
            id=inp["id"],
            label=inp.get("label", inp["id"]),
            type="program",
            domain=domain,
            color=color,
            loc=inp.get("loc", 0),
            program_type=inp.get("program_type"),
        )
        self.builder.add_node(node)
        return {"status": "ok", "node_id": node.id}

    def _handle_add_file_node(self, inp: dict) -> dict:
        node = GraphNode(
            id=inp["id"],
            label=inp.get("label", inp["id"]),
            type="file",
            domain="GEN",
            color="#94a3b8",
            file_type=inp.get("file_type"),
            dsn=inp.get("dsn"),
            record_format=inp.get("record_format"),
            record_length=inp.get("record_length"),
        )
        self.builder.add_node(node)
        return {"status": "ok", "node_id": node.id}

    def _handle_add_copybook_node(self, inp: dict) -> dict:
        node = GraphNode(
            id=inp["id"],
            label=inp.get("label", inp["id"]),
            type="copybook",
            domain="GEN",
            color="#94a3b8",
        )
        self.builder.add_node(node)

        # If it defines a record for a file, add a copy edge
        defines_for = inp.get("defines_record_for")
        if defines_for:
            self.builder.add_edge(
                GraphEdge(source=inp["id"], target=defines_for, type="copy")
            )

        return {"status": "ok", "node_id": node.id}

    def _handle_add_job_node(self, inp: dict) -> dict:
        node = GraphNode(
            id=inp["id"],
            label=inp.get("label", inp["id"]),
            type="job",
            domain="BAT",
            color=DOMAIN_META["BAT"][1],
            steps=inp.get("steps"),
        )
        self.builder.add_node(node)
        return {"status": "ok", "node_id": node.id}

    def _handle_add_screen_node(self, inp: dict) -> dict:
        node = GraphNode(
            id=inp["id"],
            label=inp.get("label", inp["id"]),
            type="screen",
            domain="ONL",
            color=DOMAIN_META["ONL"][1],
        )
        self.builder.add_node(node)
        return {"status": "ok", "node_id": node.id}

    def _handle_add_edge(self, inp: dict) -> dict:
        edge = GraphEdge(
            source=inp["source"],
            target=inp["target"],
            type=inp["type"],
            jcl_step=inp.get("jcl_step"),
            dd_name=inp.get("dd_name"),
            disp=inp.get("disp"),
            sql_operation=inp.get("sql_operation"),
        )
        added = self.builder.add_edge(edge)
        return {"status": "ok", "added": added}

    def _handle_finalize_graph(self, inp: dict) -> dict:
        self.finalized = True
        self.summary = inp.get("summary", "")
        return {
            "status": "finalized",
            "node_count": len(self.builder.nodes),
            "edge_count": len(self.builder.edges),
        }
