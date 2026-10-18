#!/usr/bin/env python3
# matrx-agent-traffic: marked every server request carries X-Matrx-Agent-Traffic: real-tests-pb06-send
"""Send the calls of real test PB-06 (core-chain, the ledger conversation) to the LIVE server.

It only SENDS. It asserts nothing and prints no pass or fail: a runner executes it, a grader reads the
database. Before it sends it prints and saves (run-identity.json) the live server's commit, the UTC start
time and the fixture ids it uses. Every raw response (status, headers, body) is written to its own file in
the output directory (default: a new temp dir), in the order sent:

  1. turn-1.json     POST /ai/agents/<Compass Ledger Desk> as admin@admin.com, a new stored conversation in the
                     active organization Safety Net Real Tests, the file move-4471.md attached as a media
                     document, one typed message that carries the published rates page's address. No tools.
  2. turn-2.json     POST /ai/conversations/<id> as admin, the continuation's `tools` field adding the
                     agent-call, data (table) and web tools, one typed message.
  3. link-*.json     a share link for the conversation through the share door (create_share_link), the
                     transcript read through that link with no session (resolve_share_token), and one
                     message sent to the conversation with no session, carrying the link's token.
  4. seat-nogrant-*  as test@test.com, before any grant: the conversation read by id (server and database
                     doors) and a search of the seat's visible conversations for the words `Mexico City`.
  5. seat-viewer-*   the conversation shared to test@test.com as viewer (share_resource_with_user), then as
                     that seat: the same read and one continuation message.
  6. seat-editor-*   the same share raised to editor, then as that seat: one continuation message.
  7. legacy-*.json   admin's browser session cookie sent to GET /api/cx-chat/history and /api/cx-chat/shared.
It writes nothing else: no note, table or page is touched.

Usage:
  pb06-send.py                 send everything, in order
  pb06-send.py --out DIR       write the response files to DIR
  pb06-send.py --dry-run       no model call and no write: turn 1 goes with dry_run true; every later call is
                               written to plan.json (method, url, body), not sent

Sign-in: a one-time magic-link token for each seat minted with the live project's secret key
(matrx-frontend/.env.local, never printed), the same way pb03-send.py does.
"""
from __future__ import annotations

import argparse
import base64
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
SITE = "https://www.aimatrx.com"  # the web app, for the two legacy routes
ORG = "226be635-194d-42dd-87c8-7a9562f70939"  # Safety Net Real Tests (the real tests' own organization)
AGENT = "1f11faa5-7c56-4154-898d-d34b852cff3b"  # Compass Ledger Desk — Claude Haiku 5.5, no tools
MOVE_FILE = "b9a3f1f8-a84a-4b83-9827-ce9dbbef7b4f"  # move-4471.md
PAGE_URL = "https://www.aimatrx.com/p/e/note/18244cbf-dd26-455f-b37e-7f4c9550b3fa"  # published page "Compass road rates"
SEAT_EMAIL = "test@test.com"

TURN_1 = f"Routing line for move 4471, please. The rates page is {PAGE_URL}."
TURN_2 = "Same again, now with your tools."
LINK_SEND = "Link here."
VIEWER_SEND = "Viewer here."
EDITOR_SEND = "Editor here. Send the line once more."
SEARCH_WORDS = "Mexico City"
TOOLS = [  # the continuation's `tools` field: agent-call, data and web tools, by registry name
    {"kind": "registered", "name": "agent_call"},
    {"kind": "registered", "name": "table"},
    {"kind": "registered", "name": "web"},
]
AUTH_COOKIE = "sb-matrx-auth-v2"  # the web app's session cookie name
COOKIE_CHUNK = 3180  # @supabase/ssr chunk size


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


def sign_in(email: str) -> dict:
    """The session for `email` (access token, refresh token, user), by a one-time magic link."""
    secret = ENV["SUPABASE_SECRET_KEY"]
    req = urllib.request.Request(
        DB + "/auth/v1/admin/generate_link",
        data=json.dumps({"type": "magiclink", "email": email}).encode(),
        headers={"apikey": secret, "Authorization": "Bearer " + secret, "Content-Type": "application/json"},
    )
    d = json.load(urllib.request.urlopen(req))
    hashed = d.get("hashed_token") or d.get("properties", {}).get("hashed_token")
    req = urllib.request.Request(
        DB + "/auth/v1/verify",
        data=json.dumps({"type": "magiclink", "token_hash": hashed}).encode(),
        headers={"apikey": PUB, "Content-Type": "application/json"},
    )
    return json.load(urllib.request.urlopen(req))


def session_cookie(session: dict) -> str:
    value = "base64-" + base64.urlsafe_b64encode(json.dumps(session).encode()).decode().rstrip("=")
    if len(value) <= COOKIE_CHUNK:
        return f"{AUTH_COOKIE}={value}"
    parts = [value[i:i + COOKIE_CHUNK] for i in range(0, len(value), COOKIE_CHUNK)]
    return "; ".join(f"{AUTH_COOKIE}.{i}={p}" for i, p in enumerate(parts))


def call(method: str, url: str, headers: dict, body: dict | None) -> tuple[int, dict, str]:
    h = {"Content-Type": "application/json", "User-Agent": "matrx-real-tests/1.0 (pb06-send)",
         "X-Matrx-Agent-Traffic": "real-tests-pb06-send", **headers}
    req = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(), headers=h)
    try:
        resp = urllib.request.urlopen(req, timeout=900)
        return resp.status, dict(resp.headers), resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")


def bearer(token: str, org: bool = True) -> dict:
    return {"Authorization": "Bearer " + token, **({"X-Organization-Id": ORG} if org else {})}


def db_rpc(fn: str, token: str | None, args: dict) -> tuple[int, dict, str]:
    """A public-schema database door through the project's own API (anonymous when `token` is None)."""
    headers = {"apikey": PUB}
    if token:
        headers["Authorization"] = "Bearer " + token
    return call("POST", f"{DB}/rest/v1/rpc/{fn}", headers, args)


def db_read(path: str, token: str, schema: str) -> tuple[int, dict, str]:
    return call("GET", f"{DB}/rest/v1/{path}", {"apikey": PUB, "Authorization": "Bearer " + token, "Accept-Profile": schema}, None)


class Recorder:
    def __init__(self, out: Path, dry: bool) -> None:
        self.out, self.dry, self.plan = out, dry, []

    def step(self, name: str, method: str, url: str, headers: dict, body: dict | None, note: str = "") -> dict | None:
        """Send one call and write its raw result to <name>.json; in a dry run only record the plan."""
        if self.dry:
            self.plan.append({"name": name, "method": method, "url": url, "body": body, "note": note})
            print(f"{name}: planned, not sent ({method} {url})")
            return None
        sent = datetime.now(timezone.utc).isoformat()
        status, resp_headers, raw = call(method, url, headers, body)
        record = {"name": name, "sent_at": sent, "note": note,
                  "request": {"method": method, "url": url, "body": body},
                  "status": status, "headers": resp_headers, "raw_response": raw}
        (self.out / f"{name}.json").write_text(json.dumps(record, indent=1, ensure_ascii=False))
        print(f"{name}: HTTP {status}")
        return record


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    ap.add_argument("--out", help="directory for the response files (default: a new temp dir)")
    ap.add_argument("--dry-run", action="store_true", help="no model call and no write (see the header)")
    args = ap.parse_args()
    out = Path(args.out) if args.out else Path(tempfile.mkdtemp(prefix="pb06-"))
    out.mkdir(parents=True, exist_ok=True)
    record_run_identity("pb06-send --dry-run" if args.dry_run else "pb06-send", SERVER,
                        {"organization": ORG, "agent": AGENT, "file": MOVE_FILE, "page": PAGE_URL, "seat": SEAT_EMAIL}, out)
    admin = sign_in("admin@admin.com")
    seat = sign_in(SEAT_EMAIL)
    admin_token, seat_token = admin["access_token"], seat["access_token"]
    seat_id = seat["user"]["id"]
    rec = Recorder(out, args.dry_run)
    cid = str(uuid.uuid4())

    # 1. Turn 1 — the agent door. Dry run: the model is not called.
    body1 = {"conversation_id": cid, "is_new": True, "store": True, "organization_id": ORG,
             "user_input": [{"type": "text", "text": TURN_1}, {"type": "media", "kind": "document", "file_id": MOVE_FILE}]}
    if args.dry_run:
        body1["dry_run"] = True
    sent = datetime.now(timezone.utc).isoformat()
    status, headers, raw = call("POST", f"{SERVER}/ai/agents/{AGENT}", bearer(admin_token), body1)
    lower = {k.lower(): v for k, v in headers.items()}
    cid = lower.get("x-conversation-id") or cid
    (out / "turn-1.json").write_text(json.dumps({
        "turn": 1, "sent_at": sent, "request": {"method": "POST", "url": f"{SERVER}/ai/agents/{AGENT}", "organization": ORG, "body": body1},
        "status": status, "conversation_id": cid, "request_id": lower.get("x-request-id"), "headers": headers,
        "raw_response": raw}, indent=1, ensure_ascii=False))
    print(f"turn 1: HTTP {status}, conversation {cid}")

    cont = f"{SERVER}/ai/conversations/{cid}"
    # 2. Turn 2 — the continuation door with the three tools added.
    rec.step("turn-2", "POST", cont, bearer(admin_token),
             {"user_input": TURN_2, "organization_id": ORG, "tools": TOOLS})

    # 3. Share link: made by the owner, read with no session, one send with no session.
    link = rec.step("link-create", "POST", f"{DB}/rest/v1/rpc/create_share_link",
                    {"apikey": PUB, "Authorization": "Bearer " + admin_token},
                    {"p_resource_type": "conversation", "p_resource_id": cid, "p_permission_level": "viewer"})
    token = ""
    if link:
        try:
            token = json.loads(link["raw_response"]).get("token") or ""
        except ValueError:
            token = ""
    rec.step("link-read", "POST", f"{DB}/rest/v1/rpc/resolve_share_token", {"apikey": PUB}, {"p_token": token or "<token>"},
             "no session: only the project's public key")
    rec.step("link-send", "POST", cont, {"X-Share-Token": token or "<token>"},
             {"user_input": LINK_SEND, "organization_id": ORG}, "no session: the link's token is the only credential")

    # 4. The second seat before any grant.
    seat_headers = bearer(seat_token)
    rec.step("seat-nogrant-read-server", "GET", f"{SERVER}/cx/conversations/{cid}", seat_headers, None)
    rec.step("seat-nogrant-read-database", "GET", f"{DB}/rest/v1/conversation_summary?id=eq.{cid}&select=id,title,user_id",
             {"apikey": PUB, "Authorization": "Bearer " + seat_token, "Accept-Profile": "chat"}, None)
    rec.step("seat-nogrant-search", "GET",
             f"{DB}/rest/v1/conversation_summary?or=(title.ilike.*{SEARCH_WORDS.replace(' ', '%20')}*,description.ilike.*{SEARCH_WORDS.replace(' ', '%20')}*)&select=id,title",
             {"apikey": PUB, "Authorization": "Bearer " + seat_token, "Accept-Profile": "chat"}, None)
    rec.step("seat-nogrant-list", "GET", f"{SERVER}/cx/conversations?limit=200", seat_headers, None)

    # 5. Viewer: shared by the owner, then the seat reads and tries to write.
    rec.step("share-viewer", "POST", f"{DB}/rest/v1/rpc/share_resource_with_user",
             {"apikey": PUB, "Authorization": "Bearer " + admin_token},
             {"p_resource_type": "conversation", "p_resource_id": cid, "p_target_user_id": seat_id, "p_permission_level": "viewer"})
    rec.step("seat-viewer-read", "GET", f"{SERVER}/cx/conversations/{cid}", seat_headers, None)
    rec.step("seat-viewer-send", "POST", cont, seat_headers, {"user_input": VIEWER_SEND, "organization_id": ORG})

    # 6. Editor: the same share raised, then the seat writes.
    rec.step("share-editor", "POST", f"{DB}/rest/v1/rpc/share_resource_with_user",
             {"apikey": PUB, "Authorization": "Bearer " + admin_token},
             {"p_resource_type": "conversation", "p_resource_id": cid, "p_target_user_id": seat_id, "p_permission_level": "editor"})
    rec.step("seat-editor-send", "POST", cont, seat_headers, {"user_input": EDITOR_SEND, "organization_id": ORG})

    # 7. The two legacy routes, with admin's browser session.
    cookie = {"Cookie": session_cookie(admin)}
    rec.step("legacy-history", "GET", f"{SITE}/api/cx-chat/history", cookie, None)
    rec.step("legacy-shared", "GET", f"{SITE}/api/cx-chat/shared", cookie, None)

    if args.dry_run:
        (out / "plan.json").write_text(json.dumps(rec.plan, indent=1, ensure_ascii=False))
        print(f"dry run: {len(rec.plan)} later calls written to {out / 'plan.json'}, none sent")
    print(f"conversation {cid}; responses in {out}")


if __name__ == "__main__":
    main()
