"""Troubleshooting block data models."""

from __future__ import annotations

from pydantic import BaseModel


class TroubleshootingStep(BaseModel):
    """A step in a troubleshooting solution."""

    text: str
    code: str | None = None
    url: str | None = None
    difficulty: str | None = None
    time_estimate: str | None = None


class TroubleshootingSolution(BaseModel):
    """A solution to a troubleshooting issue."""

    title: str
    description: str = ""
    steps: list[TroubleshootingStep] = []
    priority: str | None = None
    success_rate: str | None = None
    tags: list[str] = []


class TroubleshootingIssue(BaseModel):
    """A single issue in a troubleshooting guide."""

    symptom: str
    causes: list[str] = []
    solutions: list[TroubleshootingSolution] = []
    related_issues: list[str] = []
    severity: str | None = None


class TroubleshootingBlockData(BaseModel):
    """Parsed troubleshooting data."""

    title: str
    description: str | None = None
    issues: list[TroubleshootingIssue] = []
