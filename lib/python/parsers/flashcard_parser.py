"""Flashcard parser — port of flashcard-parser.ts."""

from __future__ import annotations

import re

from lib.python.models.flashcards import FlashcardItem, FlashcardsBlockData

_FRONT_RE = re.compile(r'^(?:Front|Question):\s*(.*)', re.IGNORECASE)
_BACK_RE = re.compile(r'^(?:Back|Answer):\s*(.*)', re.IGNORECASE)


def parse_flashcards(content: str) -> FlashcardsBlockData:
    """Parse flashcard content into structured data."""
    lines = content.split("\n")
    cards: list[FlashcardItem] = []
    current_front: str | None = None
    current_back_lines: list[str] = []
    partial_card: FlashcardItem | None = None
    collecting_back = False
    is_complete = "</flashcards>" in content

    def finalize_card() -> None:
        nonlocal current_front, current_back_lines, collecting_back
        if collecting_back and current_back_lines:
            back_text = "\n".join(current_back_lines).strip()
            if current_front and back_text:
                cards.append(FlashcardItem(front=current_front, back=back_text))
                current_front = None
            collecting_back = False
            current_back_lines = []

    for line in lines:
        stripped = line.strip()

        if stripped == "---":
            finalize_card()
            continue

        front_m = _FRONT_RE.match(stripped)
        if front_m:
            finalize_card()
            current_front = front_m.group(1).strip()
            collecting_back = False
            current_back_lines = []
            continue

        back_m = _BACK_RE.match(stripped)
        if back_m:
            collecting_back = True
            current_back_lines = []
            inline = back_m.group(1).strip()
            if inline:
                current_back_lines.append(inline)
            continue

        if collecting_back:
            current_back_lines.append(stripped if stripped else "")
            continue

        # Continuation of front text
        if current_front and not collecting_back and stripped:
            current_front += " " + stripped

    # Finalize in-progress back collection
    if collecting_back and current_back_lines:
        back_text = "\n".join(current_back_lines).strip()
        if current_front and back_text:
            if is_complete:
                cards.append(FlashcardItem(front=current_front, back=back_text))
            else:
                partial_card = FlashcardItem(front=current_front, back=back_text)
        elif current_front:
            partial_card = FlashcardItem(front=current_front, back="")
    elif current_front:
        partial_card = FlashcardItem(front=current_front, back="")

    return FlashcardsBlockData(cards=cards, is_complete=is_complete, partial_card=partial_card)
