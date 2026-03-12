"""Task/checklist parser — port of tasklist-parser.tsx."""

from __future__ import annotations

import re

from lib.python.models.tasks import TaskItem, TasksBlockData

_SECTION_RE = re.compile(r'^##\s+')
_TOP_TASK_RE = re.compile(r'^[-*]\s+\[([ x])\]\s+(.+)')
_SUB_TASK_RE = re.compile(r'^(?:\s{2,}-\s+\[([ x])\]|\s*\*\s+\[([ x])\]|\s{2,}\[([ x])\])\s+(.+)')
_BOLD_RE = re.compile(r'^\*\*(.*?)\*\*(.*)?$')


def _clean_id(text: str) -> str:
    return re.sub(r'[^a-zA-Z0-9]', '-', text)


def parse_tasks(content: str) -> TasksBlockData:
    """Parse markdown checklist into structured data."""
    lines = content.split("\n")
    result: list[TaskItem] = []
    current_section: TaskItem | None = None
    inside_section = False

    for idx, line in enumerate(lines):
        # Section header
        if line.startswith("##"):
            inside_section = True
            title = _SECTION_RE.sub("", line).strip()
            current_section = TaskItem(
                id=f"section-{idx}",
                title=title,
                type="section",
                children=[],
            )
            result.append(current_section)
            continue

        # Top-level task
        top_m = _TOP_TASK_RE.match(line)
        if top_m:
            raw_title = top_m.group(2).strip()
            bold_m = _BOLD_RE.match(raw_title)
            if bold_m:
                title = f"{bold_m.group(1)}{bold_m.group(2) or ''}".strip()
                bold = True
            else:
                title = raw_title
                bold = False

            item = TaskItem(
                id=f"task-{idx}-{_clean_id(title)}",
                title=title,
                type="task",
                bold=bold,
                checked=top_m.group(1) == "x",
                children=[],
            )

            if inside_section and current_section:
                current_section.children.append(item)
            else:
                result.append(item)
            continue

        # Sub-task
        sub_m = _SUB_TASK_RE.match(line)
        if sub_m and result:
            raw_title = (sub_m.group(4) or "").strip()
            bold_m = _BOLD_RE.match(raw_title)
            if bold_m:
                title = f"{bold_m.group(1)}{bold_m.group(2) or ''}".strip()
                bold = True
            else:
                title = raw_title
                bold = False

            checked = (sub_m.group(1) == "x") or (sub_m.group(2) == "x") or (sub_m.group(3) == "x")

            item = TaskItem(
                id=f"subtask-{idx}-{_clean_id(title)}",
                title=title,
                type="subtask",
                bold=bold,
                checked=checked,
            )

            # Attach to the last top-level item
            if inside_section and current_section and current_section.children:
                parent = current_section.children[-1]
            elif result:
                parent = result[-1]
            else:
                continue

            parent.children.append(item)

    return TasksBlockData(items=result)
