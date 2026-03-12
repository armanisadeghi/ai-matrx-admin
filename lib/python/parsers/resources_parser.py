"""Resources parser — port of parseResourcesMarkdown.ts."""

from __future__ import annotations

import re

from lib.python.models.resources import ResourceCategory, ResourceItem, ResourcesBlockData

_LINK_RE = re.compile(r'^\[([^\]]+)\]\(([^)]+)\)')
_DURATION_RE = re.compile(r'\(([^)]+(?:hour|hr|min|minute|sec|second)[^)]*)\)', re.IGNORECASE)
_TYPE_RE = re.compile(r'\[([^\]]+)\]')
_DIFFICULTY_RE = re.compile(r'\{([^}]+)\}')
_RATING_RE = re.compile(r'\*(\d+(?:\.\d+)?)\*')
_TAG_RE = re.compile(r'#(\w+)')


def parse_resources(content: str) -> ResourcesBlockData | None:
    """Parse resources markdown into structured data."""
    try:
        clean = re.sub(r'</?resources>', '', content).strip()
        lines = clean.split("\n")

        title = ""
        description: str | None = None
        categories: list[ResourceCategory] = []
        current_cat: ResourceCategory | None = None

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue

            # Title
            if trimmed.startswith("###") and not title:
                title = re.sub(r'^#+\s*', '', trimmed).strip()
                continue

            # Category header
            bold_m = re.match(r'^\*\*([^*]+)\*\*$', trimmed)
            if bold_m:
                if current_cat and current_cat.items:
                    categories.append(current_cat)
                current_cat = ResourceCategory(name=bold_m.group(1).strip())
                continue

            # Resource item
            if trimmed.startswith("-") and current_cat is not None:
                item_text = re.sub(r'^-\s*', '', trimmed).strip()
                item = _parse_resource_item(item_text, len(current_cat.items))
                current_cat.items.append(item)
                continue

            # Description (first non-header, non-category text)
            if title and not description and not trimmed.startswith("**") and not trimmed.startswith("-"):
                description = trimmed

        if current_cat and current_cat.items:
            categories.append(current_cat)

        return ResourcesBlockData(title=title or "Resources", description=description, categories=categories)
    except Exception:
        return None


def _parse_resource_item(text: str, index: int) -> ResourceItem:
    title = text
    url = ""
    desc = ""
    res_type = "article"
    duration: str | None = None
    difficulty: str | None = None
    rating: float | None = None
    tags: list[str] = []

    # Extract link
    link_m = _LINK_RE.match(text)
    if link_m:
        title = link_m.group(1).strip()
        url = link_m.group(2).strip()
        text = text[link_m.end():].strip()
        if text.startswith("-"):
            text = text[1:].strip()
        desc = text

    # Extract duration
    dur_m = _DURATION_RE.search(text)
    if dur_m:
        duration = dur_m.group(1).strip()

    # Extract type
    type_m = _TYPE_RE.search(text)
    if type_m:
        res_type = type_m.group(1).strip().lower()

    # Extract difficulty
    diff_m = _DIFFICULTY_RE.search(text)
    if diff_m:
        raw = diff_m.group(1).strip().lower()
        if raw in ("beginner", "intermediate", "advanced"):
            difficulty = raw
        elif raw in ("easy", "basic"):
            difficulty = "beginner"
        elif raw in ("medium", "moderate"):
            difficulty = "intermediate"
        elif raw in ("hard", "expert"):
            difficulty = "advanced"

    # Extract rating
    rat_m = _RATING_RE.search(text)
    if rat_m:
        val = float(rat_m.group(1))
        if 1 <= val <= 5:
            rating = val

    # Extract tags
    tags = _TAG_RE.findall(text)

    return ResourceItem(
        id=f"resource-{index}",
        title=title,
        url=url,
        description=desc,
        type=res_type,
        duration=duration,
        difficulty=difficulty,
        rating=rating,
        tags=tags,
    )
