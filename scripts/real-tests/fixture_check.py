#!/usr/bin/env python3
# matrx-agent-traffic: marked database reads only (the project's own API, GET and read RPCs); no server request
"""Fixture drift check for the real tests: compare the live fixtures one playbook uses against fixtures.json.

The fixtures live in organization Safety Net Real Tests (226be635-…). Other sessions and platform migrations
change them (06:32Z agent_call -> agent migration, 07:00:16Z effort-knob migration, a binding pinned by another
session), and a grade taken on changed fixtures is not a grade. Every sender calls ``require_fixtures`` before
it sends; it refuses to send on any difference unless the runner passes ``--accept-drift <reason>``, which is
printed and recorded in the run identity.

What is compared, per fixture kind (the manifest's ``hash_rule`` says the same):
  agent          live version number and live version id, model id, and sha256 of: settings · declared tools
                 (each tool's id, registry name and active flag, plus custom_tools, tool_config, mcp_servers) ·
                 variables (variable_definitions) · the rest of the definition (messages, context policies,
                 prompt blocks, output schema, skills, model tiers, name, active/deleted, organization)
  agent_version  a version row a binding pins: the same four hashes and model id (version rows can be patched
                 in place, as on 2026-10-16)
  row            one database row: its ``version`` column and sha256 of the named fields. An entry marked
                 ``"ignore_version": true`` (files, notes, knob overrides: things a restore re-writes) is compared
                 by sha256 of its named fields only; a version counter that moved over identical content is a match.
                 A file's named fields carry its identity and content checksum (sha256 of the bytes), never
                 ``current_version``
  value          one stored value (custom.value_read): its value_version and sha256 of the value
  pick_list      a pick list (custom.pick_list_get): sha256 of its sorted (label, description) pairs
  presence       the fixture exists and is not deleted; used only where the sender itself writes the fixture
                 every run and verifies its start state (PB-04's three between-turn sources)
  tool           a tool.definition row: name and active flag

Grader plant records: a grader who plants a blind fault (plant-pb04/05/07/08.py) writes
~/.matrx/real-tests-grader/planted-<PB>.json (playbook, fixture key, expected hash, 2 h expiry). A difference is
accepted only when its fixture and the hash of its differing values equal an unexpired record; the output then says
only "fixture check: N difference(s) accepted (grader record)". The plant script's --restore deletes the record.

Every difference prints as ``DIFF <fixture> <field>: manifest <a> | live <b>``. A read that fails is a
difference (fail closed). An entry marked ``"drifted": true`` is always a difference until an owner
re-baselines it. Exit status: 0 only when every fixture of the playbook matches.

Usage:
  fixture_check.py PB-03            check one playbook's fixtures
  fixture_check.py --all            check every playbook
  fixture_check.py --snapshot KEY   print one fixture's live values as manifest JSON (never writes the manifest)
  fixture_check.py --self-test      the comparison must go RED on a changed version and GREEN on a match
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

HERE = Path(__file__).resolve().parent
MANIFEST = HERE / "fixtures.json"

AGENT_COLS = ("id,name,version,model_id,settings,tools,custom_tools,tool_config,mcp_servers,variable_definitions,"
              "messages,context_policies,prompt_blocks,output_schema,skill_config,model_tiers,is_active,deleted_at,"
              "organization_id")
VERSION_COLS = ("id,agent_id,version_number,version,name,model_id,settings,tools,custom_tools,tool_config,mcp_servers,"
                "variable_definitions,messages,context_policies,prompt_blocks,output_schema,skill_config,model_tiers,"
                "is_active,deleted_at,organization_id")


# ---------------------------------------------------------------------------------------------- hashing

def canon(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)


def sha(value: Any) -> str:
    return hashlib.sha256(canon(value).encode("utf-8")).hexdigest()


def agent_hashes(row: Dict[str, Any], tool_rows: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
    """The four content hashes of an agent row or an agent version row (same columns)."""
    tools = []
    for tid in sorted(row.get("tools") or []):
        t = tool_rows.get(tid) or {}
        tools.append({"id": tid, "name": t.get("name"), "is_active": t.get("is_active"), "deleted": t.get("deleted_at") is not None})
    return {
        "model_id": row.get("model_id"),
        "settings_sha256": sha(row.get("settings")),
        "tools_sha256": sha({"tools": tools, "custom_tools": row.get("custom_tools"), "tool_config": row.get("tool_config"),
                             "mcp_servers": row.get("mcp_servers")}),
        "variables_sha256": sha(row.get("variable_definitions")),
        "definition_sha256": sha({k: row.get(k) for k in ("messages", "context_policies", "prompt_blocks", "output_schema",
                                                           "skill_config", "model_tiers", "name", "is_active",
                                                           "organization_id")} | {"deleted": row.get("deleted_at") is not None}),
        "tools": [f"{t['name']}{'' if t['is_active'] else ' (INACTIVE)'}" for t in tools],
        "reasoning_effort": (row.get("settings") or {}).get("reasoning_effort"),
    }


# ---------------------------------------------------------------------------------------------- live reads

def _env() -> dict:
    env = {}
    for line in (Path.home() / "code/matrx-frontend/.env.local").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"')
    return env


class Reader:
    """Reads the live database as admin@admin.com through the project's own API (GET and read RPCs only)."""

    def __init__(self) -> None:
        env = _env()
        self.db, self.pub, secret = env["NEXT_PUBLIC_SUPABASE_URL"], env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"], env["SUPABASE_SECRET_KEY"]
        req = urllib.request.Request(
            self.db + "/auth/v1/admin/generate_link",
            data=json.dumps({"type": "magiclink", "email": "admin@admin.com"}).encode(),
            headers={"apikey": secret, "Authorization": "Bearer " + secret, "Content-Type": "application/json"})
        d = json.load(urllib.request.urlopen(req, timeout=30))
        hashed = d.get("hashed_token") or d.get("properties", {}).get("hashed_token")
        req = urllib.request.Request(
            self.db + "/auth/v1/verify", data=json.dumps({"type": "magiclink", "token_hash": hashed}).encode(),
            headers={"apikey": self.pub, "Content-Type": "application/json"})
        self.token = json.load(urllib.request.urlopen(req, timeout=30))["access_token"]
        self._tools: Dict[str, Dict[str, Any]] = {}

    def _req(self, method: str, path: str, schema: str, body: Optional[dict] = None) -> Any:
        headers = {"apikey": self.pub, "Authorization": "Bearer " + self.token, "Accept-Profile": schema,
                   "Content-Profile": schema, "Content-Type": "application/json",
                   "User-Agent": "matrx-real-tests/1.0 (fixture-check)"}
        req = urllib.request.Request(f"{self.db}/rest/v1/{path}", method=method, headers=headers,
                                     data=None if body is None else json.dumps(body).encode())
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8", "replace"))
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"HTTP {e.code} on {schema}.{path.split('?')[0]}: {e.read().decode('utf-8', 'replace')[:200]}")

    def rows(self, schema: str, table: str, query: Dict[str, str]) -> List[dict]:
        return self._req("GET", f"{table}?{urllib.parse.urlencode(query)}", schema)

    def one(self, schema: str, table: str, id_: str, select: str) -> dict:
        got = self.rows(schema, table, {"id": f"eq.{id_}", "select": select})
        if not got:
            raise RuntimeError(f"no row {schema}.{table} id {id_} (absent or not readable)")
        return got[0]

    def rpc(self, schema: str, fn: str, args: dict) -> Any:
        return self._req("POST", f"rpc/{fn}", schema, args)

    def tools(self, ids: List[str]) -> Dict[str, Dict[str, Any]]:
        missing = [i for i in ids if i not in self._tools]
        if missing:
            for r in self.rows("tool", "definition", {"id": f"in.({','.join(missing)})", "select": "id,name,is_active,deleted_at"}):
                self._tools[r["id"]] = r
        return {i: self._tools.get(i, {}) for i in ids}


def live_values(reader: Reader, entry: Dict[str, Any]) -> Dict[str, Any]:
    """The live values of one manifest entry, in the manifest's own field names."""
    kind = entry["kind"]
    if kind == "agent":
        row = reader.one("agent", "definition", entry["id"], AGENT_COLS)
        live: Dict[str, Any] = {"live_version": row["version"]}
        ver = reader.rows("agent", "definition_version", {"agent_id": f"eq.{entry['id']}", "version_number": f"eq.{row['version']}", "select": "id"})
        live["live_version_id"] = ver[0]["id"] if ver else None
        live.update(agent_hashes(row, reader.tools(row.get("tools") or [])))
        return live
    if kind == "agent_version":
        row = reader.one("agent", "definition_version", entry["id"], VERSION_COLS)
        live = {"agent_id": row["agent_id"], "version_number": row["version_number"], "row_version": row.get("version")}
        live.update(agent_hashes(row, reader.tools(row.get("tools") or [])))
        return live
    if kind == "row":
        versioned = entry.get("has_version", True) and not entry.get("ignore_version")
        row = reader.one(entry["schema"], entry["table"], entry["id"], ",".join(["id", *entry["fields"], *(["version"] if versioned else [])]))
        live = {"sha256": sha({f: row.get(f) for f in entry["fields"]})}
        if versioned:
            live["version"] = row.get("version")
        return live
    if kind == "value":
        got = reader.rpc("custom", "value_read", {"p_organization_id": entry["organization_id"], "p_record_id": entry["record_id"], "p_key": entry["key"]})
        if not got:
            raise RuntimeError(f"value_read returned nothing for {entry['record_id']} {entry['key']}")
        return {"sha256": sha(got[0].get("value")), "value_version": got[0].get("value_version")}
    if kind == "pick_list":
        doc = reader.rpc("custom", "pick_list_get", {"p_list_id": entry["id"]})
        items = sorted((i.get("label"), i.get("description")) for g in (doc.get("items_grouped") or {}).values() for i in g)
        return {"sha256": sha(items)}
    if kind == "presence":
        if entry.get("via") == "pick_list":
            doc = reader.rpc("custom", "pick_list_get", {"p_list_id": entry["id"]})
            return {"present": bool(doc and doc.get("list_id"))}
        if entry.get("via") == "value":
            got = reader.rpc("custom", "value_read", {"p_organization_id": entry["organization_id"], "p_record_id": entry["record_id"], "p_key": entry["key"]})
            return {"present": bool(got)}
        raise RuntimeError(f"presence via {entry.get('via')!r} is not a known read")
    if kind == "tool":
        row = reader.one("tool", "definition", entry["id"], "id,name,is_active,deleted_at")
        return {"name": row["name"], "is_active": row["is_active"], "deleted": row["deleted_at"] is not None}
    raise RuntimeError(f"unknown fixture kind {kind!r}")


# ---------------------------------------------------------------------------------------------- comparison

COMPARED = {
    "agent": ("live_version", "live_version_id", "model_id", "settings_sha256", "tools_sha256", "variables_sha256", "definition_sha256"),
    "agent_version": ("agent_id", "version_number", "row_version", "model_id", "settings_sha256", "tools_sha256", "variables_sha256", "definition_sha256"),
    "row": ("version", "sha256"),
    "value": ("value_version", "sha256"),
    "pick_list": ("sha256",),
    "presence": ("present",),
    "tool": ("name", "is_active", "deleted"),
}
SHOWN = ("tools", "reasoning_effort")  # printed beside a difference so a reader sees what moved


def compare(key: str, entry: Dict[str, Any], live: Optional[Dict[str, Any]], error: Optional[str] = None) -> List[str]:
    """Every difference between one manifest entry and its live values, as neutral lines. Empty = match."""
    out: List[str] = []
    if entry.get("drifted"):
        out.append(f"DIFF {key} drifted: marked drifted in the manifest ({entry.get('note') or 'no note'})")
    if error is not None or live is None:
        out.append(f"DIFF {key} read: live value not read ({error or 'no live values'})")
        return out
    fields = COMPARED.get(entry["kind"])
    if fields is None:
        return out + [f"DIFF {key} kind: unknown fixture kind {entry['kind']!r}"]
    if entry["kind"] == "presence" and "present" not in entry:
        entry = {**entry, "present": True}
    may_advance = entry["kind"] == "agent" and entry.get("version_may_advance")
    for f in fields:
        if f == "version" and entry["kind"] == "row" and entry.get("ignore_version"):
            continue  # a restore re-writes the counter; the content hash must still match exactly
        if f not in entry:
            out.append(f"DIFF {key} {f}: manifest has no value for this field | live {live.get(f)!r}")
            continue
        want, got = entry[f], live.get(f)
        if may_advance and f in ("live_version", "live_version_id"):
            if f == "live_version" and isinstance(got, int) and isinstance(want, int) and got < want:
                out.append(f"DIFF {key} {f}: manifest {want!r} | live {got!r} (version went backwards)")
            continue  # content hashes below still must match exactly
        if want != got:
            out.append(f"DIFF {key} {f}: manifest {want!r} | live {got!r}")
    if out and not entry.get("drifted"):
        for f in SHOWN:
            if f in entry or f in live:
                if entry.get(f) != live.get(f):
                    out.append(f"     {key} {f}: manifest {entry.get(f)!r} | live {live.get(f)!r}")
    return out


# ---------------------------------------------------------------------------------------------- grader plant records

GRADER_DIR = Path.home() / ".matrx" / "real-tests-grader"
PLANT_TTL = timedelta(hours=2)


def differing_values(entry: Dict[str, Any], live: Dict[str, Any]) -> Dict[str, Any]:
    """The live values of exactly the compared fields that differ from the manifest (what a plant changed)."""
    out: Dict[str, Any] = {}
    for f in COMPARED.get(entry["kind"], ()):
        if f == "version" and entry["kind"] == "row" and entry.get("ignore_version"):
            continue
        if entry["kind"] == "agent" and entry.get("version_may_advance") and f in ("live_version", "live_version_id"):
            continue
        want = entry.get("present", True) if (entry["kind"] == "presence" and f == "present") else entry.get(f)
        if want != live.get(f):
            out[f] = live.get(f)
    return out


def plant_hash(entry: Dict[str, Any], live: Dict[str, Any]) -> str:
    """Hash of the differing live values; the plant script stores it, the check recomputes and compares it."""
    return sha(differing_values(entry, live))


def plant_path(playbook: str, grader_dir: Optional[Path] = None) -> Path:
    return (grader_dir or GRADER_DIR) / f"planted-{playbook}.json"


def write_plant_record(playbook: str, key: str, manifest: Optional[Dict[str, Any]] = None, reader: Optional[Reader] = None,
                       grader_dir: Optional[Path] = None, now: Optional[datetime] = None) -> Dict[str, Any]:
    """Called by a plant script AFTER it planted: reads the fixture live and records the hash of what differs."""
    manifest = manifest or load_manifest()
    entry = manifest["fixtures"][key]
    live = live_values(reader or Reader(), entry)
    now = now or datetime.now(timezone.utc)
    rec = {"playbook": playbook, "fixture": key, "expected_hash": plant_hash(entry, live),
           "planted_at": now.isoformat(), "expires_at": (now + PLANT_TTL).isoformat(),
           "differs_from_manifest": bool(differing_values(entry, live))}
    path = plant_path(playbook, grader_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(rec, indent=1))
    return rec


def delete_plant_record(playbook: str, grader_dir: Optional[Path] = None) -> bool:
    path = plant_path(playbook, grader_dir)
    if path.exists():
        path.unlink()
        return True
    return False


def load_plant_record(playbook: str, grader_dir: Optional[Path] = None, now: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
    """The unexpired plant record of a playbook, or None (missing, unreadable, malformed or expired = no record)."""
    try:
        rec = json.loads(plant_path(playbook, grader_dir).read_text())
        if rec.get("playbook") != playbook or not rec.get("fixture") or not rec.get("expected_hash"):
            return None
        if (now or datetime.now(timezone.utc)) >= datetime.fromisoformat(rec["expires_at"]):
            return None
        return rec
    except Exception:
        return None


def load_manifest(path: Path = MANIFEST) -> Dict[str, Any]:
    return json.loads(path.read_text())


def check(playbook: str, manifest: Optional[Dict[str, Any]] = None, reader: Optional[Reader] = None,
          reader_factory: Callable[[], Reader] = Reader, grader_dir: Optional[Path] = None,
          now: Optional[datetime] = None) -> Dict[str, Any]:
    """Compare every fixture of one playbook. Returns {ok, differences, fixtures: {key: live values}}."""
    manifest = manifest or load_manifest()
    keys = manifest["playbooks"].get(playbook)
    result: Dict[str, Any] = {"playbook": playbook, "manifest_built_at": manifest.get("built_at"), "differences": [], "fixtures": {},
                              "accepted": 0}
    plant = load_plant_record(playbook, grader_dir, now)
    if not keys:
        result["differences"].append(f"DIFF {playbook} playbook: no fixture list in the manifest")
        result["ok"] = False
        return result
    try:
        reader = reader or reader_factory()
    except Exception as exc:  # sign-in failure is a difference, never a pass
        result["differences"].append(f"DIFF {playbook} read: could not sign in to read the database ({type(exc).__name__}: {exc})")
        result["ok"] = False
        return result
    for key in keys:
        entry = manifest["fixtures"].get(key)
        if entry is None:
            result["differences"].append(f"DIFF {key} manifest: listed for {playbook} but not defined")
            continue
        live, err = None, None
        try:
            live = live_values(reader, entry)
        except Exception as exc:
            err = f"{type(exc).__name__}: {exc}"
        result["fixtures"][key] = {"kind": entry["kind"], "id": entry.get("id"), "live": live, "error": err}
        diffs = compare(key, entry, live, err)
        if (diffs and plant and plant["fixture"] == key and err is None and live is not None and not entry.get("drifted")
                and plant["expected_hash"] == plant_hash(entry, live)):
            result["accepted"] += sum(1 for d in diffs if d.startswith("DIFF"))  # the grader planted exactly this
            diffs = []
        result["differences"].extend(diffs)
    result["ok"] = not result["differences"]
    return result


def print_result(result: Dict[str, Any]) -> None:
    pb = result["playbook"]
    print(f"fixture check {pb}: manifest built {result.get('manifest_built_at')}, {len(result['fixtures'])} fixtures read")
    for line in result["differences"]:
        print(f"fixture check {pb}: {line}")
    if result.get("accepted"):
        print(f"fixture check: {result['accepted']} difference(s) accepted (grader record)")
    n = sum(1 for d in result["differences"] if d.startswith("DIFF"))
    print(f"fixture check {pb}: {'MATCH, every fixture equals the manifest' if result['ok'] else f'{n} difference(s)'}")


def require_fixtures(playbook: str, accept_drift: Optional[str]) -> Dict[str, Any]:
    """Run by every sender before it sends. Prints the check; exits 3 on any difference unless the runner gave
    --accept-drift <reason>. Returns the record the run identity stores."""
    result = check(playbook)
    print_result(result)
    record = {"playbook": playbook, "ok": result["ok"], "differences": result["differences"],
              "accepted_drift": None, "fixtures": {}}
    for key, f in result["fixtures"].items():
        live = f.get("live") or {}
        record["fixtures"][key] = {k: live.get(k) for k in ("live_version", "live_version_id", "version_number", "version",
                                                             "value_version", "settings_sha256", "tools_sha256",
                                                             "variables_sha256", "definition_sha256", "sha256") if k in live}
        record["fixtures"][key]["id"] = f.get("id")
        if f.get("error"):
            record["fixtures"][key]["read_error"] = f["error"]
    if not result["ok"]:
        if not accept_drift:
            print(f"fixture check {playbook}: REFUSED to send: fixtures differ from the manifest. "
                  "Rerun with --accept-drift \"<reason>\" only if an owner has accepted this state.")
            sys.exit(3)
        record["accepted_drift"] = accept_drift
        print(f"fixture check {playbook}: DRIFT ACCEPTED by the runner, reason: {accept_drift}")
    return record


def add_accept_drift_arg(ap: argparse.ArgumentParser) -> None:
    ap.add_argument("--accept-drift", metavar="REASON", default=None,
                    help="send even though the fixture check found differences; the reason is printed and recorded")


# ---------------------------------------------------------------------------------------------- self-test

class _FakeReader:
    """Serves one row for the plant-record self-tests (no network)."""

    def __init__(self, row: Dict[str, Any]) -> None:
        self.row = row

    def one(self, schema: str, table: str, id_: str, select: str) -> Dict[str, Any]:
        return dict(self.row)


def plant_self_test() -> int:
    """check() against a fake reader and a temporary grader folder: the plant-record and version-counter cases."""
    entry = {"kind": "row", "schema": "files", "table": "files", "id": "f1", "fields": ["file_name", "checksum"],
             "ignore_version": True, "sha256": sha({"file_name": "a.csv", "checksum": "AAAA"})}
    manifest = {"built_at": "t", "playbooks": {"PB-X": ["f"]}, "fixtures": {"f": entry}}
    start = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
    planted = _FakeReader({"file_name": "a.csv", "checksum": "BBBB", "version": 9})
    planted_hash = plant_hash(entry, live_values(planted, entry))
    missed = 0

    def case(name: str, want_ok: bool, want_accepted: int, row: Dict[str, Any], record: Optional[Dict[str, Any]], at: datetime) -> None:
        nonlocal missed
        with tempfile.TemporaryDirectory() as d:
            gd = Path(d)
            if record is not None:
                plant_path("PB-X", gd).write_text(json.dumps(record))
            r = check("PB-X", manifest, _FakeReader(row), grader_dir=gd, now=at)
        ok = r["ok"] == want_ok and r["accepted"] == want_accepted
        missed += 0 if ok else 1
        print(f"{'ok    ' if ok else 'MISSED'} {name}: {'GREEN' if r['ok'] else 'RED'}, accepted {r['accepted']}")

    def rec(h: str, expires: datetime) -> Dict[str, Any]:
        return {"playbook": "PB-X", "fixture": "f", "expected_hash": h, "planted_at": start.isoformat(), "expires_at": expires.isoformat()}

    live_ok = {"file_name": "a.csv", "checksum": "AAAA", "version": 1}
    case("(d) version-only change, same bytes, is a MATCH", True, 0, {**live_ok, "version": 7}, None, start)
    case("(a) planted change with a matching record is accepted", True, 1, planted.row, rec(planted_hash, start + timedelta(hours=2)), start)
    case("(b) record with the wrong hash is refused", False, 0, planted.row, rec("0" * 64, start + timedelta(hours=2)), start)
    case("(c) expired record is refused", False, 0, planted.row, rec(planted_hash, start + timedelta(hours=2)), start + timedelta(hours=2, seconds=1))
    case("(e) no record, planted change is refused", False, 0, planted.row, None, start)
    case("(f) record for another fixture is refused", False, 0, planted.row, {**rec(planted_hash, start + timedelta(hours=2)), "fixture": "other"}, start)
    case("(g) a different change than the planted one is refused", False, 0, {"file_name": "a.csv", "checksum": "CCCC"}, rec(planted_hash, start + timedelta(hours=2)), start)
    return missed


def self_test() -> int:
    """Pure comparison cases. RED cases must produce at least one DIFF; GREEN cases none."""
    base = {"kind": "agent", "id": "a", "live_version": 5, "live_version_id": "v5", "model_id": "m",
            "settings_sha256": "s", "tools_sha256": "t", "variables_sha256": "x", "definition_sha256": "d"}
    live_same = {k: v for k, v in base.items() if k not in ("kind", "id")}
    cases = [
        ("GREEN match", base, live_same, None, False),
        ("RED changed version id", base, {**live_same, "live_version": 6, "live_version_id": "v6"}, None, True),
        ("RED changed settings hash", base, {**live_same, "settings_sha256": "s2"}, None, True),
        ("RED drifted mark on a match", {**base, "drifted": True, "note": "n"}, live_same, None, True),
        ("RED read failed", base, None, "HTTP 403", True),
        ("RED manifest lacks a field", {k: v for k, v in base.items() if k != "tools_sha256"}, live_same, None, True),
        ("GREEN may-advance, same content", {**base, "version_may_advance": True}, {**live_same, "live_version": 7, "live_version_id": "v7"}, None, False),
        ("RED may-advance, changed content", {**base, "version_may_advance": True}, {**live_same, "live_version": 7, "definition_sha256": "d2"}, None, True),
        ("RED may-advance, version backwards", {**base, "version_may_advance": True}, {**live_same, "live_version": 4}, None, True),
        ("GREEN row match", {"kind": "row", "version": 1, "sha256": "h"}, {"version": 1, "sha256": "h"}, None, False),
        ("RED row changed", {"kind": "row", "version": 1, "sha256": "h"}, {"version": 2, "sha256": "h2"}, None, True),
        ("RED presence absent", {"kind": "presence"}, {"present": False}, None, True),
    ]
    missed = 0
    for name, entry, live, err, want_red in cases:
        diffs = compare("selftest", entry, live, err)
        red = bool(diffs)
        ok = red == want_red
        missed += 0 if ok else 1
        print(f"{'ok    ' if ok else 'MISSED'} {name}: {'RED' if red else 'GREEN'} ({len(diffs)} line(s))")
    # the hash itself must move when one setting moves
    h1 = agent_hashes({"settings": {"reasoning_effort": "high"}, "tools": []}, {})
    h2 = agent_hashes({"settings": {"reasoning_effort": "low"}, "tools": []}, {})
    hash_ok = h1["settings_sha256"] != h2["settings_sha256"]
    missed += 0 if hash_ok else 1
    print(f"{'ok    ' if hash_ok else 'MISSED'} settings hash moves with reasoning_effort")
    # a tool turning inactive must move the tools hash
    t1 = agent_hashes({"tools": ["x"]}, {"x": {"name": "agent_call", "is_active": True}})
    t2 = agent_hashes({"tools": ["x"]}, {"x": {"name": "agent_call", "is_active": False}})
    tool_ok = t1["tools_sha256"] != t2["tools_sha256"]
    missed += 0 if tool_ok else 1
    print(f"{'ok    ' if tool_ok else 'MISSED'} tools hash moves when a declared tool turns inactive")
    missed += plant_self_test()
    print(f"self-test: {missed} missed")
    return 1 if missed else 0


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    ap.add_argument("playbook", nargs="?", help="PB-01 … PB-08")
    ap.add_argument("--all", action="store_true", help="check every playbook in the manifest")
    ap.add_argument("--snapshot", metavar="KEY", help="print one fixture's live values (manifest JSON); writes nothing")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        sys.exit(self_test())
    manifest = load_manifest()
    if args.snapshot:
        entry = manifest["fixtures"][args.snapshot]
        print(json.dumps({**entry, **live_values(Reader(), entry)}, indent=1, ensure_ascii=False))
        return
    books = sorted(manifest["playbooks"]) if args.all else [args.playbook] if args.playbook else []
    if not books:
        ap.error("name a playbook, or --all, --snapshot KEY, --self-test")
    reader = Reader()
    bad = 0
    for pb in books:
        result = check(pb, manifest, reader)
        print_result(result)
        bad += 0 if result["ok"] else 1
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
