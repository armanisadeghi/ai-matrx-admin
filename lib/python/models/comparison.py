"""Comparison table block data models."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


class ComparisonCriterion(BaseModel):
    """A single criterion for comparison."""

    name: str
    values: list[Any]
    type: Literal["cost", "rating", "text", "boolean"] = "text"
    weight: float | None = None
    higher_is_better: bool | None = None


class ComparisonBlockData(BaseModel):
    """Parsed comparison table data."""

    title: str
    description: str | None = None
    items: list[str]  # The entities being compared
    criteria: list[ComparisonCriterion] = []
