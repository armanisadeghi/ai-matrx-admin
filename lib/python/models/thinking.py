"""Thinking and reasoning block data models."""

from __future__ import annotations

from pydantic import BaseModel


class ThinkingBlockData(BaseModel):
    """Data for a thinking/reasoning block. Content is in the event's `content` field."""
    pass  # Uses content field directly


class ReasoningBlockData(BaseModel):
    """Data for a reasoning block. Content is in the event's `content` field."""
    pass  # Uses content field directly


class ConsolidatedReasoningBlockData(BaseModel):
    """Data for consolidated (merged) reasoning blocks."""

    reasoning_texts: list[str]
