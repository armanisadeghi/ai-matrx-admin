"""Presentation/slideshow block data models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class SlideTheme(BaseModel):
    """Theme configuration for a slideshow."""

    primary_color: str = "#2563eb"
    secondary_color: str = "#1e40af"
    accent_color: str = "#60a5fa"
    background_color: str = "#ffffff"
    text_color: str = "#1f2937"


class Slide(BaseModel):
    """A single slide in a presentation."""

    title: str = ""
    content: str = ""
    type: str = "content"
    bullets: list[str] = []
    notes: str = ""
    image_url: str | None = None
    layout: str = "default"
    data: dict[str, Any] = {}


class PresentationBlockData(BaseModel):
    """Parsed presentation/slideshow data."""

    slides: list[Slide]
    theme: SlideTheme = SlideTheme()
