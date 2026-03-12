"""Tasks/checklist block data models."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class TaskItem(BaseModel):
    """A single task item (section, task, or subtask)."""

    id: str
    title: str
    type: Literal["section", "task", "subtask"]
    bold: bool = False
    checked: bool = False
    children: list[TaskItem] = []


class TasksBlockData(BaseModel):
    """Parsed checklist/task list data."""

    items: list[TaskItem]
