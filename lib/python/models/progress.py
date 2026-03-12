"""Progress tracker block data models."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class ProgressItem(BaseModel):
    """A single trackable item."""

    id: str
    title: str
    checked: bool = False
    priority: Literal["high", "medium", "low"] | None = None
    duration_hours: float | None = None
    optional: bool = False
    category: str | None = None


class ProgressCategory(BaseModel):
    """A category within the progress tracker."""

    name: str
    completion_percent: int | None = None
    items: list[ProgressItem] = []


class ProgressTrackerBlockData(BaseModel):
    """Parsed progress tracker data."""

    title: str
    description: str | None = None
    categories: list[ProgressCategory] = []
    overall_progress: float | None = None
    total_items: int | None = None
    completed_items: int | None = None
