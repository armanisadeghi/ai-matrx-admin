"""Timeline block data models."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class TimelineEvent(BaseModel):
    """A single event in a timeline."""

    id: str
    title: str
    date: str = "TBD"
    description: str = ""
    status: Literal["completed", "in-progress", "pending"] | None = None
    category: str | None = None


class TimelinePeriod(BaseModel):
    """A time period containing events."""

    period: str
    events: list[TimelineEvent] = []


class TimelineBlockData(BaseModel):
    """Parsed timeline data."""

    title: str = "Timeline"
    description: str | None = None
    periods: list[TimelinePeriod] = []
