#!/usr/bin/env python3
# matrx-agent-traffic: marked every server request carries X-Matrx-Agent-Traffic: real-tests-pb03-send
"""Send the calls of real test PB-03 (core-chain, unsupported settings) to the LIVE server as admin@admin.com.

It only SENDS. It asserts nothing and prints no pass or fail: a runner executes it, a grader reads the
database. Before it sends it prints and saves (run-identity.json) the live server's commit, the UTC
start time and the fixture ids it uses.

One call per copy: POST /ai/agents/<Settings Desk A|O|G>, active organization Safety Net Real Tests, scope Port of
Oakland lane, the same variables on every copy. Each raw response body, its HTTP status, the response
headers and the conversation id are written to call-<copy>.json in the output directory (default: a new
temp directory, printed at the end).

What the stored request is. The product exposes no capture of the bytes actually sent to a provider:
chat.request_snapshot.request_payload is the provider adapter's own copy, taken in matrx_ai send_once
(capture_request_payload), not an HTTP-level record. After each call this script reads that stored copy
(as admin, through the database's own API), saves it to snapshot-<copy>.json and prints one line naming
what it is, so nobody mistakes it for the wire:
  The stored shape (JSON object, or a text string) is read from the stored row at run time and printed;
  nothing is assumed per provider. Anthropic's copy is also captured before a later step (the grammar-budget
  ladder) may change the request; OpenAI's is the adapter's request dict. No provider has a wire capture.

Usage:
  pb03-send.py                 send A, O, G in order
  pb03-send.py --only O        send one copy only
  pb03-send.py --out DIR       write the response files to DIR
  pb03-send.py --dry-run       no model call: each copy goes with dry_run true; no snapshot is read
  --agent LETTER=ID            REQUIRED for every copy sent: the disposable agent made for the run (pb03-disposables.py create);
                               before sending, pb03_gate.py reads it and refuses unless its settings equal the sealed block,
                               its definition equals source copy A/O/G, and it is in Safety Net Real Tests and not a shared agent
  --accept-drift REASON        send although the FIXTURE check (shared A/O/G vs the manifest) found differences (printed and
                               recorded); it never bypasses the disposable gate

Sign-in: a one-time magic-link token for admin@admin.com minted with the live project's secret key
(matrx-frontend/.env.local, never printed), the same way signin.py and pb02-send.py do.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
import time
import urllib.parse
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_identity import record_run_identity  # noqa: E402
from fixture_check import Reader, add_accept_drift_arg, require_fixtures  # noqa: E402
from pb03_gate import gate_counted  # noqa: E402

SERVER = "https://server.app.matrxserver.com"
ORG = "226be635-194d-42dd-87c8-7a9562f70939"  # Safety Net Real Tests (the real tests' own organization)
PORT_OF_OAKLAND_LANE = "9a4e5ff6-833a-4b6d-986b-26eaf3893e28"  # scope (type Lanes)
COPIES = {
    "A": "dc479b11-c274-4d80-b4ae-3f8db31f9721",  # Settings Desk A — claude-haiku-5-5
    "O": "9f6bf0cd-f555-4c3a-a87c-2a66a6c52453",  # Settings Desk O — gpt-5-nano
    "G": "95e4fec5-b7bb-495e-868a-3b3da74ea2f7",  # Settings Desk G — gemini-flash-lite-latest
}

CARRIER = (
    "```matrx\n"
    '{"__kind":"directive_v1_reference_pick_list_item","items":[{"list_id":"3a881421-95f0-425f-a7b6-2ad274f66d97",'
    '"item_id":"9dbf0fe5-e08a-4101-b5d3-f37b279548e5","label":"Pacific Crest"}]}\n'
    "```"
)
VARIABLES = {
    "move_number": "4471",
    "destination": "Mexico City",
    "window": "Oct 14 06:00–09:00",
    "dispatcher_initials": "RK",
    "carrier": CARRIER,
    "piano_crew": "Yes",
    "customs_notes": "",
}


def _env() -> dict:
    env = {}
    for line in (Path.home() / "code/matrx-frontend/.env.local").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"')
    return env


def admin_token() -> str:
    env = _env()
    url, secret, pub = env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SECRET_KEY"], env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
    req = urllib.request.Request(
        url + "/auth/v1/admin/generate_link",
        data=json.dumps({"type": "magiclink", "email": "admin@admin.com"}).encode(),
        headers={"apikey": secret, "Authorization": "Bearer " + secret, "Content-Type": "application/json"},
    )
    d = json.load(urllib.request.urlopen(req))
    hashed = d.get("hashed_token") or d.get("properties", {}).get("hashed_token")
    req = urllib.request.Request(
        url + "/auth/v1/verify",
        data=json.dumps({"type": "magiclink", "token_hash": hashed}).encode(),
        headers={"apikey": pub, "Content-Type": "application/json"},
    )
    return json.load(urllib.request.urlopen(req))["access_token"]


def send(token: str, path: str, body: dict) -> tuple[int, dict, str]:
    req = urllib.request.Request(
        SERVER + path,
        method="POST",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "X-Organization-Id": ORG,
            "User-Agent": "matrx-real-tests/1.0 (pb03-send)",
            "X-Matrx-Agent-Traffic": "real-tests-pb03-send",
        },
    )
    try:
        resp = urllib.request.urlopen(req, timeout=900)
        return resp.status, dict(resp.headers), resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")


# What the stored request is. Only facts that hold for every build are static; the stored shape is read at run time.
NOT_WIRE_COMMON = ("the product exposes no HTTP-level capture, so this is the adapter's own stored copy, not the bytes "
                   "sent")
PROVIDER_NOTE = {
    "anthropic": "it is captured before a later step (the grammar-budget ladder) may change what is sent",
    "openai": "it is the adapter's request dict",
    "google": "",
}


def shape_of(payload) -> str:
    """The stored shape, from the value itself: a JSON object, a JSON list, or a text string (a Python repr is a
    string that does not parse as JSON)."""
    if isinstance(payload, dict):
        return "a JSON object"
    if isinstance(payload, list):
        return "a JSON list"
    if isinstance(payload, str):
        try:
            json.loads(payload)
            return "a JSON text string"
        except ValueError:
            return "a text string that is not JSON (for example a Python repr)"
    return f"a {type(payload).__name__}"


def not_wire_line(provider: str, payload=None, have_payload: bool = False) -> str:
    shape = f"request_payload is stored as {shape_of(payload)}; " if have_payload else ""
    extra = PROVIDER_NOTE.get(provider, "")
    return f"snapshot for provider {provider}: {shape}{NOT_WIRE_COMMON}" + (f"; {extra}" if extra else "")


COPY_PROVIDER = {"A": "anthropic", "O": "openai", "G": "google"}


def stored_snapshots(token: str, cid: str, wait_s: int = 30) -> tuple[int, list]:
    """The conversation's stored request copies (chat.request_snapshot), read as admin through the database's
    own API. Polls up to ``wait_s`` seconds: the copy is written after the run finishes."""
    env = _env()
    query = urllib.parse.urlencode({"conversation_id": f"eq.{cid}", "select": "iteration,provider,created_at,request_payload",
                                    "order": "created_at.asc"})
    req = urllib.request.Request(
        env["NEXT_PUBLIC_SUPABASE_URL"] + "/rest/v1/request_snapshot?" + query,
        headers={"Authorization": "Bearer " + token, "apikey": env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
                 "Accept-Profile": "chat", "User-Agent": "matrx-real-tests/1.0 (pb03-send)"},
    )
    deadline = time.time() + wait_s
    while True:
        try:
            rows = json.loads(urllib.request.urlopen(req, timeout=60).read().decode())
            status = 200
        except urllib.error.HTTPError as e:
            return e.code, [{"_read_error": e.read().decode("utf-8", "replace")[:500]}]
        if rows or time.time() >= deadline:
            return status, rows
        time.sleep(3)


def describe_snapshot(copy: str, status: int, rows: list) -> list:
    """Lines naming what the stored copy is (never a judgment of the settings it holds)."""
    if status != 200:
        return [f"copy {copy}: stored request copy unreadable (HTTP {status}) {rows[0] if rows else ''}"]
    if not rows:
        return [f"copy {copy}: no stored request copy found for this conversation",
                f"copy {copy}: " + not_wire_line(COPY_PROVIDER[copy])]
    lines = []
    for r in rows:
        payload = r.get("request_payload")
        form = "a JSON object" if isinstance(payload, dict) else f"a {type(payload).__name__}"
        provider = (r.get("provider") or COPY_PROVIDER[copy]).lower()
        lines.append(f"copy {copy}: stored request copy iteration {r.get('iteration')} provider {provider}, "
                     f"request_payload stored as {form}")
        lines.append(f"copy {copy}: " + not_wire_line(provider, payload, True))
    return lines


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    ap.add_argument("--only", choices=sorted(COPIES), help="send one copy (A, O or G)")
    ap.add_argument("--out", help="directory for the response files (default: a new temp dir)")
    ap.add_argument("--dry-run", action="store_true",
                    help="no model call: each copy goes with dry_run true (nothing stored, so no snapshot is read)")
    ap.add_argument("--agent", action="append", default=[], metavar="LETTER=ID",
                    help="send letter A, O or G to this agent instead of the shared Settings Desk one (a disposable agent made for the run)")
    add_accept_drift_arg(ap)
    args = ap.parse_args()
    for pair in args.agent:
        letter, _, agent_id = pair.partition("=")
        if letter not in COPIES or not agent_id:
            ap.error(f"--agent wants LETTER=ID with LETTER one of {sorted(COPIES)}")
        COPIES[letter] = agent_id
    copies = [args.only] if args.only else ["A", "O", "G"]
    given = {pair.partition("=")[0] for pair in args.agent}
    if sorted(set(copies) - given):
        # Arman's ruling 2026-10-19: Settings Desk A, O and G are shared live agents at reasoning_effort low; PB-03 sends
        # only to disposable agents made for the run (pb03-disposables.py create).
        sys.exit(f"REFUSED: no --agent for copy {', '.join(sorted(set(copies) - given))}: PB-03 sends only to disposable agents "
                 "(--agent A=<id> --agent O=<id> --agent G=<id>), never the shared Settings Desk agents")
    reader = Reader()  # one sign-in serves the fixture check, the disposable gate and every send
    fx = require_fixtures("PB-03", args.accept_drift, reader)  # the shared A/O/G still equal the manifest
    # Disposable gate, before any send: settings = the sealed block, definition = source copy, org + not shared.
    # --accept-drift does not reach it.
    if args.accept_drift:
        print("disposable gate: --accept-drift covers the fixture check only; it does NOT bypass this gate")
    diffs, accepted = gate_counted(reader, {c: COPIES[c] for c in copies})
    for d in diffs:
        print(f"disposable gate: DIFF {d}")
    if diffs:
        sys.exit(f"disposable gate: REFUSED to send, {len(diffs)} difference(s)")
    print(f"disposable gate: PASS for {', '.join(f'{c}={COPIES[c]}' for c in copies)}"
          + (f" ({accepted} difference(s) accepted)" if accepted else ""))
    out = Path(args.out) if args.out else Path(tempfile.mkdtemp(prefix="pb03-"))
    out.mkdir(parents=True, exist_ok=True)
    record_run_identity("pb03-send --dry-run" if args.dry_run else "pb03-send", SERVER,
                        {"organization": ORG, "scope": PORT_OF_OAKLAND_LANE, **{f"copy_{k}": v for k, v in COPIES.items()}},
                        out, fixture_check=fx)
    token = reader.token
    for copy in copies:
        cid = str(uuid.uuid4())
        path = f"/ai/agents/{COPIES[copy]}"
        body = {"conversation_id": cid, "is_new": True, "store": True, "organization_id": ORG,
                "scope_ids": [PORT_OF_OAKLAND_LANE], "variables": VARIABLES}
        if args.dry_run:
            body["dry_run"] = True
        sent_at = datetime.now(timezone.utc).isoformat()
        status, headers, raw = send(token, path, body)
        lower = {k.lower(): v for k, v in headers.items()}
        record = {
            "copy": copy,
            "agent_id": COPIES[copy],
            "sent_at": sent_at,
            "request": {"method": "POST", "url": SERVER + path, "organization": ORG, "body": body},
            "status": status,
            "conversation_id": lower.get("x-conversation-id") or cid,
            "request_id": lower.get("x-request-id"),
            "headers": headers,
            "raw_response": raw,
        }
        path_out = out / f"call-{copy}.json"
        path_out.write_text(json.dumps(record, indent=1, ensure_ascii=False))
        print(f"copy {copy}: HTTP {status}, conversation {record['conversation_id']}, wrote {path_out}")
        if args.dry_run:
            continue  # a dry run stores nothing: there is no snapshot to read
        snap_status, snaps = stored_snapshots(token, record["conversation_id"])
        snap_out = out / f"snapshot-{copy}.json"
        snap_out.write_text(json.dumps({"copy": copy, "conversation_id": record["conversation_id"], "read_status": snap_status,
                                        "not_wire": [not_wire_line((r.get("provider") or COPY_PROVIDER[copy]).lower(), r.get("request_payload"), True)
                                                     for r in snaps if isinstance(r, dict) and "request_payload" in r] or not_wire_line(COPY_PROVIDER[copy]),
                                        "rows": snaps},
                                       indent=1, ensure_ascii=False, default=str))
        for line in describe_snapshot(copy, snap_status, snaps):
            print(line)
        print(f"copy {copy}: wrote {snap_out}")
    print(f"responses in {out}")


if __name__ == "__main__":
    main()
