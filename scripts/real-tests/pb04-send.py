#!/usr/bin/env python3
# matrx-agent-traffic: marked every server request carries X-Matrx-Agent-Traffic: real-tests-pb04-send
"""Send the two turns of real test PB-04 (core-chain, turn two) to the LIVE server as admin@admin.com.

It only SENDS and WRITES the between-turn data. It asserts nothing and prints no pass or fail: a runner
executes it, a grader reads the database. Spec: common-docs/operations/real-tests/core-chain/PB-04-turn-two.md
(STEPS); fixture ids: core-chain LEDGER.md "PB-04 fixtures".

A run:
  1. Turn 1 — POST /ai/agents/<Kestrel Dock Desk> (new stored conversation, active organization Safety Net
     Real Tests, scope Stockton cold dock) with the typed variable driver_name and the carrier pick-list
     reference (Bluewater Reefer, its CURRENT item id looked up by label).
  2. Between the turns — three writes through the product's own store doors, as admin, printed as they land:
     the Bluewater Reefer hidden text (custom.pick_list_update), the APT-3318 hold code
     (custom.record_update) and the Stockton cold dock status (custom.context_value_write). Then it waits
     --between seconds (default 60) before turn 2, on every run.
  3. Turn 2 — POST /ai/conversations/<conversation id> (the continuation door) with a typed message and the
     same scope.
Each raw response body, its HTTP status and headers are written to turn-1.json / turn-2.json, and every
between-turn write with its raw result to between.json, in the output directory (default: a new temp dir).

Usage:
  pb04-send.py                    one run (turn 1, between-turn writes, wait, turn 2)
  pb04-send.py --out DIR          write the response files to DIR
  pb04-send.py --between 90       wait 90 s between the writes and turn 2
  pb04-send.py --reset all        write the START state back (hidden text, hold code, dock status) and print
                                  what the store now holds; sends no turn
  pb04-send.py --reset dock       write only the start dock status back

Sign-in: a one-time magic-link token for admin@admin.com minted with the live project's secret key
(matrx-frontend/.env.local, never printed), the same way pb03-send.py does.
"""
from __future__ import annotations

import argparse
import json
import tempfile
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

SERVER = "https://server.app.matrxserver.com"
ORG = "226be635-194d-42dd-87c8-7a9562f70939"  # Safety Net Real Tests (the real tests' own organization)
AGENT = "29162da7-331b-4736-b05d-51afecc60e7d"  # Kestrel Dock Desk — Claude Haiku 5.5
DOCK_SCOPE = "90a18213-5bed-432b-af46-d58f971eac99"  # scope "Stockton cold dock" (type Docks)
DOCK_STATUS_ITEM = "55105684-f39f-4b86-bffb-f215fab69e28"  # context item dock_status
PICK_LIST = "8ebbac58-96a5-46b8-9bb6-5b2b8fad715d"  # "Kestrel carriers"
HOLDS_TABLE = "0fc3df59-20b8-4db4-971c-962dbf9d8431"  # "Kestrel appointment holds"
APT_3318 = "8ad69d91-0570-4477-a54b-6ef3ca25f0e2"  # row APT-3318

DRIVER = "Teodora Vass"
TURN_2 = (
    "The driver called again. Send the line once more, and quote this back to me exactly: "
    "{{carrier}} / {{hold_code}}"
)

# The pick list's items, rewritten whole by custom.pick_list_update (it gives every item a new id).
ITEMS_START = [
    {"label": "Bluewater Reefer", "description": "Bluewater trailers unload at door 6; their yard contact is Odile."},
    {"label": "Tri-Valley Freight", "description": "Tri-Valley trailers unload at door 2; their yard contact is Hiroshi."},
    {"label": "Sutter Line", "description": "Sutter Line trailers unload at door 9; their yard contact is Marguerite."},
]
ITEMS_CHANGED = [dict(ITEMS_START[0], description="Bluewater trailers unload at door 11; their yard contact is Bram.")] + ITEMS_START[1:]
HOLD_START, HOLD_CHANGED = "HLD-7724", "HLD-7790"
DOCK_START = "The blast-freezer compressor is down; reefer trailers hold in the north lane until 14:00."
DOCK_CHANGED = "The blast-freezer compressor is back up since 11:40; reefer trailers unload on arrival."


def _env() -> dict:
    env = {}
    for line in (Path.home() / "code/matrx-frontend/.env.local").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"')
    return env


ENV = _env()
DB = ENV["NEXT_PUBLIC_SUPABASE_URL"]
PUB = ENV["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]


def admin_token() -> str:
    secret = ENV["SUPABASE_SECRET_KEY"]
    req = urllib.request.Request(
        DB + "/auth/v1/admin/generate_link",
        data=json.dumps({"type": "magiclink", "email": "admin@admin.com"}).encode(),
        headers={"apikey": secret, "Authorization": "Bearer " + secret, "Content-Type": "application/json"},
    )
    d = json.load(urllib.request.urlopen(req))
    hashed = d.get("hashed_token") or d.get("properties", {}).get("hashed_token")
    req = urllib.request.Request(
        DB + "/auth/v1/verify",
        data=json.dumps({"type": "magiclink", "token_hash": hashed}).encode(),
        headers={"apikey": PUB, "Content-Type": "application/json"},
    )
    return json.load(urllib.request.urlopen(req))["access_token"]


def _call(method: str, url: str, token: str, body: dict | None, extra: dict) -> tuple[int, dict, str]:
    headers = {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "User-Agent": "matrx-real-tests/1.0 (pb04-send)",
        "X-Matrx-Agent-Traffic": "real-tests-pb04-send",
        **extra,
    }
    req = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(), headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=900)
        return resp.status, dict(resp.headers), resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")


def server(token: str, path: str, body: dict) -> tuple[int, dict, str]:
    return _call("POST", SERVER + path, token, body, {"X-Organization-Id": ORG})


def store(token: str, fn: str, args: dict) -> dict:
    """One call to a custom.* store door through the database's own API, as admin (RLS person write)."""
    status, _, raw = _call(
        "POST", f"{DB}/rest/v1/rpc/{fn}", token, args,
        {"apikey": PUB, "Content-Profile": "custom", "Accept-Profile": "custom"},
    )
    return {"door": f"custom.{fn}", "args": args, "status": status, "raw": raw, "at": datetime.now(timezone.utc).isoformat()}


def bluewater_item_id(token: str) -> str | None:
    """The CURRENT id of the Bluewater Reefer item (pick_list_update gives items new ids on every edit)."""
    r = store(token, "pick_list_get", {"p_list_id": PICK_LIST})
    doc = json.loads(r["raw"]) if r["status"] == 200 else {}
    for group in (doc.get("items_grouped") or {}).values():
        for item in group:
            if item.get("label") == "Bluewater Reefer":
                return item.get("id")
    return None


def carrier_reference(item_id: str | None) -> str:
    ref = {"__kind": "directive_v1_reference_pick_list_item",
           "items": [{"list_id": PICK_LIST, "item_id": item_id, "label": "Bluewater Reefer"}]}
    return "```matrx\n" + json.dumps(ref, separators=(",", ":")) + "\n```"


def write_hidden_text(token: str, items: list[dict]) -> dict:
    return store(token, "pick_list_update", {"p_list_id": PICK_LIST, "p_list_name": None, "p_description": None, "p_items": items})


def write_hold(token: str, code: str) -> dict:
    return store(token, "record_update", {"p_organization_id": ORG, "p_record_id": APT_3318,
                                          "p_patch": {"hold_code": code}, "p_expected_version": None})


def write_dock(token: str, text: str, why: str) -> dict:
    return store(token, "context_value_write", {"p_payload": {
        "context_item_id": DOCK_STATUS_ITEM, "scope_id": DOCK_SCOPE, "value_text": text,
        "source_type": "manual", "change_summary": why}})


def show_store(token: str) -> None:
    """Print what the three sources hold now, through the store's read doors (raw; nothing is judged)."""
    for label, fn, args in [
        ("Kestrel carriers", "pick_list_get", {"p_list_id": PICK_LIST}),
        ("APT-3318 hold_code", "value_read", {"p_organization_id": ORG, "p_record_id": APT_3318, "p_key": "hold_code"}),
        ("Stockton cold dock dock_status", "value_read", {"p_organization_id": ORG, "p_record_id": DOCK_SCOPE, "p_key": "dock_status"}),
    ]:
        r = store(token, fn, args)
        print(f"  {label}: HTTP {r['status']} {r['raw'][:600]}")


def save(out: Path, name: str, record: dict) -> None:
    (out / name).write_text(json.dumps(record, indent=1, ensure_ascii=False))
    print(f"wrote {out / name}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--out", help="directory for the response files (default: a new temp dir)")
    ap.add_argument("--between", type=int, default=60, help="seconds to wait after the between-turn writes (default 60)")
    ap.add_argument("--reset", choices=["all", "dock"], help="write the start state back and send no turn")
    args = ap.parse_args()
    token = admin_token()

    if args.reset:
        if args.reset == "all":
            for r in [write_hidden_text(token, ITEMS_START), write_hold(token, HOLD_START),
                      write_dock(token, DOCK_START, "Real-tests PB-04 start state")]:
                print(f"{r['door']}: HTTP {r['status']}")
        else:
            r = write_dock(token, DOCK_START, "Real-tests PB-04 start state")
            print(f"{r['door']}: HTTP {r['status']} at {r['at']}")
        print("store now holds:")
        show_store(token)
        return

    out = Path(args.out) if args.out else Path(tempfile.mkdtemp(prefix="pb04-"))
    out.mkdir(parents=True, exist_ok=True)
    cid = str(uuid.uuid4())

    # Turn 1 — the agent door.
    item_id = bluewater_item_id(token)
    body1 = {"conversation_id": cid, "is_new": True, "store": True, "organization_id": ORG,
             "scope_ids": [DOCK_SCOPE], "variables": {"driver_name": DRIVER, "carrier": carrier_reference(item_id)}}
    sent1 = datetime.now(timezone.utc).isoformat()
    status, headers, raw = server(token, f"/ai/agents/{AGENT}", body1)
    lower = {k.lower(): v for k, v in headers.items()}
    cid = lower.get("x-conversation-id") or cid
    save(out, "turn-1.json", {"turn": 1, "sent_at": sent1, "request": {"method": "POST", "url": f"{SERVER}/ai/agents/{AGENT}",
         "organization": ORG, "body": body1}, "status": status, "conversation_id": cid,
         "request_id": lower.get("x-request-id"), "headers": headers, "raw_response": raw})
    print(f"turn 1: HTTP {status}, conversation {cid}")

    # Between the turns — the sender changes the stored sources itself, through the product's store doors.
    print("between turns: writing through the product's store doors (as admin):")
    writes = [
        write_hidden_text(token, ITEMS_CHANGED),
        write_hold(token, HOLD_CHANGED),
        write_dock(token, DOCK_CHANGED, "Real-tests PB-04 between turns"),
    ]
    for w in writes:
        print(f"  {w['door']}: HTTP {w['status']} at {w['at']}")
    save(out, "between.json", {"writes": writes})
    print("store now holds:")
    show_store(token)
    print(f"between turns: waiting {args.between} s before turn 2 (started {datetime.now(timezone.utc).isoformat()})", flush=True)
    time.sleep(args.between)

    # Turn 2 — the continuation door.
    body2 = {"user_input": TURN_2, "scope_ids": [DOCK_SCOPE], "organization_id": ORG}
    sent2 = datetime.now(timezone.utc).isoformat()
    status, headers, raw = server(token, f"/ai/conversations/{cid}", body2)
    lower = {k.lower(): v for k, v in headers.items()}
    save(out, "turn-2.json", {"turn": 2, "sent_at": sent2, "request": {"method": "POST", "url": f"{SERVER}/ai/conversations/{cid}",
         "organization": ORG, "body": body2}, "status": status, "conversation_id": cid,
         "request_id": lower.get("x-request-id"), "headers": headers, "raw_response": raw})
    print(f"turn 2: HTTP {status}, conversation {cid}")
    print(f"responses in {out}")


if __name__ == "__main__":
    main()
