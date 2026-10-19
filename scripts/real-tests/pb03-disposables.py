#!/usr/bin/env python3
# matrx-agent-traffic: exempt grader/dispatcher-only; creates, saves settings on and archives disposable test agents through the product's own doors; no model call
"""GRADER / DISPATCHER ONLY: make and archive the disposable agents real test PB-03 sends to. Never named in, or given to,
a runner sheet.

Arman's ruling 2026-10-19: Settings Desk A, O and G are shared live agents (reasoning_effort low) and no test writes to
them. PB-03's settings block is saved on disposable copies made for the run, in Safety Net Real Tests, by admin@admin.com.

  pb03-disposables.py create            for A, O and G: copy the Settings Desk agent through the product's copy door
                                        (RPC agent.duplicate_agent, the call behind "Duplicate" in the agent builder),
                                        name the copy "PB-03 run <UTC stamp> <letter>", save the sealed settings block on the
                                        copy through the agent save door (PATCH /agent-service/agents/<id>), read the copy
                                        back and run the same gate pb03-send.py runs. Prints the three ids and the exact
                                        `--agent` arguments. Exit 1 if any difference (the copies are left, ids printed).
  pb03-disposables.py archive ID [ID..] archive disposable agents (agent.definition is_archived true, the archive switch of
                                        the agent settings form) and read them back. Refuses an agent the manifest names, an
                                        agent outside Safety Net Real Tests and one not named "PB-03 run ...".

Both refuse a shared live agent through fixture_check.refuse_shared_agent_write before any write.
Sign-in: a one-time magic-link token for admin@admin.com (matrx-frontend/.env.local, never printed).
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fixture_check  # noqa: E402
import pb03_gate  # noqa: E402

_spec = importlib.util.spec_from_file_location("pb03_send", Path(__file__).resolve().parent / "pb03-send.py")
if _spec is None or _spec.loader is None:
    raise SystemExit("cannot load pb03-send.py beside this script")
pb03 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pb03)

NAME_PREFIX = "PB-03 run "


def _call(method: str, url: str, token: str, body=None, headers=None):
    h = {"Authorization": "Bearer " + token, "Content-Type": "application/json", "X-Organization-Id": pb03.ORG,
         "User-Agent": "matrx-real-tests/1.0 (pb03-disposables)", "X-Matrx-Agent-Traffic": "real-tests-pb03-disposables", **(headers or {})}
    req = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(), headers=h)
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")


def create() -> int:
    reader = fixture_check.Reader()
    manifest = fixture_check.load_manifest()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")
    ids = {}
    for letter in ("A", "O", "G"):
        source = manifest["fixtures"][pb03_gate.SOURCE_KEY[letter]]["id"]
        new_id = reader.rpc("agent", "duplicate_agent", {"p_agent_id": source, "p_as_system": False, "p_organization_id": pb03.ORG,
                                                         "p_follows_source": False, "p_name": f"{NAME_PREFIX}{stamp} {letter}"})
        if not isinstance(new_id, str):
            raise SystemExit(f"copy door returned {new_id!r} for {letter}")
        ids[letter] = new_id
        print(f"copy {letter}: duplicated Settings Desk {letter} -> {new_id}")
        fixture_check.refuse_shared_agent_write(new_id)  # the last door before the write
        status, raw = _call("PATCH", pb03.SERVER + f"/agent-service/agents/{new_id}", reader.token, {"settings": pb03_gate.SEALED_SETTINGS})
        print(f"copy {letter}: PATCH /agent-service/agents/{new_id} HTTP {status} {raw[:160]}")
        if status >= 300:
            print("ids so far: " + json.dumps(ids))
            return 1
    bad = 0
    for letter, new_id in ids.items():
        row = reader.one("agent", "definition", new_id, "id,name,version,model_id,settings")
        print(f"copy {letter}: read back {new_id} '{row['name']}' version {row['version']} model {row['model_id']}")
        print(f"copy {letter}: settings {json.dumps(row['settings'], sort_keys=True)}")
    diffs = pb03_gate.gate(reader, ids)
    for d in diffs:
        print(f"gate: DIFF {d}")
        bad += 1
    print(f"gate: {'PASS' if not bad else f'{bad} difference(s)'}")
    print("ids: " + json.dumps(ids))
    print("RUNNER-ARGS: python3 scripts/real-tests/pb03-send.py --out <a new empty folder> " + " ".join(f"--agent {k}={v}" for k, v in ids.items()))
    return 1 if bad else 0


def archive(ids: list) -> int:
    for i in ids:
        fixture_check.refuse_shared_agent_write(i)
    reader = fixture_check.Reader()
    bad = 0
    for i in ids:
        row = reader.one("agent", "definition", i, "id,name,organization_id,is_archived")
        if row["organization_id"] != pb03.ORG or not str(row["name"]).startswith(NAME_PREFIX):
            print(f"REFUSED {i}: '{row['name']}' in {row['organization_id']} is not a disposable PB-03 agent")
            bad += 1
            continue
        status, raw = _call("PATCH", f"{reader.db}/rest/v1/definition?id=eq.{urllib.parse.quote(i)}", reader.token, {"is_archived": True},
                            {"apikey": reader.pub, "Accept-Profile": "agent", "Content-Profile": "agent", "Prefer": "return=minimal"})
        after = reader.one("agent", "definition", i, "id,name,is_archived")
        print(f"archive {i} '{after['name']}': HTTP {status}, is_archived {after['is_archived']}")
        bad += 0 if after["is_archived"] else 1
    return 1 if bad else 0


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("create")
    a = sub.add_parser("archive")
    a.add_argument("ids", nargs="+")
    args = ap.parse_args()
    sys.exit(create() if args.cmd == "create" else archive(args.ids))


if __name__ == "__main__":
    main()
