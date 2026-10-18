#!/usr/bin/env python3
# matrx-agent-traffic: exempt reads the database only (direct Postgres, read-only SELECTs); sends nothing to the server
"""Grader helper for real test PB-07 (core-chain, nothing undeclared reaches the model).

It is NOT a test and prints no pass or fail. It reads the stored wire requests and prints every text
segment it cannot attribute, with its door and where it sits, and nothing else. The grader judges.
Spec: common-docs/operations/real-tests/core-chain/PB-07-nothing-undeclared.md (allow-list, rules).

Usage:
  pb07-provenance.py --run DIR                 every door the sender wrote to DIR (manifest.json), plus
                                               each door's dry-run capture and the preview/real parity
  pb07-provenance.py <conversation id> ...     those conversations only (door shown as "conversation")
  --model-view FILE                            the Builder Model view capture to check the allow-list
                                               against (default: DIR/builder-run.dry.json)
  --typed TEXT                                 the person's typed text (default: the sender's)

What it reads, per conversation: chat.request_snapshot.request_payload (the provider request as sent)
and unified_payload (the platform's request before translation), every iteration; chat.conversation
(to find a child started by agent_call, or the canary run started by a workflow or /try).

A segment is attributed when it is (a) the canary's authored text, (b) a declared value (variable,
context value, prompt block, the context policy's own label and description), (c) the person's typed
text, byte-identical, alone in its content part, or (d) a block on the PLATFORM ALLOW-LIST whose text
(after normalising timestamps, dates and the client surface name) also appears in the Builder Model
view capture. A tool definition is attributed when the canary declares it or the same definition is in
the Model view capture. Model output (assistant text, thinking, tool calls) and tool results are skipped.
Database access: the five SUPABASE_MATRIX_* values in ../aidream/.env (read-only SELECTs).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

CANARY_IDS = {"40379907-a685-4d59-93db-6533c5fdcb75", "76c1f930-3c08-40db-b156-6eeab958725d"}
CALLER = "a9cf243e-90b3-435d-96e2-f21e56fe08f5"
TYPED = "PB7-TYPED-5R1C Please send the canary line."

# (a) authored text: the system template split at its placeholders; (b) declared values.
AUTHORED = [
    "You are the PB-07 canary desk. Marker PB7-AUTH-K3VQ.",
    "Variable code: ",
    "Reply with one line: every token that starts with PB7- that you were given anywhere, in the order you met "
    "them, separated by single spaces. Nothing else.",
]
DECLARED = {
    "variable canary_code": "PB7-VAR-7Q2K",
    "prompt block pb07_canary_block": "Canary block marker PB7-BLK-3H9X.",
    "context canary_note": "Canary context marker PB7-CTX-8W5N.",
}
# The declared prompt block is wrapped by the platform's own tag (template substitution rule 8), and the
# declared context value by the <object> element carrying the policy's own key/label/description.
DECLARED_WRAPPERS = [
    re.compile(r"</?pb07_canary_block>"),
    re.compile(r'<object key="canary_note" label="Canary note" description="The canary context value" format="text">\s*'
               r"(?:Canary context marker PB7-CTX-8W5N\.)?\s*</object>"),
]

# (d) PLATFORM ALLOW-LIST — the pattern of each platform block; id = row in the playbook's allow-list.
# A block counts only when its normalised text also appears in the Builder Model view capture.
ALLOW = [
    ("AL-01 date block", re.compile(r"<!--matrx:current_date-->.*?<!--matrx:/current_date-->", re.S)),
    ("AL-02 organization catalog", re.compile(r"<org_catalog\b.*?</org_catalog>", re.S)),
    ("AL-03 turn-context frame note", re.compile(r'<turn_context source="platform">\s*Reference material the AI Matrx platform.*?(?=\n\n)', re.S)),
    ("AL-03 turn-context frame close", re.compile(r"</turn_context>")),
    ("AL-04 live time line", re.compile(r"The current moment is .*?(?=\n\n|\n<|$)", re.S)),
    ("AL-05 active context", re.compile(r"<active_context>.*?</active_context>", re.S)),
    ("AL-06 available-context frame", re.compile(r'<available_context>\s*<inline note="[^"]*">|</inline>\s*</available_context>', re.S)),
    ("AL-07 ambient value user", re.compile(r'<object key="user" label="User" format="json">.*?</object>', re.S)),
    ("AL-07 ambient value client", re.compile(r'<object key="client" label="Client" format="json">.*?</object>', re.S)),
    ("AL-08 earlier-turn context", re.compile(r"<earlier_turn_context>.*?</earlier_turn_context>", re.S)),
    ("AL-09 surface situation", re.compile(r"<situation>.*?</situation>", re.S)),
    ("AL-09 surface intro", re.compile(r"<surface_intro>.*?</surface_intro>", re.S)),
    ("AL-09 surface write targets", re.compile(r"<surface_write_targets>.*?</surface_write_targets>", re.S)),
    ("AL-09 surface client tools", re.compile(r"<surface_client_tools>.*?</surface_client_tools>", re.S)),
    ("AL-09 surface actions", re.compile(r"<surface_actions>.*?</surface_actions>", re.S)),
    ("AL-10 context manifest", re.compile(r"<available_context>.*?</available_context>", re.S)),
]

NORMALISE = [
    (re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)?"), "<TS>"),
    (re.compile(r"\d{4}-\d\d-\d\d"), "<DATE>"),
    (re.compile(r"(?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day, \w+ \d+, \d{4}"), "<DAY>"),
    (re.compile(r'"surface": "[^"]*"'), '"surface": "<SURFACE>"'),
]


def norm(text: str) -> str:
    for pat, rep in NORMALISE:
        text = pat.sub(rep, text)
    return re.sub(r"\s+", " ", text).strip()


# ── database ────────────────────────────────────────────────────────────────────────────────────────
def connect():
    import psycopg  # aidream's environment has it: run with ../aidream/.venv/bin/python if python3 lacks it

    env = {}
    for line in (Path.home() / "code/aidream/.env").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"')
    return psycopg.connect(host=env["SUPABASE_MATRIX_HOST"], port=env.get("SUPABASE_MATRIX_PORT", "5432"),
                           dbname=env["SUPABASE_MATRIX_DATABASE_NAME"], user=env["SUPABASE_MATRIX_USER"],
                           password=env["SUPABASE_MATRIX_PASSWORD"], sslmode="require")


def q(conn, sql: str, args: tuple) -> list[dict]:
    with conn.cursor() as c:
        c.execute(sql, args)
        cols = [d.name for d in c.description]
        return [dict(zip(cols, r)) for r in c.fetchall()]


def snapshots(conn, cid: str) -> list[dict]:
    return q(conn, "select iteration, provider, created_at, request_payload, unified_payload from chat.request_snapshot "
                   "where conversation_id = %s and deleted_at is null order by created_at, iteration", (cid,))


def find_canary_conversation(conn, agent_id: str, after: str, exclude: set[str]) -> str | None:
    t = datetime.fromisoformat(after) - timedelta(seconds=5)
    rows = q(conn, "select id::text from chat.conversation where initial_agent_id = %s and created_at >= %s "
                   "order by created_at", (agent_id, t))
    for r in rows:
        if r["id"] not in exclude:
            return r["id"]
    return None


def child_conversation(conn, parent: str) -> str | None:
    rows = q(conn, "select id::text from chat.conversation where parent_conversation_id = %s order by created_at", (parent,))
    return rows[0]["id"] if rows else None


# ── the wire request, as text units ────────────────────────────────────────────────────────────────
def units(body: dict) -> tuple[list[tuple[str, str]], list[tuple[str, list]], list[dict]]:
    """(system units [(where, text)], user messages [(where, parts)], tools [dict])."""
    system: list[tuple[str, str]] = []
    users: list[tuple[str, list]] = []
    sysv = body.get("system")
    if isinstance(sysv, str):
        system.append(("system", sysv))
    elif isinstance(sysv, list):
        for i, p in enumerate(sysv):
            if isinstance(p, dict) and p.get("type") == "text":
                system.append((f"system[{i}]", p.get("text", "")))
    for i, m in enumerate(body.get("messages") or body.get("contents") or []):
        role = m.get("role")
        content = m.get("content", m.get("parts"))
        parts = content if isinstance(content, list) else [{"type": "text", "text": content or ""}]
        texts = [p.get("text", "") if isinstance(p, dict) else str(p) for p in parts
                 if not isinstance(p, dict) or p.get("type") in (None, "text", "input_text")]
        if role in ("system", "developer"):
            system += [(f"messages[{i}] ({role})", t) for t in texts]
        elif role == "user":
            users.append((f"messages[{i}] (user)", texts))
        # assistant text/thinking/tool calls = the model's own output; tool results = what tools returned
    tools = body.get("tools") or []
    return system, users, tools


def tool_name(t: dict) -> str:
    return t.get("name") or (t.get("function") or {}).get("name") or "?"


def consume(text: str, model_view: str | None, report: list[str], where: str, door: str) -> None:
    """Remove every attributable span from ``text``; print what is left."""
    rest = text
    for label, pat in ALLOW:
        for m in list(pat.finditer(rest)):
            block = m.group(0)
            if label.startswith("AL-10"):
                continue  # whole manifest is only a frame; its parts are judged one by one below
            if model_view is not None and norm(block) not in model_view:
                report.append(f"{door} | {where} | {label} not in the Builder Model view | {block.strip()}")
            rest = rest.replace(block, "\n", 1)
    for pat in DECLARED_WRAPPERS:
        rest = pat.sub("\n", rest)
    for value in DECLARED.values():
        rest = rest.replace(value, "\n")
    for frag in AUTHORED:
        rest = rest.replace(frag, "\n")
    leftover = [seg.strip() for seg in re.split(r"\n\s*\n", rest) if seg.strip()]
    for seg in leftover:
        report.append(f"{door} | {where} | unattributed | {seg}")


def check_request(door: str, body: dict, typed: str, model_view: str | None, mv_tools: dict[str, str] | None,
                  report: list[str]) -> None:
    system, users, tools = units(body)
    for where, text in system:
        consume(text, model_view, report, where, door)
    found_typed = False
    for where, parts in users:
        for j, part in enumerate(parts):
            loc = f"{where} part {j}"
            if part == typed:
                found_typed = True
                continue
            if typed and typed in part:
                found_typed = True
                extra = part.replace(typed, "\n").strip()
                report.append(f"{door} | {loc} | appended to the person's turn | {extra}")
                continue
            if part.lstrip().startswith('<turn_context source="platform">'):
                consume(part, model_view, report, loc, door)
            else:
                report.append(f"{door} | {loc} | user-role text the person did not type | {part.strip()}")
    if typed and not found_typed:
        report.append(f"{door} | messages | the person's typed text is missing or altered | expected: {typed}")
    for t in tools:
        name = tool_name(t)
        if mv_tools is None:
            report.append(f"{door} | tools | tool not declared by the canary (no Model view to compare) | {name}")
        elif name not in mv_tools:
            report.append(f"{door} | tools | tool not declared and not in the Builder Model view | {name}")
        elif norm(json.dumps(t, sort_keys=True)) != mv_tools[name]:
            report.append(f"{door} | tools | tool definition differs from the Builder Model view | {name}")


def check_unified(door: str, unified: dict, typed: str, report: list[str]) -> None:
    config = (unified or {}).get("config") or {}
    for i, m in enumerate(config.get("messages") or []):
        if m.get("role") != "user":
            continue
        for j, p in enumerate(m.get("content") or []):
            text = p.get("text") if isinstance(p, dict) else None
            if text is not None and text != typed:
                report.append(f"{door} | unified_payload.config.messages[{i}] part {j} | user-role text the person did not type | {text.strip()}")


def first_parity(door: str, real: dict, dry: dict, report: list[str]) -> None:
    """The preview and the real first request, compared text unit by text unit (normalised)."""
    def bag(body: dict) -> list[str]:
        system, users, tools = units(body)
        out = [norm(t) for _, t in system]
        for _, parts in users:
            out += [norm(p) for p in parts]
        out += ["tool " + tool_name(t) for t in tools]
        return out
    a, b = bag(real), bag(dry)
    for seg in a:
        if seg not in b:
            report.append(f"{door} | parity | in the real request, not in its dry run | {seg}")
    for seg in b:
        if seg not in a:
            report.append(f"{door} | parity | in the dry run, not in the real request | {seg}")


def model_view_of(path: Path | None) -> tuple[str | None, dict[str, str] | None, dict | None]:
    if not path or not path.exists():
        return None, None, None
    body = json.loads(json.loads(path.read_text())["raw_response"])["request"]["body"]
    system, users, tools = units(body)
    text = " ".join(norm(t) for _, t in system) + " " + " ".join(norm(p) for _, ps in users for p in ps)
    return text, {tool_name(t): norm(json.dumps(t, sort_keys=True)) for t in tools}, body


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("conversations", nargs="*")
    ap.add_argument("--run")
    ap.add_argument("--model-view")
    ap.add_argument("--typed", default=TYPED)
    args = ap.parse_args()
    run = Path(args.run) if args.run else None
    mv_path = Path(args.model_view) if args.model_view else (run / "builder-run.dry.json" if run else None)
    model_view, mv_tools, _ = model_view_of(mv_path)
    report: list[str] = []
    if model_view is None:
        report.append(f"(no Builder Model view capture at {mv_path}: platform blocks are matched by pattern only)")
    conn = connect()

    todo: list[tuple[str, str, str]] = [("conversation", c, args.typed) for c in args.conversations]
    dries: dict[str, Path] = {}
    if run:
        manifest = json.loads((run / "manifest.json").read_text())
        claimed = {e["conversation_id"] for e in manifest.values() if e.get("conversation_id")}
        for name, e in manifest.items():
            if e["kind"] == "dry":
                dries[e["door"]] = run / e["file"]
                continue
            cid = e.get("conversation_id")
            if e["door"] in ("mandate-try", "workflow"):
                cid = find_canary_conversation(conn, e["agent_id"], e["sent_at"], claimed)
            elif e["door"] == "agent-call" and cid:
                cid = child_conversation(conn, cid)
            if not cid:
                report.append(f"{e['door']} | - | no conversation found for this door (HTTP {e['status']})")
                continue
            claimed.add(cid)
            todo.append((e["door"], cid, e.get("typed") or args.typed))

    for door, cid, typed in todo:
        snaps = snapshots(conn, cid)
        if not snaps:
            report.append(f"{door} | {cid} | no request snapshot stored for this conversation")
            continue
        if door == "agent-call":
            typed = None  # the child's turn is the caller model's agent_call user_input, read below
            parent = q(conn, "select parent_conversation_id::text p from chat.conversation where id = %s", (cid,))
            for s in snapshots(conn, parent[0]["p"]) if parent and parent[0]["p"] else []:
                for m in (s["request_payload"] or {}).get("messages") or []:
                    for p in m.get("content") or [] if isinstance(m.get("content"), list) else []:
                        if isinstance(p, dict) and p.get("type") == "tool_use" and p.get("name") == "agent_call":
                            typed = (p.get("input") or {}).get("user_input")
            if typed is None:
                report.append(f"{door} | {cid} | the caller's agent_call user_input was not found in the caller's snapshots")
                typed = ""
        for s in snaps:
            label = f"{door} [{cid[:8]} it{s['iteration']} {s['provider']}]"
            check_request(label, s["request_payload"] or {}, typed, model_view, mv_tools, report)
            check_unified(label, s["unified_payload"] or {}, typed, report)
        if door in dries:
            dry_body = json.loads(json.loads(dries[door].read_text())["raw_response"])["request"]["body"]
            first_parity(door, snaps[0]["request_payload"] or {}, dry_body, report)

    for door, path in dries.items():
        rec = json.loads(path.read_text())
        if rec["status"] != 200:
            report.append(f"{door} (dry run) | - | HTTP {rec['status']} | {rec['raw_response'][:300]}")
            continue
        body = json.loads(rec["raw_response"])["request"]["body"]
        check_request(f"{door} (dry run)", body, args.typed, model_view, mv_tools, report)

    seen: set[str] = set()
    for line in report:
        if line not in seen:
            seen.add(line)
            print(line)
    sys.stdout.flush()


if __name__ == "__main__":
    main()
