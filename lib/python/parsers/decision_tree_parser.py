"""Decision tree parser — port of parseDecisionTreeJSON.ts."""

from __future__ import annotations

import json
import re

from lib.python.models.decision_tree import DecisionNode, DecisionTreeBlockData

_CODE_BLOCK_RE = re.compile(r'```(?:json)?\s*([\s\S]*?)\s*```')


def parse_decision_tree(content: str) -> DecisionTreeBlockData | None:
    """Parse decision tree JSON into structured data."""
    try:
        json_content = content.strip()
        m = _CODE_BLOCK_RE.search(json_content)
        if m:
            json_content = m.group(1).strip()

        parsed = json.loads(json_content)
        tree = parsed.get("decision_tree") or parsed

        if not tree or not tree.get("title") or not tree.get("root"):
            return None

        root = _process_node(tree["root"], "root")

        return DecisionTreeBlockData(
            title=tree["title"],
            description=tree.get("description"),
            root=root,
        )
    except Exception:
        return None


def _process_node(data: dict, node_id: str) -> DecisionNode:
    """Recursively process a decision tree node."""
    node_type = "decision" if data.get("question") else "action"

    yes_node = None
    no_node = None
    if data.get("yes"):
        yes_node = _process_node(data["yes"], f"{node_id}-yes")
    if data.get("no"):
        no_node = _process_node(data["no"], f"{node_id}-no")

    return DecisionNode(
        id=node_id,
        question=data.get("question"),
        action=data.get("action"),
        type=node_type,
        yes=yes_node,
        no=no_node,
        priority=data.get("priority"),
        category=data.get("category"),
        estimated_time=data.get("estimatedTime") or data.get("estimated_time"),
    )
