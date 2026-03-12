"""Comparison table parser — port of parseComparisonJSON.ts."""

from __future__ import annotations

import json
import re
from typing import Any

from lib.python.models.comparison import ComparisonBlockData, ComparisonCriterion

_CODE_BLOCK_RE = re.compile(r'```(?:json)?\s*([\s\S]*?)\s*```')


def parse_comparison(content: str) -> ComparisonBlockData | None:
    """Parse comparison JSON into structured data."""
    try:
        json_content = content.strip()
        m = _CODE_BLOCK_RE.search(json_content)
        if m:
            json_content = m.group(1).strip()

        parsed = json.loads(json_content)
        comp = parsed.get("comparison") or parsed

        if not comp or not comp.get("title"):
            return None

        items = comp.get("items", [])
        if not isinstance(items, list):
            return None

        criteria: list[ComparisonCriterion] = []
        for crit in comp.get("criteria", []):
            values = crit.get("values", [])
            crit_type = crit.get("type") or _infer_type(values)
            higher = crit.get("higherIsBetter")
            if higher is None:
                higher = _default_higher_is_better(crit_type)

            criteria.append(ComparisonCriterion(
                name=crit.get("name", ""),
                values=values,
                type=crit_type,
                weight=crit.get("weight"),
                higher_is_better=higher,
            ))

        return ComparisonBlockData(
            title=comp["title"],
            description=comp.get("description"),
            items=[str(i) for i in items],
            criteria=criteria,
        )
    except Exception:
        return None


def _infer_type(values: list[Any]) -> str:
    if not values:
        return "text"
    sample = values[0]
    if isinstance(sample, bool):
        return "boolean"
    if isinstance(sample, (int, float)):
        return "rating"
    if isinstance(sample, str):
        if re.match(r'^\$+$', sample):
            return "cost"
        try:
            float(sample.replace("$", "").replace(",", ""))
            return "cost"
        except ValueError:
            pass
    return "text"


def _default_higher_is_better(crit_type: str) -> bool:
    return crit_type != "cost"
