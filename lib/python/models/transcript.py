"""Transcript block data models."""

from __future__ import annotations

from pydantic import BaseModel


class TranscriptSegment(BaseModel):
    """A single timecoded segment in a transcript."""

    id: str
    timecode: str
    seconds: float
    text: str
    speaker: str | None = None


class TranscriptBlockData(BaseModel):
    """Parsed transcript data."""

    segments: list[TranscriptSegment]
