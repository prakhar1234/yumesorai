"""Pydantic models for the knowledge graph."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field


# Extended node types include 'file' for datasets
NodeType = Literal["program", "copybook", "table", "job", "screen", "file"]

# All edge types (extended + compat base types)
EdgeType = Literal[
    "read",
    "write",
    "update",
    "delete",
    "call",
    "copy",
    "job_step",
    "screen_send",
    "screen_receive",
    "cics_link",
    "cics_xctl",
    # Compat base types (used when --compat is enabled)
    "data",
    "job",
    "screen",
]

# Base 5 edge types for frontend compatibility
CompatEdgeType = Literal["call", "copy", "data", "job", "screen"]

# File type classification
FileType = Literal[
    "vsam_ksds",
    "vsam_esds",
    "vsam_rrds",
    "sequential",
    "gdg",
    "pds",
    "db2_table",
    "flat_file",
    "unknown",
]

ProgramType = Literal["batch", "online", "subroutine", "unknown"]


class GraphNode(BaseModel):
    """A node in the knowledge graph."""

    id: str
    label: str
    type: NodeType
    domain: str = "GEN"
    color: str = "#94a3b8"
    risk: float = 0.0
    dead: bool = False
    loc: int = 0
    fan_in: int = Field(0, alias="fanIn")
    fan_out: int = Field(0, alias="fanOut")

    # Traversal-computed fields
    depth: Optional[int] = None
    component: Optional[int] = None

    # Extended fields (optional)
    file_type: Optional[FileType] = None
    dsn: Optional[str] = None
    record_format: Optional[str] = None
    record_length: Optional[int] = None
    program_type: Optional[ProgramType] = None
    steps: Optional[list[dict]] = None

    model_config = {"populate_by_name": True}


class GraphEdge(BaseModel):
    """A directed edge in the knowledge graph."""

    source: str
    target: str
    type: EdgeType

    # Extended fields (optional)
    jcl_step: Optional[str] = None
    dd_name: Optional[str] = None
    disp: Optional[str] = None
    sql_operation: Optional[str] = None


class Domain(BaseModel):
    """A functional domain grouping."""

    id: str
    name: str
    color: str


class TraversalReport(BaseModel):
    """Results of deterministic post-processing graph traversal."""

    entry_points: list[str] = Field(
        default_factory=list,
        description="Node IDs with no incoming call/job_step edges (roots)",
    )
    sinks: list[str] = Field(
        default_factory=list,
        description="Node IDs with no outgoing edges (leaves)",
    )
    connected_components: list[list[str]] = Field(
        default_factory=list,
        description="Sets of node IDs reachable from each other (undirected)",
    )
    cycles: list[list[str]] = Field(
        default_factory=list,
        description="Cycles found in call/transfer edges",
    )
    execution_chains: list[list[str]] = Field(
        default_factory=list,
        description="Paths from jobs through programs to data files",
    )
    dangling_repaired: list[str] = Field(
        default_factory=list,
        description="Node IDs auto-created as stubs for dangling edge endpoints",
    )
    max_depth: int = Field(
        0,
        description="Maximum topological depth across all nodes",
    )
    jcl_edges_inferred: int = Field(
        0,
        description="Number of read/write edges inferred from JCL step DD params",
    )
    coverage_gaps: list[str] = Field(
        default_factory=list,
        description="Source files that were not analyzed or have no corresponding graph node",
    )
    coverage_complete: bool = Field(
        False,
        description="True when all source files have been analyzed and mapped to nodes",
    )
    finalize_attempts: int = Field(
        0,
        description="Number of times finalize_graph was called before coverage passed",
    )


class GraphMetadata(BaseModel):
    """Metadata about the analysis."""

    repo: str = ""
    node_count: int = Field(0, alias="nodeCount")
    edge_count: int = Field(0, alias="edgeCount")
    analyzed_at: str = Field("", alias="analyzedAt")
    agent_iterations: int = 0
    model: str = ""

    model_config = {"populate_by_name": True}


class GraphData(BaseModel):
    """Complete knowledge graph output."""

    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []
    domains: list[Domain] = []
    metadata: GraphMetadata = GraphMetadata()
    traversal: Optional[TraversalReport] = None

    model_config = {"populate_by_name": True}
