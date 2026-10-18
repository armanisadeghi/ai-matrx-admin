#!/usr/bin/env python3
# matrx-agent-traffic: marked every server request carries X-Matrx-Agent-Traffic: real-tests-pb05-send
"""Send the one call of real test PB-05 (core-chain, files) to the LIVE server as admin@admin.com.

It only SENDS. It asserts nothing and prints no pass or fail: a runner executes it, a grader reads the
database. Before it sends it prints and saves (run-identity.json) the live server's commit, the UTC
start time and the fixture ids it uses.

One call: POST /ai/agents/<Alder Creek Receiving Desk>, a new stored conversation in the active organization
Safety Net Real Tests, whose user input is one typed sentence plus five attachments sent the way the web app
sends them ({"type": "media", "kind": "document" | "image", "file_id": ...}): a PDF, a photo, a CSV, a long
text and a Word document, all uploaded earlier through the product's file door into that organization. Four
internal resources ride with them as the web app attaches them: a note (input_notes), a published web page
(input_webpage), one row of a data table (input_table, a table_row bookmark) and a task (input_task). The
raw response body, its HTTP status and headers and the conversation id are written to call.json in the
output directory (default: a new temp directory, printed at the end).

Usage:
  pb05-send.py                 send the call
  pb05-send.py --out DIR       write the response file to DIR
  pb05-send.py --dry-run       no model call: the request goes with dry_run true and the assembled request is
                               returned; nothing is stored

Sign-in: a one-time magic-link token for admin@admin.com minted with the live project's secret key
(matrx-frontend/.env.local, never printed), the same way pb03-send.py does.
"""
from __future__ import annotations

import argparse
import json
import sys
import tempfile
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_identity import record_run_identity  # noqa: E402
from fixture_check import add_accept_drift_arg, require_fixtures  # noqa: E402

SERVER = "https://server.app.matrxserver.com"
ORG = "226be635-194d-42dd-87c8-7a9562f70939"  # Safety Net Real Tests (the real tests' own organization)
AGENT = "3d9d94fc-2867-4477-93b7-e7ac6be6a01e"  # Alder Creek Receiving Desk — Claude Haiku 5.5 (sees images)

MESSAGE = "The Lodi Orchards Cooperative delivery is at the door. Receiving line, please."
ATTACHMENTS = [  # in this order, as the composer would send five attached files
    ("document", "fd6656e3-a078-4c92-9544-5f987161ab47"),  # inbound-handling-procedures.pdf
    ("image", "4e01f58b-704a-4ac1-86f5-11b32c5cbf92"),  # IMG_2291.jpg
    ("document", "ff66152f-707a-454d-988e-afaccea05eb1"),  # inbound-oct16.csv
    ("document", "7c3a7fe7-7162-4cd2-a63b-1849c1f304f0"),  # night-shift-log.txt
    ("document", "e820ba04-0fdc-4adf-a139-e98601e6339a"),  # handover-note.docx
]
# The four internal resources, all in Safety Net Real Tests (built 2026-10-18; ids in LEDGER.md "PB-05 fixtures").
NOTE_ID = "c208c61b-0cc2-4b78-a8f4-f19d29604795"  # note "Alder Creek dock memo"
PAGE_URL = "https://www.aimatrx.com/p/e/note/fa4fa742-0c88-44e0-985c-ea0d0c3c7ed1"  # published page "Alder Creek pickup window"
TABLE_ID = "a318afb1-de90-4eb6-9e37-e437dfea76b5"  # table "Alder Creek grower gates"
TABLE_NAME = "Alder Creek grower gates"
ROW_ID = "d1a2fd40-0a7f-4e5a-840d-f2b5df794875"  # its row for the Lodi origin
TASK_ID = "244bd30d-27c2-4929-9821-7237bf371892"  # task "Re-probe Lodi pallets"
INTERNAL_PARTS = [
    {"type": "input_notes", "note_ids": [NOTE_ID]},
    {"type": "input_webpage", "urls": [PAGE_URL]},
    {"type": "input_table", "bookmarks": [{"type": "table_row", "table_id": TABLE_ID, "row_id": ROW_ID, "table_name": TABLE_NAME}]},
    {"type": "input_task", "task_ids": [TASK_ID]},
]


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
            "User-Agent": "matrx-real-tests/1.0 (pb05-send)",
            "X-Matrx-Agent-Traffic": "real-tests-pb05-send",
        },
    )
    try:
        resp = urllib.request.urlopen(req, timeout=900)
        return resp.status, dict(resp.headers), resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    ap.add_argument("--out", help="directory for the response file (default: a new temp dir)")
    ap.add_argument("--dry-run", action="store_true", help="no model call: send with dry_run true (see the header)")
    add_accept_drift_arg(ap)
    args = ap.parse_args()
    fx = require_fixtures("PB-05", args.accept_drift)
    out = Path(args.out) if args.out else Path(tempfile.mkdtemp(prefix="pb05-"))
    out.mkdir(parents=True, exist_ok=True)
    record_run_identity("pb05-send --dry-run" if args.dry_run else "pb05-send", SERVER, {"organization": ORG, "agent": AGENT,
                                              "files": [file_id for _, file_id in ATTACHMENTS],
                                              "note": NOTE_ID, "page": PAGE_URL, "table": TABLE_ID, "row": ROW_ID,
                                              "task": TASK_ID}, out, fixture_check=fx)
    token = admin_token()
    cid = str(uuid.uuid4())
    user_input = [{"type": "text", "text": MESSAGE}] + [
        {"type": "media", "kind": kind, "file_id": file_id} for kind, file_id in ATTACHMENTS
    ] + INTERNAL_PARTS
    path = f"/ai/agents/{AGENT}"
    body = {"conversation_id": cid, "is_new": True, "store": True, "organization_id": ORG, "user_input": user_input}
    if args.dry_run:
        body["dry_run"] = True
    sent_at = datetime.now(timezone.utc).isoformat()
    status, headers, raw = send(token, path, body)
    lower = {k.lower(): v for k, v in headers.items()}
    record = {
        "agent_id": AGENT,
        "sent_at": sent_at,
        "request": {"method": "POST", "url": SERVER + path, "organization": ORG, "body": body},
        "status": status,
        "conversation_id": lower.get("x-conversation-id") or cid,
        "request_id": lower.get("x-request-id"),
        "headers": headers,
        "raw_response": raw,
    }
    path_out = out / "call.json"
    path_out.write_text(json.dumps(record, indent=1, ensure_ascii=False))
    print(f"HTTP {status}, conversation {record['conversation_id']}, wrote {path_out}")
    print(f"responses in {out}")


if __name__ == "__main__":
    main()
