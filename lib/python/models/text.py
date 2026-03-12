"""Text and code block data models."""

from __future__ import annotations

from pydantic import BaseModel, Field


class TextBlockData(BaseModel):
    """Data for a plain markdown text block. Content is in the event's `content` field."""
    pass  # Text blocks use content field directly, no structured data


class CodeBlockData(BaseModel):
    """Data for a fenced code block."""

    language: str = ""
    code: str = ""
    is_diff: bool = False


class DiffBlockData(BaseModel):
    """Data for a diff code block (SEARCH/REPLACE or unified diff)."""

    language: str = "diff"
    style: str = "unified"  # "unified" | "search_replace"
    code: str = ""
