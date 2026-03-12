"""Diagram parser — port of parseDiagramJSON.ts."""

from __future__ import annotations

import json
import math
import re

from lib.python.models.diagram import (
    DiagramBlockData,
    DiagramEdge,
    DiagramLayout,
    DiagramNode,
    Position,
)

_CODE_BLOCK_RE = re.compile(r'```(?:json)?\s*([\s\S]*?)\s*```')


def parse_diagram(content: str) -> DiagramBlockData | None:
    """Parse diagram JSON into structured data."""
    try:
        json_content = content.strip()
        m = _CODE_BLOCK_RE.search(json_content)
        if m:
            json_content = m.group(1).strip()

        parsed = json.loads(json_content)
        diagram = parsed.get("diagram") or parsed

        if not diagram or not diagram.get("title") or not isinstance(diagram.get("nodes"), list):
            return None

        diagram_type = diagram.get("type", "flowchart")

        nodes = []
        for i, node in enumerate(diagram["nodes"]):
            if not node.get("id") or not node.get("label"):
                continue
            pos = node.get("position")
            position = Position(x=pos["x"], y=pos["y"]) if pos else _default_position(i, diagram_type)
            nodes.append(DiagramNode(
                id=node["id"],
                label=node["label"],
                type=node.get("type"),
                node_type=node.get("nodeType") or node.get("type") or "default",
                description=node.get("description"),
                details=node.get("details"),
                position=position,
            ))

        edges = []
        for i, edge in enumerate(diagram.get("edges", [])):
            source = edge.get("source") or edge.get("from")
            target = edge.get("target") or edge.get("to")
            if not source or not target:
                continue
            edge_id = edge.get("id") or f"edge_{source}_to_{target}_{i}"
            edges.append(DiagramEdge(
                id=edge_id,
                source=source,
                target=target,
                label=edge.get("label"),
                type=edge.get("type", "default"),
                color=edge.get("color"),
                dashed=edge.get("dashed", False),
                stroke_width=edge.get("strokeWidth", 2),
            ))

        layout_data = diagram.get("layout", {})
        layout = DiagramLayout(
            direction=layout_data.get("direction", "TB"),
            spacing=layout_data.get("spacing", 100),
        )

        return DiagramBlockData(
            title=diagram["title"],
            description=diagram.get("description"),
            type=diagram_type,
            nodes=nodes,
            edges=edges,
            layout=layout,
        )
    except Exception:
        return None


def _default_position(index: int, diagram_type: str) -> Position:
    if diagram_type in ("flowchart", "process"):
        return Position(x=250, y=index * 120 + 50)
    elif diagram_type == "orgchart":
        level = index // 3
        pos = index % 3
        return Position(x=pos * 200 + 100, y=level * 150 + 50)
    elif diagram_type == "mindmap":
        angle = (index * 2 * math.pi) / 8
        radius = 200 + (index // 8) * 100
        return Position(x=300 + radius * math.cos(angle), y=300 + radius * math.sin(angle))
    elif diagram_type == "network":
        cols = 4
        row = index // cols
        col = index % cols
        return Position(x=col * 180 + 100 + (row % 2) * 90, y=row * 140 + 80)
    else:
        return Position(x=(index % 3) * 200 + 100, y=(index // 3) * 150 + 100)
