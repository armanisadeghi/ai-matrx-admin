#!/usr/bin/env python3
# matrx-agent-traffic: marked every server request carries X-Matrx-Agent-Traffic: real-tests-pb05-send
"""Send the one call of real test PB-05 (core-chain, files) to the LIVE server as admin@admin.com.

It only SENDS. It asserts nothing and prints no pass or fail: a runner executes it, a grader reads the
database. Before it sends it prints and saves (run-identity.json) the live server's commit, the UTC
start time and the fixture ids it uses.

One call: POST /ai/agents/<Alder Creek Receiving Desk>, a new stored conversation in the active organization
Safety Net Real Tests, whose user input is one typed sentence plus five attachments sent the way the web app
sends them ({"type": "media", "kind": "document" | "image", "file_id": ...}): a PDF, a photo, a CSV, a long
text and a Word document, all uploaded earlier through the product's file door into that organization. The
raw response body, its HTTP status and headers and the conversation id are written to call.json in the
output directory (default: a new temp directory, printed at the end).

Usage:
  pb05-send.py                 send the call
  pb05-send.py --out DIR       write the response file to DIR

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
    args = ap.parse_args()
    out = Path(args.out) if args.out else Path(tempfile.mkdtemp(prefix="pb05-"))
    out.mkdir(parents=True, exist_ok=True)
    record_run_identity("pb05-send", SERVER, {"organization": ORG, "agent": AGENT,
                                              "files": [file_id for _, file_id in ATTACHMENTS]}, out)
    token = admin_token()
    cid = str(uuid.uuid4())
    user_input = [{"type": "text", "text": MESSAGE}] + [
        {"type": "media", "kind": kind, "file_id": file_id} for kind, file_id in ATTACHMENTS
    ]
    path = f"/ai/agents/{AGENT}"
    body = {"conversation_id": cid, "is_new": True, "store": True, "organization_id": ORG, "user_input": user_input}
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
