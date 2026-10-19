#!/usr/bin/env python3
# matrx-agent-traffic: marked every server request carries X-Matrx-Agent-Traffic: real-tests-pb08-send
"""Send the turns of real test PB-08 (core-chain, background agents and wake-ups) to the LIVE server
as admin@admin.com, and capture what the server writes into the conversation BY ITSELF afterwards.

It only SENDS, WAITS and SAVES. It asserts nothing and prints no pass or fail: a runner executes it, a grader
reads the database. Before it sends it prints and saves (run-identity.json) the live server's commit, the
UTC start time and the fixture ids it uses.

A run is ONE stored conversation with Halcyon Ops Lead (active organization Safety Net Real Tests):
  turn 1  POST /ai/agents/<lead>               the foreground drill
  turn 2  POST /ai/conversations/<id>          two background helpers; then a quiet-wait
  turn 3     POST /ai/conversations/<id>       follow-up; a count in its text is drawn at the moment it is sent
  turn 4, 4b POST /ai/conversations/<id>       a background start, then the moment turn 4's response ends a
                                                second message whose sector is drawn at that moment
  turn 5..7  POST /ai/conversations/<id>       stop, fork, sleep-and-wake
Draws use the secrets module and exist nowhere before their turn is sent. The sender also records them for
the grader in a file outside the output directory, keyed by the conversation id.
After turn 7 it polls the stored conversation for --final-poll seconds (default 240) without sending anything.

Between turns it waits until the conversation is QUIET: no inbox row of this conversation is pending,
delivering, running or resuming, the newest message is the agent's, and nothing changed for two polls
(bounded by --settle seconds, default 150). That is a wait, not a judgment: whatever the server wrote or did
not write is only saved.

Files in the output directory (default: a new temp dir):
  turn-N.json        request, HTTP status, headers, raw response body, sent/finished timestamps
  polls.jsonl        one line per poll: time, label, message count, inbox rows by status, helpers
  final.json         the stored conversation at the end: messages, tool calls, inbox rows, run records, and
                     every helper conversation with its messages and inbox rows

Usage:
  pb08-send.py                          one run (seven turns, waits, final poll)
  pb08-send.py --out DIR                write the files to DIR
  pb08-send.py --read <conversation>    write final.json for an existing conversation; sends nothing
  pb08-send.py --dry-run                no model call: turn 1 goes with dry_run true, every later turn is
                                        written to turn-N.planned.json and not sent
  pb08-send.py --lead-tools all         store the lead's start tools, print what is stored; sends no turn

Sign-in: a one-time magic-link token for admin@admin.com minted with the live project's secret key
(matrx-frontend/.env.local, never printed), the same way pb04-send.py does.
"""
from __future__ import annotations

import argparse
import json
import secrets
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from run_identity import record_run_identity  # noqa: E402
from fixture_check import add_accept_drift_arg, require_fixtures  # noqa: E402

SERVER = "https://server.app.matrxserver.com"
ORG = "226be635-194d-42dd-87c8-7a9562f70939"  # Safety Net Real Tests (the real tests' own organization)
LEAD = "1ed4e846-8ab2-43c5-b044-3e00c7068669"  # Halcyon Ops Lead — Claude Haiku 5.5

# tool.definition ids of the lead's five tools (the lead row stores tool ids)
TOOL_IDS = {
    "agent": "1cfc3a49-1993-4526-8712-943e05014615",
    "send_message": "be5202db-66d0-45d2-bcc8-ef3184768bed",
    "task_stop": "1d9c6c4a-749e-4681-ba8c-85f4ed402f51",
    "list_agents": "929708c1-bdfa-4617-ada1-c57749b1f1b6",
    "schedule_wakeup": "2e02cbfe-2dca-4457-8ae7-4457534df6ee",
}

TURNS = [
    "Use a fresh copy of yourself (the agent tool, no subagent type, in the foreground) to ask: what is "
    "17 × 23? Tell me its answer.",
    "File today's work under the batch label Juniper-0714. Start two background agents and don't wait for "
    "them: Tidewell Verse Desk writing a haiku about rain, and Ares Card Desk listing three facts about Mars.",
    "Ask the Mars agent for {count} more facts.",
    "Start Ledgerline Ideas Desk in the background on a brainstorm of 15 startup ideas.",
    "Tell the ideas agent: only {sector} ideas.",
    "Start Brennagh History Desk in the background on a 3,000-word history of the printing press, stop it "
    "at once, then list your agents and tell me what the list says.",
    "Start a fork of yourself in the foreground and have it summarize this conversation in exactly three "
    "bullets, and ask it to name the sector I picked for the ideas agent and the batch label in its summary. "
    "Show me its bullets.",
    "Schedule a wake-up 2 minutes from now with the note: check cold-room log K-208 and tell me its reading "
    "is due. Then end your turn.",
]

TURN_LABELS = ["1", "2", "3", "4", "4b", "5", "6", "7"]
COUNTS = ["two", "three"]
SECTORS = ["fintech and payments", "health", "education", "climate", "retail", "logistics"]
DRAWS_DIR = Path.home() / ".matrx" / "real-tests-grader"  # outside every runner's output directory

BUSY = {"pending", "delivering", "running", "resuming"}


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


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


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


class Session:
    """The admin token, re-minted when it nears expiry (a full run is longer than some token lifetimes)."""

    def __init__(self) -> None:
        self.token = admin_token()
        self.minted = time.time()

    def get(self) -> str:
        if time.time() - self.minted > 1800:
            self.token = admin_token()
            self.minted = time.time()
        return self.token


def _call(method: str, url: str, token: str, body: dict | None, extra: dict, timeout: int = 900) -> tuple[int, dict, str]:
    headers = {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "User-Agent": "matrx-real-tests/1.0 (pb08-send)",
        "X-Matrx-Agent-Traffic": "real-tests-pb08-send",
        **extra,
    }
    req = urllib.request.Request(url, method=method, data=None if body is None else json.dumps(body).encode(), headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=timeout)
        return resp.status, dict(resp.headers), resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")


def rest(s: Session, method: str, schema: str, path: str, body: dict | None = None) -> tuple[int, str]:
    """The database's own API, as admin (RLS person reads/writes)."""
    status, _, raw = _call(
        method, f"{DB}/rest/v1/{path}", s.get(), body,
        {"apikey": PUB, "Accept-Profile": schema, "Content-Profile": schema, "Prefer": "return=representation"},
        timeout=60,
    )
    return status, raw


def rows(s: Session, schema: str, table: str, query: dict) -> list:
    status, raw = rest(s, "GET", schema, f"{table}?{urllib.parse.urlencode(query)}")
    if status != 200:
        return [{"_read_error": status, "_raw": raw[:500]}]
    return json.loads(raw)


def runs_of(s: Session, cid: str) -> tuple[list, list]:
    """A conversation's model calls (chat.request) and the run records they belong to (chat.user_request,
    linked by user_request_id: user_request.conversation_id is not always filled)."""
    calls = rows(s, "chat", "request", {
        "conversation_id": f"eq.{cid}",
        "select": "id,user_request_id,iteration,status,finish_reason,error,ai_model_id,tool_calls_count,created_at",
        "order": "created_at.asc"})
    ids = sorted({c["user_request_id"] for c in calls if isinstance(c, dict) and c.get("user_request_id")})
    if not ids:
        return calls, []
    runs = rows(s, "chat", "user_request", {
        "id": f"in.({','.join(ids)})",
        "select": "id,status,finish_reason,error,agent_id,agent_version_id,iterations,total_tool_calls,total_cost,origin_class,source_feature,created_at,completed_at,metadata",
        "order": "created_at.asc"})
    return calls, runs


def capture(s: Session, cid: str, *, full: bool) -> dict:
    """The stored conversation as the database holds it now (raw rows, nothing judged)."""
    msg_cols = "id,position,role,status,source,agent_id,metadata,content,user_content,created_at" if full else "id,position,role,metadata,created_at"
    out: dict = {"read_at": now(), "conversation_id": cid}
    out["conversation"] = rows(s, "chat", "conversation", {"id": f"eq.{cid}", "select": "*" if full else "id,last_request_status,message_count"})
    out["messages"] = rows(s, "chat", "message", {"conversation_id": f"eq.{cid}", "select": msg_cols, "order": "position.asc"})
    out["inbox"] = rows(s, "chat", "pending_injection", {
        "conversation_id": f"eq.{cid}",
        "select": "id,kind,source,status,delivery,created_at,updated_at,consumed_at,consumed_message_id,metadata" + (",content" if full else ""),
        "order": "created_at.asc"})
    out["helpers"] = rows(s, "chat", "conversation", {
        "parent_conversation_id": f"eq.{cid}",
        "select": "id,title,initial_agent_id,initial_agent_version_id,last_request_status,conversation_type,created_at,metadata" if full else "id,title,last_request_status,created_at",
        "order": "created_at.asc"})
    if not full:
        return out
    out["tool_calls"] = rows(s, "chat", "tool_call", {
        "conversation_id": f"eq.{cid}",
        "select": "id,tool_name,status,success,arguments,output,error_type,error_message,started_at,completed_at,created_at,user_request_id,metadata",
        "order": "created_at.asc"})
    out["model_calls"], out["runs"] = runs_of(s, cid)
    for h in out["helpers"]:
        hid = h.get("id")
        if not hid:
            continue
        h["messages"] = rows(s, "chat", "message", {"conversation_id": f"eq.{hid}", "select": msg_cols, "order": "position.asc"})
        h["inbox"] = rows(s, "chat", "pending_injection", {
            "conversation_id": f"eq.{hid}", "select": "id,kind,source,status,delivery,created_at,consumed_at,metadata,content",
            "order": "created_at.asc"})
        h["tool_calls"] = rows(s, "chat", "tool_call", {
            "conversation_id": f"eq.{hid}", "select": "id,tool_name,status,arguments,output,started_at,completed_at,created_at",
            "order": "created_at.asc"})
        h["model_calls"], h["runs"] = runs_of(s, hid)
    return out


def poll_line(snap: dict, label: str, started: float) -> dict:
    inbox: dict = {}
    for r in snap["inbox"]:
        key = f"{r.get('source')}:{r.get('status')}"
        inbox[key] = inbox.get(key, 0) + 1
    msgs = snap["messages"]
    last = msgs[-1] if msgs else {}
    return {
        "at": snap["read_at"], "label": label, "elapsed_s": round(time.time() - started, 1),
        "messages": len(msgs),
        "last_role": last.get("role"),
        "last_authored_by": (last.get("metadata") or {}).get("authored_by") if isinstance(last.get("metadata"), dict) else None,
        "inbox": inbox,
        "helpers": [(h.get("id"), h.get("title"), h.get("last_request_status")) for h in snap["helpers"]],
    }


def wait(s: Session, cid: str, label: str, out: Path, *, max_s: int, min_s: int = 0, full_window: bool = False) -> None:
    """Poll until quiet (or for the whole window when full_window). Writes every poll to polls.jsonl."""
    started = time.time()
    prev = None
    same = 0
    print(f"[{now()}] {label}: polling up to {max_s} s", flush=True)
    with (out / "polls.jsonl").open("a") as f:
        while True:
            snap = capture(s, cid, full=False)
            line = poll_line(snap, label, started)
            f.write(json.dumps(line, ensure_ascii=False) + "\n")
            f.flush()
            sig = (line["messages"], json.dumps(line["inbox"], sort_keys=True), len(line["helpers"]))
            if sig != prev:
                print(f"  +{line['elapsed_s']:>6}s messages={line['messages']} last={line['last_role']}"
                      f"/{line['last_authored_by']} inbox={line['inbox']}", flush=True)
            same = same + 1 if sig == prev else 0
            prev = sig
            elapsed = time.time() - started
            if elapsed >= max_s:
                break
            busy = any(r.get("status") in BUSY for r in snap["inbox"])
            scheduled = any(r.get("status") == "scheduled" for r in snap["inbox"])
            quiet = not busy and not scheduled and line["last_role"] == "assistant" and same >= 2
            if not full_window and elapsed >= min_s and quiet:
                break
            time.sleep(5)
    print(f"[{now()}] {label}: done after {round(time.time() - started)} s", flush=True)


def record_draws(cid: str, draws: dict) -> None:
    """The grader's copy of what was drawn and when; never printed, never in the output directory."""
    DRAWS_DIR.mkdir(parents=True, exist_ok=True)
    (DRAWS_DIR / f"pb08-draws-{cid}.json").write_text(json.dumps({"conversation_id": cid, **draws}, indent=1))


def draw(choices: list) -> tuple:
    return secrets.choice(choices), now()


def send_turn(s: Session, out: Path, n: str, cid: str, text: str, dry: bool = False) -> str:
    if dry and n != "1":
        body = {"user_input": text, "organization_id": ORG}
        (out / f"turn-{n}.planned.json").write_text(json.dumps({"turn": n, "sent": False, "request": {
            "method": "POST", "url": f"{SERVER}/ai/conversations/<conversation id>", "body": body}}, indent=1))
        print(f"[{now()}] turn {n}: dry run, written to turn-{n}.planned.json, not sent", flush=True)
        return cid
    if n == "1":
        url = f"{SERVER}/ai/agents/{LEAD}"
        body = {"conversation_id": cid, "is_new": True, "store": True, "organization_id": ORG, "user_input": text}
        if dry:
            body["dry_run"] = True
    else:
        url = f"{SERVER}/ai/conversations/{cid}"
        body = {"user_input": text, "organization_id": ORG}
    sent = now()
    print(f"[{sent}] turn {n}: sending", flush=True)
    status, headers, raw = _call("POST", url, s.get(), body, {"X-Organization-Id": ORG})
    lower = {k.lower(): v for k, v in headers.items()}
    cid = lower.get("x-conversation-id") or cid
    record = {"turn": n, "sent_at": sent, "finished_at": now(), "request": {"method": "POST", "url": url,
              "organization": ORG, "body": body}, "status": status, "conversation_id": cid,
              "request_id": lower.get("x-request-id"), "headers": headers, "raw_response": raw}
    (out / f"turn-{n}.json").write_text(json.dumps(record, indent=1, ensure_ascii=False))
    print(f"[{now()}] turn {n}: HTTP {status}, conversation {cid}, wrote {out / f'turn-{n}.json'}", flush=True)
    return cid


def write_final(s: Session, cid: str, out: Path) -> None:
    (out / "final.json").write_text(json.dumps(capture(s, cid, full=True), indent=1, ensure_ascii=False, default=str))
    print(f"wrote {out / 'final.json'}")


def set_lead_tools(s: Session, names: list) -> None:
    """Store exactly these tools on the lead and print what the row holds afterwards."""
    status, raw = rest(s, "PATCH", "agent", f"definition?id=eq.{LEAD}", {"tools": [TOOL_IDS[n] for n in names]})
    print(f"agent.definition PATCH tools: HTTP {status}")
    stored = rows(s, "agent", "definition", {"id": f"eq.{LEAD}", "select": "id,name,version,tools"})
    by_id = {v: k for k, v in TOOL_IDS.items()}
    for r in stored:
        print(f"  {r.get('name')} version {r.get('version')}: tools {[by_id.get(t, t) for t in r.get('tools') or []]}")


def main() -> None:
    ap = argparse.ArgumentParser(description=(__doc__ or "").split("\n\n")[0])
    ap.add_argument("--out", help="directory for the files (default: a new temp dir)")
    ap.add_argument("--settle", type=int, default=150, help="max seconds to wait for quiet after a turn (default 150)")
    ap.add_argument("--final-poll", type=int, default=240, help="seconds to poll after turn 7 (default 240)")
    ap.add_argument("--read", metavar="CONVERSATION", help="write final.json for an existing conversation; send nothing")
    ap.add_argument("--lead-tools", choices=["all"], help="store the lead's start tools and print them; send nothing")
    ap.add_argument("--dry-run", action="store_true", help="no model call (see the header)")
    add_accept_drift_arg(ap)
    args = ap.parse_args()
    fixtures = {"organization": ORG, "lead_agent": LEAD, **{f"tool_{k}": v for k, v in TOOL_IDS.items()}}

    if args.lead_tools:
        record_run_identity("pb08-send --lead-tools", SERVER, fixtures)
        set_lead_tools(Session(), list(TOOL_IDS))
        return

    fx = None if args.read else require_fixtures("PB-08", args.accept_drift)  # --read sends nothing
    out = Path(args.out) if args.out else Path(tempfile.mkdtemp(prefix="pb08-"))
    out.mkdir(parents=True, exist_ok=True)
    record_run_identity("pb08-send --read" if args.read else ("pb08-send --dry-run" if args.dry_run else "pb08-send"),
                        SERVER, fixtures, out, fixture_check=fx)
    s = Session()

    if args.read:
        write_final(s, args.read, out)
        return

    cid = str(uuid.uuid4())
    print(f"[{now()}] PB-08 run, output {out}")
    draws: dict = {"dry_run": args.dry_run}
    for n, template in zip(TURN_LABELS, TURNS):
        text = template
        if n == "3":
            draws["count"], draws["count_drawn_at"] = draw(COUNTS)
            text = template.format(count=draws["count"])
        elif n == "4b":
            draws["sector"], draws["sector_drawn_at"] = draw(SECTORS)
            text = template.format(sector=draws["sector"])
        cid = send_turn(s, out, n, cid, text, args.dry_run)
        if n in ("3", "4b"):
            draws[f"turn_{n}_sent_after"] = draws["count_drawn_at" if n == "3" else "sector_drawn_at"]
            record_draws(cid, draws)
        if args.dry_run:
            continue
        if n == "2":
            wait(s, cid, "after turn 2", out, max_s=args.settle, min_s=20)
        elif n == "4":
            continue  # turn 4b goes the moment turn 4's response has ended
        elif n == "4b":
            wait(s, cid, "after turn 4b", out, max_s=args.settle, min_s=20)
        elif n == "5":
            wait(s, cid, "after turn 5", out, max_s=90, full_window=True)  # a fixed window
        elif n == "7":
            wait(s, cid, "after turn 7", out, max_s=args.final_poll, full_window=True)
        else:
            wait(s, cid, f"after turn {n}", out, max_s=args.settle)
    if args.dry_run:
        print(f"files in {out}")
        return
    write_final(s, cid, out)
    print(f"conversation {cid}")
    print(f"files in {out}")


if __name__ == "__main__":
    main()
