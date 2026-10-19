#!/usr/bin/env python3
# matrx-agent-traffic: real-tests fixture build for PB-01 (admin@admin.com's own test records; dry runs only, no model call)
"""Build and read back PB-01's "To build" fixtures through the product's own doors (core-chain PB-01 "To build").

1. `company_name` organization value in admin's Workspace = `Harborline Freight`
   (door: `custom.context_value_write` with `organization_id`, the one `orgSystemValues.ts` uses), and Safety Net's
   own value `Tidewater Compass Movers` read back unchanged.
2. Skill "Compass dispatch ref" in Safety Net Real Tests (door: the personal-skill create the skill editor uses,
   a signed-in `skill.definition` insert, organization = the active organization), read back through the
   Skills picker's own read (`skill.definition`, `is_active = true`).
3. Install dry run of the pinned v3 (`POST /ai/agents/{v3}` with `is_version`, `dry_run`, `store: false`, scope Port
   of Oakland lane) with the skill attached the way the picker attaches it (`skill_config.included`).

Idempotent: an existing value or skill is read back, never written twice. Prints every read back; exit 1 when any
expected text is missing. `--check` writes nothing (reads and the dry run only).
"""
from __future__ import annotations

import argparse
import base64
import json
import sys
import urllib.error
import urllib.request
import uuid

from fixture_check import Reader

SERVER = "https://server.app.matrxserver.com"
SAFETY_NET = "226be635-194d-42dd-87c8-7a9562f70939"
WORKSPACE = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f"  # admin's Workspace
COMPANY_NAME_ITEM = "11b7b942-d604-4d7a-9566-571865f121ed"
SAFETY_NET_VALUE_ROW = "c7b17c0b-6812-4a04-9bd7-6de4062f1e19"
ROUTING_DESK_V3 = "8936cc7a-5ef5-45f1-8332-f62bb6cc18a8"
LANE_SCOPE = "9a4e5ff6-833a-4b6d-986b-26eaf3893e28"  # Port of Oakland lane
SKILL_KEY = "compass-dispatch-ref"
SKILL_LABEL = "Compass dispatch ref"
SKILL_RULE = "Begin every reply with the sentence: Dispatch ref DR-7305."
CARRIER = ("```matrx\n" '{"__kind":"directive_v1_reference_pick_list_item","items":[{"list_id":"3a881421-95f0-425f-a7b6-2ad274f66d97",'
           '"item_id":"9dbf0fe5-e08a-4101-b5d3-f37b279548e5","label":"Pacific Crest"}]}\n' "```")

failures: list[str] = []


def expect(label: str, ok: bool) -> None:
    print(f"{'ok  ' if ok else 'FAIL'} {label}")
    if not ok:
        failures.append(label)


def post(r: Reader, schema: str, path: str, body: dict, prefer: str | None = None) -> object:
    headers = {"apikey": r.pub, "Authorization": "Bearer " + r.token, "Accept-Profile": schema, "Content-Profile": schema,
               "Content-Type": "application/json", "User-Agent": "matrx-real-tests/1.0 (build-pb01-fixtures)"}
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(f"{r.db}/rest/v1/{path}", method="POST", data=json.dumps(body).encode(), headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode() or "null")
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code} on {schema}.{path}: {e.read().decode('utf-8', 'replace')[:300]}")


def signed_in_user(r: Reader) -> str:
    payload = r.token.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))["sub"]


def org_values(r: Reader) -> dict:
    rows = r.rows("context", "system_context_item_org_value",
                  {"system_context_item_id": f"eq.{COMPANY_NAME_ITEM}", "deleted_at": "is.null",
                   "select": "id,organization_id,value,version"})
    return {row["organization_id"]: row for row in rows}


def skill_rows(r: Reader) -> list:
    # the Skills picker's own read: active skill.definition rows the signed-in person can see (RLS)
    return r.rows("skill", "definition", {"skill_id": f"eq.{SKILL_KEY}", "is_active": "eq.true",
                                           "select": "id,skill_id,label,body,skill_type,organization_id,created_by,is_active,shown_to"})


def main() -> int:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="write nothing; read back and dry-run only")
    args = ap.parse_args()
    r = Reader()

    # 1. company_name in admin's Workspace
    vals = org_values(r)
    if WORKSPACE not in vals and not args.check:
        res = post(r, "custom", "rpc/context_value_write", {"p_payload": {
            "context_item_id": COMPANY_NAME_ITEM, "organization_id": WORKSPACE, "value": "Harborline Freight",
            "source_type": "manual"}})
        print("context_value_write:", json.dumps(res))
        vals = org_values(r)
    ws, sn = vals.get(WORKSPACE), vals.get(SAFETY_NET)
    print("admin's Workspace value:", json.dumps(ws))
    print("Safety Net value:", json.dumps(sn))
    expect("admin's Workspace company_name = Harborline Freight", bool(ws) and ws["value"] == "Harborline Freight")
    expect("Safety Net company_name row c7b17c0b = Tidewater Compass Movers",
           bool(sn) and sn["id"] == SAFETY_NET_VALUE_ROW and sn["value"] == "Tidewater Compass Movers")

    # 2. the skill
    rows = skill_rows(r)
    if not rows and not args.check:
        created = post(r, "skill", "definition", {
            "skill_id": SKILL_KEY, "label": SKILL_LABEL,
            "description": "Real-test fixture (PB-01 S18): one rule for the reply's first sentence.",
            "skill_type": "convention", "body": SKILL_RULE, "allowed_tools": [], "trigger_patterns": [],
            "disable_auto_invocation": True, "platform_targets": [], "config": {},
            "published_to_web": False, "published_to_web_at": None, "published_to_web_by": None,
            "shown_to": "only_me", "created_by": signed_in_user(r),
            "organization_id": SAFETY_NET}, prefer="return=representation")
        print("skill insert:", json.dumps(created)[:400])
        rows = skill_rows(r)
    print("skill rows (picker read):", json.dumps(rows))
    expect("exactly one active skill compass-dispatch-ref, in Safety Net Real Tests, body = the rule",
           len(rows) == 1 and rows[0]["organization_id"] == SAFETY_NET and rows[0]["body"] == SKILL_RULE)
    skill_id = rows[0]["id"] if rows else None

    # 3. install dry run of the pinned v3, skill attached as the picker attaches it
    body = {"conversation_id": str(uuid.uuid4()), "is_new": True, "is_version": True, "dry_run": True, "store": False, "organization_id": SAFETY_NET, "scope_ids": [LANE_SCOPE],
            "variables": {"initials": "RK", "carrier": CARRIER, "piano_crew": "Yes"},
            "user_input": "Move 4471: routing line, please."}
    if skill_id:
        body["skill_config"] = {"included": [skill_id], "listed": [], "forbidden": [], "disabled": False}
    req = urllib.request.Request(f"{SERVER}/ai/agents/{ROUTING_DESK_V3}", method="POST", data=json.dumps(body).encode(),
                                 headers={"Authorization": "Bearer " + r.token, "Content-Type": "application/json",
                                          "X-Organization-Id": SAFETY_NET, "User-Agent": "matrx-real-tests/1.0 (build-pb01-fixtures)",
                                          "X-Matrx-Agent-Traffic": "real-tests-build-pb01"})
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            status, raw = resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read().decode("utf-8", "replace")
    print("dry run HTTP", status, f"({len(raw)} chars)")
    if status != 200:
        print("   body:", raw[:1800])
    expect("dry run HTTP 200", status == 200)
    for needle in ("Office: Tidewater Compass Movers", "Badge: 4471", "Checked by Compass desk v3", "DR-7305"):
        expect(f"dry run holds {needle!r}", needle in raw)
    # bare "AI Matrx" is not a fault: the platform's turn-context framing says "the AI Matrx platform" and the organization
    # catalog lists an organization named "AI Matrx"; the platform default of company_name shows as `Office: AI Matrx`
    for needle in ("Harborline", "Office: AI Matrx", "7319", "Checked by Compass desk v5"):
        n = raw.count(needle)
        expect(f"dry run holds no {needle!r} ({n} found)", n == 0)
        if n:
            i = raw.find(needle)
            print("   context:", raw[max(0, i - 160):i + 80].replace("\n", " "))
    print(f"result: {'all read back' if not failures else str(len(failures)) + ' failed: ' + '; '.join(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
