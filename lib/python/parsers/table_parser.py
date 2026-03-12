"""Table parser — parses markdown tables into structured data."""

from __future__ import annotations

import re

from lib.python.models.table import TableBlockData


def parse_table(content: str) -> TableBlockData | None:
    """Parse a markdown table into headers and rows."""
    try:
        lines = [l.strip() for l in content.strip().split("\n") if l.strip()]
        if len(lines) < 2:
            return None

        headers = _parse_row(lines[0])
        if not headers:
            return None

        # Second line should be separator
        if not re.match(r'^\|[:\s|\-]+\|?$', lines[1]):
            return None

        rows: list[list[str]] = []
        for line in lines[2:]:
            cells = _parse_row(line)
            if cells:
                rows.append(cells)

        return TableBlockData(
            headers=headers,
            rows=rows,
            is_complete=True,
            raw_markdown=content,
        )
    except Exception:
        return None


def _parse_row(line: str) -> list[str]:
    """Parse a table row into cells."""
    stripped = line.strip()
    if not stripped.startswith("|"):
        return []
    # Split by | and strip empty first/last
    cells = stripped.split("|")
    # Remove first and last empty strings from leading/trailing |
    if cells and cells[0].strip() == "":
        cells = cells[1:]
    if cells and cells[-1].strip() == "":
        cells = cells[:-1]
    return [c.strip() for c in cells]
