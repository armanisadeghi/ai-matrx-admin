"""Table block data models."""

from __future__ import annotations

from pydantic import BaseModel


class TableBlockData(BaseModel):
    """Parsed markdown table data."""

    headers: list[str]
    rows: list[list[str]]
    is_complete: bool = False
    raw_markdown: str = ""  # Keep raw markdown for rendering flexibility
