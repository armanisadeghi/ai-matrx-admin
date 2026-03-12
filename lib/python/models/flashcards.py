"""Flashcards block data models."""

from __future__ import annotations

from pydantic import BaseModel


class FlashcardItem(BaseModel):
    """A single flashcard with front and back."""

    front: str
    back: str


class FlashcardsBlockData(BaseModel):
    """Parsed flashcard data, ready for rendering."""

    cards: list[FlashcardItem]
    is_complete: bool = False
    partial_card: FlashcardItem | None = None
