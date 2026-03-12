"""Progress tracker parser — port of parseProgressMarkdown.ts."""

from __future__ import annotations

import re

from lib.python.models.progress import ProgressCategory, ProgressItem, ProgressTrackerBlockData

_CATEGORY_RE = re.compile(r'^\*\*([^*]+)\*\*(?:\s*\((\d+)%\s*complete\))?')
_TASK_RE = re.compile(r'^- \[([ x])\]\s*(.+)')
_PRIORITY_RE = re.compile(r'\{(high|medium|low)\}', re.IGNORECASE)
_HOURS_RE = re.compile(r'\((\d+(?:\.\d+)?)\s*h(?:our)?s?\)', re.IGNORECASE)
_MINS_RE = re.compile(r'\((\d+)\s*min(?:ute)?s?\)', re.IGNORECASE)
_OPTIONAL_RE = re.compile(r'\[optional\]', re.IGNORECASE)
_CAT_ASSIGN_RE = re.compile(r'\[category:([^\]]+)\]', re.IGNORECASE)


def parse_progress(content: str) -> ProgressTrackerBlockData | None:
    """Parse progress tracker markdown into structured data."""
    try:
        clean = re.sub(r'</?progress_tracker>', '', content).strip()
        lines = clean.split("\n")

        title = ""
        description: str | None = None
        categories: list[ProgressCategory] = []
        current_cat: ProgressCategory | None = None
        item_idx = 0

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue

            # Title
            if trimmed.startswith("###") and not title:
                title = re.sub(r'^#+\s*', '', trimmed).strip()
                continue

            # Category
            cat_m = _CATEGORY_RE.match(trimmed)
            if cat_m and not trimmed.startswith("-"):
                if current_cat:
                    categories.append(current_cat)
                pct = int(cat_m.group(2)) if cat_m.group(2) else None
                current_cat = ProgressCategory(name=cat_m.group(1).strip(), completion_percent=pct)
                continue

            # Task item
            task_m = _TASK_RE.match(trimmed)
            if task_m and current_cat is not None:
                text = task_m.group(2).strip()
                checked = task_m.group(1) == "x"

                priority = None
                pm = _PRIORITY_RE.search(text)
                if pm:
                    priority = pm.group(1).lower()

                duration = None
                hm = _HOURS_RE.search(text)
                mm = _MINS_RE.search(text)
                if hm:
                    duration = float(hm.group(1))
                elif mm:
                    duration = int(mm.group(1)) / 60.0

                optional = bool(_OPTIONAL_RE.search(text))

                cat_assign = None
                cam = _CAT_ASSIGN_RE.search(text)
                if cam:
                    cat_assign = cam.group(1).strip()

                # Clean text
                clean_text = _PRIORITY_RE.sub('', text)
                clean_text = _HOURS_RE.sub('', clean_text)
                clean_text = _MINS_RE.sub('', clean_text)
                clean_text = _OPTIONAL_RE.sub('', clean_text)
                clean_text = _CAT_ASSIGN_RE.sub('', clean_text).strip()

                current_cat.items.append(ProgressItem(
                    id=f"progress-{item_idx}",
                    title=clean_text,
                    checked=checked,
                    priority=priority,
                    duration_hours=duration,
                    optional=optional,
                    category=cat_assign,
                ))
                item_idx += 1
                continue

            # Description
            if title and description is None and not trimmed.startswith("**") and not trimmed.startswith("-"):
                description = trimmed

        if current_cat:
            categories.append(current_cat)

        # Calculate overall stats
        total = sum(len(c.items) for c in categories)
        completed = sum(sum(1 for it in c.items if it.checked) for c in categories)
        overall = (completed / total * 100) if total > 0 else 0

        return ProgressTrackerBlockData(
            title=title or "Progress Tracker",
            description=description,
            categories=categories,
            overall_progress=round(overall, 1),
            total_items=total,
            completed_items=completed,
        )
    except Exception:
        return None
