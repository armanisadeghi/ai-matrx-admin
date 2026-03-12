"""Quiz block data models."""

from __future__ import annotations

from pydantic import BaseModel


class QuizQuestion(BaseModel):
    """A single multiple-choice question."""

    id: int
    question: str
    options: list[str]
    correct_answer: int  # Index into options
    explanation: str


class QuizBlockData(BaseModel):
    """Parsed quiz data."""

    title: str
    category: str | None = None
    questions: list[QuizQuestion]
    content_hash: str = ""
