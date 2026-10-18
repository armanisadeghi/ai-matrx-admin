#!/usr/bin/env python3
# matrx-agent-traffic: marked every server request carries X-Matrx-Agent-Traffic: real-tests-pb03-send
"""Send the calls of real test PB-03 (core-chain, unsupported settings) to the LIVE server as admin@admin.com.

It only SENDS. It asserts nothing and prints no pass or fail: a runner executes it, a grader reads the
database. Spec: common-docs/operations/real-tests/core-chain/PB-03-unsupported-settings.md (STEPS); fixture
ids: core-chain LEDGER.md "PB-03 fixtures".

One call per copy: POST /ai/agents/<Settings Desk A|O|G>, active organization Safety Net Real Tests, scope Port of
Oakland lane, the same variables on every copy. Each raw response body, its HTTP status, the response
headers and the conversation id are written to call-<copy>.json in the output directory (default: a new
temp directory, printed at the end).

Usage:
  pb03-send.py                 send A, O, G in order
  pb03-send.py --only O        send one copy only
  pb03-send.py --out DIR       write the response files to DIR

Sign-in: a one-time magic-link token for admin@admin.com minted with the live project's secret key
(matrx-frontend/.env.local, never printed), the same way signin.py and pb02-send.py do.
"""
from __future__ import annotations

import argparse
import json
import tempfile
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

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


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--only", choices=sorted(COPIES), help="send one copy (A, O or G)")
    ap.add_argument("--out", help="directory for the response files (default: a new temp dir)")
    args = ap.parse_args()
    out = Path(args.out) if args.out else Path(tempfile.mkdtemp(prefix="pb03-"))
    out.mkdir(parents=True, exist_ok=True)
    token = admin_token()
    for copy in [args.only] if args.only else ["A", "O", "G"]:
        cid = str(uuid.uuid4())
        path = f"/ai/agents/{COPIES[copy]}"
        body = {"conversation_id": cid, "is_new": True, "store": True, "organization_id": ORG,
                "scope_ids": [PORT_OF_OAKLAND_LANE], "variables": VARIABLES}
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
    print(f"responses in {out}")


if __name__ == "__main__":
    main()
