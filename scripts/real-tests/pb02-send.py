#!/usr/bin/env python3
# matrx-agent-traffic: marked every server request carries X-Matrx-Agent-Traffic: real-tests-pb02-send
"""Send the six calls of real test PB-02 (core-chain, mandate doors) to the LIVE server as admin@admin.com.

It only SENDS. It asserts nothing and prints no pass or fail: a runner executes it, a grader reads the
database. Before it sends it prints and saves (run-identity.json) the live server's commit, the UTC
start time and the fixture ids it uses.

Every call carries the same state payload S (the eight provision values). Each raw response body, its
HTTP status, the response headers and the conversation id are written to one JSON file per call in the
output directory (default: a new temp directory, printed at the end).

  0  POST /mandates/realtests.routing_line/placement   preview, no model call (holder = the one the ladder
                                                      resolves for admin now, read from /resolution)
  1  POST /ai/mandates/realtests.routing_line           client door, active organization Safety Net Real Tests
  2  POST /mandates/realtests.routing_line/try          try door, the binding that runs for admin now
  3  POST /workflows/<Compass routing via mandate>/runs   workflow door, S as the run inputs
  4  POST /ai/agents/<Compass Dispatcher>             agent calls the mandate (mandate_call), S as variables
  5  POST /ai/mandates/realtests.routing_line           client door again, active organization admin's Workspace

Usage:
  pb02-send.py                 send 0..5 in order
  pb02-send.py --only 3        send call 3 only
  pb02-send.py --out DIR       write the response files to DIR

Sign-in: a one-time magic-link token for admin@admin.com minted with the live project's secret key
(matrx-frontend/.env.local, never printed), the same way signin.py does.
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
KEY = "realtests.routing_line"  # was compass.routing_line in Compass; mandate keys are global
ORG = "226be635-194d-42dd-87c8-7a9562f70939"  # Safety Net Real Tests (the real tests' own organization)
WORKSPACE = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f"  # admin's Workspace
WORKFLOW = "1fef39d6-bd61-4d74-8ad9-3930b9ce3859"  # "Compass routing via mandate"
DISPATCHER = "53661c82-052e-4569-b151-49a016a7dba9"  # agent "Compass Dispatcher"
DISPATCHER_MESSAGE = "Fill the routing line for this move."

CARRIER = (
    "```matrx\n"
    '{"__kind":"directive_v1_reference_pick_list_item","items":[{"list_id":"3a881421-95f0-425f-a7b6-2ad274f66d97",'
    '"item_id":"9dbf0fe5-e08a-4101-b5d3-f37b279548e5","label":"Pacific Crest"}]}\n'
    "```"
)
S = {
    "move_number": "4471",
    "destination_city": "Mexico City",
    "delivery_window": "Oct 14 06:00–09:00",
    "dispatcher_initials": "RK",
    "carrier": CARRIER,
    "piano_crew": "Yes",
    "customs_notes": "",
    "insurance_policy": "POL-55120",
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


def send(token: str, method: str, path: str, body: dict | None, org: str) -> tuple[int, dict, str]:
    req = urllib.request.Request(
        SERVER + path,
        method=method,
        data=None if body is None else json.dumps(body).encode(),
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "X-Organization-Id": org,
            "User-Agent": "matrx-real-tests/1.0 (pb02-send)",
            "X-Matrx-Agent-Traffic": "real-tests-pb02-send",
        },
    )
    try:
        resp = urllib.request.urlopen(req, timeout=900)
        return resp.status, dict(resp.headers), resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")


def client_door_body(org: str, conversation_id: str) -> dict:
    return {"conversation_id": conversation_id, "is_new": True, "store": True, "organization_id": org, "variables": S}


def build(n: int, token: str) -> tuple[str, str, dict | None, str, str | None]:
    """(method, path, body, org, conversation id we chose or None)."""
    if n == 0:
        _, _, raw = send(token, "GET", f"/mandates/{KEY}/resolution", None, ORG)
        res = json.loads(raw)
        holder = {"type": res["holder_type"], "id": res.get("definition_agent_id") or res.get("agent_id")}
        if res.get("holder_type") == "workflow":
            holder = {"type": "workflow", "id": res["workflow_id"], "version_id": res.get("workflow_version_id")}
        elif res.get("is_version"):
            holder["version_id"] = res["agent_id"]
        return "POST", f"/mandates/{KEY}/placement", {"provisions": S, "holder": holder, "organization_id": ORG}, ORG, None
    if n in (1, 5):
        org = ORG if n == 1 else WORKSPACE
        cid = str(uuid.uuid4())
        return "POST", f"/ai/mandates/{KEY}", client_door_body(org, cid), org, cid
    if n == 2:
        return "POST", f"/mandates/{KEY}/try", {"variables": S, "candidate": {"selection": "current"}, "organization_id": ORG}, ORG, None
    if n == 3:
        return "POST", f"/workflows/{WORKFLOW}/runs", {"inputs": S, "organization_id": ORG}, ORG, None
    if n == 4:
        cid = str(uuid.uuid4())
        body = {"conversation_id": cid, "is_new": True, "store": True, "organization_id": ORG,
                "user_input": DISPATCHER_MESSAGE, "variables": S}
        return "POST", f"/ai/agents/{DISPATCHER}", body, ORG, cid
    raise SystemExit(f"no call {n}; calls are 0-5")


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    ap.add_argument("--only", type=int, choices=range(6), help="send one call (0-5)")
    ap.add_argument("--out", help="directory for the response files (default: a new temp dir)")
    args = ap.parse_args()
    out = Path(args.out) if args.out else Path(tempfile.mkdtemp(prefix="pb02-"))
    out.mkdir(parents=True, exist_ok=True)
    record_run_identity("pb02-send", SERVER, {"mandate": KEY, "organization": ORG, "second_organization": WORKSPACE,
                                              "workflow": WORKFLOW, "dispatcher_agent": DISPATCHER}, out)
    token = admin_token()
    for n in [args.only] if args.only is not None else range(6):
        method, path, body, org, chosen_cid = build(n, token)
        sent_at = datetime.now(timezone.utc).isoformat()
        status, headers, raw = send(token, method, path, body, org)
        lower = {k.lower(): v for k, v in headers.items()}
        record = {
            "call": n,
            "sent_at": sent_at,
            "request": {"method": method, "url": SERVER + path, "organization": org, "body": body},
            "status": status,
            "conversation_id": lower.get("x-conversation-id") or chosen_cid,
            "request_id": lower.get("x-request-id"),
            "headers": headers,
            "raw_response": raw,
        }
        path_out = out / f"call-{n}.json"
        path_out.write_text(json.dumps(record, indent=1, ensure_ascii=False))
        print(f"call {n}: HTTP {status}, conversation {record['conversation_id']}, wrote {path_out}")
    print(f"responses in {out}")


if __name__ == "__main__":
    main()
