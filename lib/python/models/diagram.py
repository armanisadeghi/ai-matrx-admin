"""Diagram block data models."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class Position(BaseModel):
    """2D position for a node."""

    x: float
    y: float


class DiagramNode(BaseModel):
    """A single node in a diagram."""

    id: str
    label: str
    type: str | None = None
    node_type: str = "default"
    description: str | None = None
    details: str | None = None
    position: Position | None = None


class DiagramEdge(BaseModel):
    """A single edge connecting two nodes."""

    id: str
    source: str
    target: str
    label: str | None = None
    type: str = "default"
    color: str | None = None
    dashed: bool = False
    stroke_width: float = 2


class DiagramLayout(BaseModel):
    """Layout configuration."""

    direction: Literal["TB", "LR", "BT", "RL"] = "TB"
    spacing: float = 100


class DiagramBlockData(BaseModel):
    """Parsed diagram data."""

    title: str
    description: str | None = None
    type: Literal["flowchart", "mindmap", "orgchart", "network", "system", "process"] = "flowchart"
    nodes: list[DiagramNode] = []
    edges: list[DiagramEdge] = []
    layout: DiagramLayout = DiagramLayout()
