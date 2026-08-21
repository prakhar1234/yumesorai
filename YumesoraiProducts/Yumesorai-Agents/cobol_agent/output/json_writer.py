"""Serialize GraphData to JSON files."""
from __future__ import annotations

import json
from pathlib import Path

from ..graph.schema import GraphData


def write_graph_json(graph: GraphData, output_path: "str | Path") -> None:
    """Write the graph to a JSON file using the extended schema."""
    path = Path(output_path)
    data = graph.model_dump(by_alias=True, exclude_none=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def graph_to_dict(graph: GraphData) -> dict:
    """Convert graph to a plain dict (extended schema)."""
    return graph.model_dump(by_alias=True, exclude_none=True)
