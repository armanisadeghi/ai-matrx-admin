"""Research block data models."""

from __future__ import annotations

from pydantic import BaseModel


class ResearchSection(BaseModel):
    """A section in a research document."""

    title: str
    content: str
    subsections: list[ResearchSection] = []


class ResearchBlockData(BaseModel):
    """Parsed research data."""

    title: str
    overview: str = ""
    research_scope: str | None = None
    key_focus_areas: str | None = None
    analysis_period: str | None = None
    introduction: str = ""
    research_questions: list[str] = []
    sections: list[ResearchSection] = []
    conclusion: str = ""
    key_takeaways: list[str] = []
