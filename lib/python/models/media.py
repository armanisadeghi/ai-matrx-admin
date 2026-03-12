"""Image and video block data models."""

from __future__ import annotations

from pydantic import BaseModel


class ImageBlockData(BaseModel):
    """Data for an image block."""

    src: str
    alt: str = ""


class VideoBlockData(BaseModel):
    """Data for a video block."""

    src: str
    alt: str = ""
