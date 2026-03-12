"""MATRX broker parser — port of patternUtils.ts metadata parsing."""

from __future__ import annotations

from lib.python.block_detector import parse_matrx_metadata
from lib.python.models.broker import MatrxBrokerBlockData


def parse_broker(content: str) -> MatrxBrokerBlockData:
    """Parse MATRX broker content into structured data."""
    metadata = parse_matrx_metadata(content)
    return MatrxBrokerBlockData(
        matrx_record_id=metadata.get("matrx_record_id"),
        id=metadata.get("id"),
        name=metadata.get("name"),
        default_value=metadata.get("default_value"),
        color=metadata.get("color"),
        status=metadata.get("status"),
        default_component=metadata.get("default_component"),
        data_type=metadata.get("data_type"),
        raw_content=content,
    )
