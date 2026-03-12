"""Questionnaire block data models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class QuestionnaireSection(BaseModel):
    """A section in a questionnaire."""

    title: str = ""
    content: str = ""
    items: list[dict[str, Any]] = []
    tables: list[dict[str, Any]] = []
    code_blocks: list[dict[str, Any]] = []
    json_blocks: list[dict[str, Any]] = []


class QuestionnaireBlockData(BaseModel):
    """Parsed questionnaire data."""

    sections: list[QuestionnaireSection] = []
    raw_content: str = ""  # Fallback for complex questionnaires
