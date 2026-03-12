"""Resources collection block data models."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class ResourceItem(BaseModel):
    """A single resource entry."""

    id: str
    title: str
    url: str = ""
    description: str = ""
    type: str = "article"  # documentation, video, article, course, etc.
    duration: str | None = None
    difficulty: Literal["beginner", "intermediate", "advanced"] | None = None
    rating: float | None = None
    tags: list[str] = []


class ResourceCategory(BaseModel):
    """A category of resources."""

    name: str
    items: list[ResourceItem] = []


class ResourcesBlockData(BaseModel):
    """Parsed resource collection data."""

    title: str
    description: str | None = None
    categories: list[ResourceCategory] = []
