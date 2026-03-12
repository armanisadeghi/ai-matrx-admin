"""Math problem block data models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class MathProblemBlockData(BaseModel):
    """Parsed math problem data. Flexible structure since math problems vary widely."""

    math_problem: dict[str, Any]
