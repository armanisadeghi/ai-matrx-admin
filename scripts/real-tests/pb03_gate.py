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


PLAYBOOK = "PB-03"
_ABSENT = object()


def settings_diffs(live: Optional[Dict[str, Any]]) -> List[tuple]:
    """(key, live value or _ABSENT, message) for every settings difference from the sealed block."""
    live = dict(live or {})
    out = []
    for k, want in SEALED_SETTINGS.items():
        if k not in live:
            if k not in ABSENT_ALLOWED:
                out.append((k, _ABSENT, f"settings.{k}: absent, sealed block has {want!r}"))
        elif live[k] != want or type(live[k]) is not type(want):
            out.append((k, live[k], f"settings.{k}: {live[k]!r}, sealed block has {want!r}"))
    for k in sorted(set(live) - set(SEALED_SETTINGS)):
        out.append((k, live[k], f"settings.{k}: {live[k]!r}, not in the sealed block"))
    return out


def settings_differences(live: Optional[Dict[str, Any]]) -> List[str]:
    return [m for _, _, m in settings_diffs(live)]


def plant_record_hash(agent_id: str, key: str, value: Any) -> str:
    return fc.sha({"agent_id": str(agent_id), "key": key, "value": value})


def write_plant_record(agent_id: str, key: str, value: Any, grader_dir: Any = None, now: Any = None) -> Dict[str, Any]:
    """Grader plant record of the PB-03 fault: names the disposable agent and the one settings key/value planted."""
    from datetime import datetime, timezone
    now = now or datetime.now(timezone.utc)
    rec = {"playbook": PLAYBOOK, "fixture": f"disposable:{agent_id}", "expected_hash": plant_record_hash(agent_id, key, value),
           "agent_id": str(agent_id), "key": key, "value": value,
           "planted_at": now.isoformat(), "expires_at": (now + fc.PLANT_TTL).isoformat()}
    path = fc.plant_path(PLAYBOOK, grader_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(__import__("json").dumps(rec, indent=1))
    return rec


def delete_plant_record(grader_dir: Any = None) -> bool:
    return fc.delete_plant_record(PLAYBOOK, grader_dir)


def _accepted_plant(agent_id: str, key: str, value: Any, grader_dir: Any, now: Any) -> bool:
    """True only if an unexpired PB-03 record names exactly this agent, key and value (and its hash is intact)."""
    rec = fc.load_plant_record(PLAYBOOK, grader_dir, now)
    if not rec or str(rec.get("agent_id")) != str(agent_id) or rec.get("key") != key or "value" not in rec:
        return False
    if rec["expected_hash"] != plant_record_hash(agent_id, rec["key"], rec["value"]):
        return False
    return value is not _ABSENT and rec["value"] == value and type(rec["value"]) is type(value)


def check_disposable(reader: Any, letter: str, agent_id: str, manifest: Optional[Dict[str, Any]] = None,
                     grader_dir: Any = None, now: Any = None) -> List[str]:
    """Every difference between a disposable agent and what PB-03 seals for copy `letter`. [] means it may be sent to."""
    return check_disposable_counted(reader, letter, agent_id, manifest, grader_dir, now)[0]


def check_disposable_counted(reader: Any, letter: str, agent_id: str, manifest: Optional[Dict[str, Any]] = None,
                             grader_dir: Any = None, now: Any = None) -> tuple:
    """(refusals, number of settings differences accepted by an unexpired PB-03 grader plant record)."""
    manifest = manifest or fc.load_manifest()
    who = f"copy {letter} agent {agent_id}"
    if str(agent_id) in fc.shared_live_agent_ids(manifest):
        return ([f"{who}: is a shared live fixture agent the manifest names (Settings Desk or another fixture); PB-03 sends only to a disposable agent"], 0)
    source_id = manifest["fixtures"][SOURCE_KEY[letter]]["id"]
    try:
        rows = reader.rows("agent", "definition", {"id": f"eq.{agent_id}", "select": SELECT})
        if not rows:
            return ([f"{who}: no such agent (absent or not readable)"], 0)
        row = rows[0]
        src = reader.one("agent", "definition", source_id, SELECT)
        tools = reader.tools(sorted(set((row.get("tools") or []) + (src.get("tools") or []))))
    except Exception as exc:  # an unreadable agent is a refusal, never a pass
        return ([f"{who}: could not read it or its source ({type(exc).__name__}: {exc})"], 0)
    out = []
    if row.get("organization_id") != SAFETY_NET_ORG:
        out.append(f"{who}: organization {row.get('organization_id')}, must be Safety Net Real Tests {SAFETY_NET_ORG}")
    if row.get("deleted_at") is not None or row.get("is_archived") or row.get("is_active") is False:
        out.append(f"{who}: is deleted, archived or inactive")
    accepted = 0
    for k, val, msg in settings_diffs(row.get("settings")):
        if _accepted_plant(agent_id, k, val, grader_dir, now):
            accepted += 1
        else:
            out.append(f"{who}: {msg}")
    for label, cols in SAME_AS_SOURCE.items():
        for c in cols:
            if fc.sha(row.get(c)) != fc.sha(src.get(c)):
                out.append(f"{who}: {label} differs from source copy {letter} ({c})")
    names = lambda r: sorted(f"{(tools.get(t) or {}).get('name')}" for t in r.get("tools") or [])  # noqa: E731
    if names(row) != names(src):
        out.append(f"{who}: tools {names(row)} differ from source copy {letter} {names(src)}")
    return out, accepted


def gate(reader: Any, pairs: Dict[str, str], manifest: Optional[Dict[str, Any]] = None,
         grader_dir: Any = None, now: Any = None) -> List[str]:
    return gate_counted(reader, pairs, manifest, grader_dir, now)[0]


def gate_counted(reader: Any, pairs: Dict[str, str], manifest: Optional[Dict[str, Any]] = None,
                 grader_dir: Any = None, now: Any = None) -> tuple:
    out: List[str] = []
    n = 0
    for letter, agent_id in pairs.items():
        d, a = check_disposable_counted(reader, letter, agent_id, manifest, grader_dir, now)
        out += d
        n += a
    return out, n
