"""The disposable-agent gate of real test PB-03 (Arman's ruling 2026-10-19): pb03-send.py sends only to DISPOSABLE agents
made for the run, and refuses unless each one still holds exactly what the playbook seals.

Read-only: it reads agent.definition as admin@admin.com through fixture_check.Reader and writes nothing.

  (a) settings equal the playbook's sealed block exactly (SEALED_SETTINGS). Keys the save door refused, if the playbook
      records any, are the only allowed absences (ABSENT_ALLOWED; the playbook records none).
  (b) model, variables, prompt block (messages, context policies, prompt blocks, output schema, skill config, model
      tiers) and tools (tools, custom tools, tool config, MCP servers) equal the source copy Settings Desk A, O or G.
  (c) the agent is in Safety Net Real Tests, is live and not archived, and is not an agent the manifest names.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import fixture_check as fc

SAFETY_NET_ORG = "226be635-194d-42dd-87c8-7a9562f70939"  # Safety Net Real Tests
SOURCE_KEY = {"A": "settings_a", "O": "settings_o", "G": "settings_g"}  # manifest entry of each source copy

# The one settings block of PB-03-unsupported-settings.md ("One settings block on all three"), verbatim.
SEALED_SETTINGS: Dict[str, Any] = {
    "temperature": 0.3, "top_p": 0.9, "top_k": 40, "seed": 4471,
    "frequency_penalty": 0.2, "presence_penalty": 0.1,
    "stop_sequences": ["ZZ-HALT"], "parallel_tool_calls": False,
    "verbosity": "low", "store": True,
    "reasoning_effort": "high", "thinking_budget": 2048, "thinking_level": "low",
    "include_thoughts": True, "clear_thinking": True,
    "max_output_tokens": 400000, "tool_choice": "auto",
    "internal_web_search": True, "internal_url_context": True,
}
ABSENT_ALLOWED: frozenset = frozenset()  # keys the save door refused AND the playbook records; none recorded

SELECT = fc.AGENT_COLS + ",is_archived"
# Same-as-source fields, grouped the way a difference is named.
SAME_AS_SOURCE = {
    "model": ("model_id",),
    "variables": ("variable_definitions",),
    "prompt block": ("messages", "context_policies", "prompt_blocks", "output_schema", "skill_config", "model_tiers"),
    "tools": ("custom_tools", "tool_config", "mcp_servers"),  # the tools id list is compared separately by name
}


def settings_differences(live: Optional[Dict[str, Any]]) -> List[str]:
    live = dict(live or {})
    out = []
    for k, want in SEALED_SETTINGS.items():
        if k not in live:
            if k not in ABSENT_ALLOWED:
                out.append(f"settings.{k}: absent, sealed block has {want!r}")
        elif live[k] != want or type(live[k]) is not type(want):
            out.append(f"settings.{k}: {live[k]!r}, sealed block has {want!r}")
    for k in sorted(set(live) - set(SEALED_SETTINGS)):
        out.append(f"settings.{k}: {live[k]!r}, not in the sealed block")
    return out


def check_disposable(reader: Any, letter: str, agent_id: str, manifest: Optional[Dict[str, Any]] = None) -> List[str]:
    """Every difference between a disposable agent and what PB-03 seals for copy `letter`. [] means it may be sent to."""
    manifest = manifest or fc.load_manifest()
    who = f"copy {letter} agent {agent_id}"
    if str(agent_id) in fc.shared_live_agent_ids(manifest):
        return [f"{who}: is a shared live fixture agent the manifest names (Settings Desk or another fixture); PB-03 sends only to a disposable agent"]
    source_id = manifest["fixtures"][SOURCE_KEY[letter]]["id"]
    try:
        rows = reader.rows("agent", "definition", {"id": f"eq.{agent_id}", "select": SELECT})
        if not rows:
            return [f"{who}: no such agent (absent or not readable)"]
        row = rows[0]
        src = reader.one("agent", "definition", source_id, SELECT)
        tools = reader.tools(sorted(set((row.get("tools") or []) + (src.get("tools") or []))))
    except Exception as exc:  # an unreadable agent is a refusal, never a pass
        return [f"{who}: could not read it or its source ({type(exc).__name__}: {exc})"]
    out = []
    if row.get("organization_id") != SAFETY_NET_ORG:
        out.append(f"{who}: organization {row.get('organization_id')}, must be Safety Net Real Tests {SAFETY_NET_ORG}")
    if row.get("deleted_at") is not None or row.get("is_archived") or row.get("is_active") is False:
        out.append(f"{who}: is deleted, archived or inactive")
    out += [f"{who}: {d}" for d in settings_differences(row.get("settings"))]
    for label, cols in SAME_AS_SOURCE.items():
        for c in cols:
            if fc.sha(row.get(c)) != fc.sha(src.get(c)):
                out.append(f"{who}: {label} differs from source copy {letter} ({c})")
    names = lambda r: sorted(f"{(tools.get(t) or {}).get('name')}" for t in r.get("tools") or [])  # noqa: E731
    if names(row) != names(src):
        out.append(f"{who}: tools {names(row)} differ from source copy {letter} {names(src)}")
    return out


def gate(reader: Any, pairs: Dict[str, str], manifest: Optional[Dict[str, Any]] = None) -> List[str]:
    out: List[str] = []
    for letter, agent_id in pairs.items():
        out += check_disposable(reader, letter, agent_id, manifest)
    return out
