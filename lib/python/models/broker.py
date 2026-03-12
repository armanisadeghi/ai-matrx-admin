"""MATRX broker block data models."""

from __future__ import annotations

from pydantic import BaseModel


class MatrxBrokerBlockData(BaseModel):
    """Parsed MATRX broker data."""

    matrx_record_id: str | None = None
    id: str | None = None
    name: str | None = None
    default_value: str | None = None
    color: str | None = None
    status: str | None = None
    default_component: str | None = None
    data_type: str | None = None
    raw_content: str = ""
