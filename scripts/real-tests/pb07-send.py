#!/usr/bin/env python3
# matrx-agent-traffic: marked every server request carries X-Matrx-Agent-Traffic: real-tests-pb07-send
"""Send real test PB-07 (core-chain, nothing undeclared reaches the model) to the LIVE server as admin@admin.com.

It only SENDS. It asserts nothing and prints no pass or fail: a runner executes it, a grader runs
pb07-provenance.py over the output directory. Spec: common-docs/operations/real-tests/core-chain/
PB-07-nothing-undeclared.md; fixture ids: core-chain LEDGER.md "PB-07 fixtures".

The same typed message and the same variable value go through every door, one call per door. For each
door that has a dry run, the same body is also sent with `dry_run: true` (no model call, nothing stored)
and the captured provider request is saved beside it, so the grader can compare preview and real run.

  door              real call                                               dry run
  chat              POST /ai/agents/<canary>, client.surface matrx-user/chat      same + dry_run
  agent-run         POST /ai/agents/<canary>, client.surface matrx-user/agent-run same + dry_run
  agent-api         POST /ai/agents/<canary>, no client (bare API caller)         same + dry_run
  builder-run       POST /ai/manual, the canary's definition inline, surface
                    matrx-user/agent-builder (the Builder's Test run)             same + dry_run = the Model view
  mandate-client    POST /ai/mandates/realtests.pb07_canary                       same + dry_run
  mandate-try       POST /mandates/realtests.pb07_canary/try                      (none)
  workflow          POST /workflows/<PB-07 canary via workflow>/runs              (none)
  agent-call        POST /ai/agents/<Canary Caller> (it calls the canary)         (none)
  together          POST /ai/agents/<Canary (Together)>, surface matrx-user/chat  same + dry_run

Not sent (the grader records them as not run): the connector `agent_run` (an AI Dream MCP tool signed in
as the MCP's own identity, with no organization parameter; this script cannot hold that sign-in) and the
retry message (it fires only when a provider returns a retryable finish; it cannot be caused on demand).

Usage:
  pb07-send.py                      every door, real call then dry run
  pb07-send.py --only chat          one door
  pb07-send.py --dry-only           dry runs only (no model call, nothing stored): install check
  pb07-send.py --fault              FAULT RUN: the builder-run door only, its turn declared on the surface
                                    matrx-user/canvas-viewer, whose manifest declares one system note
                                    (render_environment_note); saved as door "builder-run-fault"
  pb07-send.py --out DIR            write the files to DIR (default: a new temp dir)

Writes one JSON file per call (<door>.json, <door>.dry.json) and manifest.json (door -> conversation id,
sent_at, status, agent id). Sign-in: a one-time magic-link token for admin@admin.com minted with the live
project's secret key (matrx-frontend/.env.local, never printed), as pb04-send.py does.
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
ORG = "226be635-194d-42dd-87c8-7a9562f70939"  # Safety Net Real Tests
CANARY = "40379907-a685-4d59-93db-6533c5fdcb75"  # "PB-07 Canary" — Claude Haiku 5.5
CANARY_T = "76c1f930-3c08-40db-b156-6eeab958725d"  # "PB-07 Canary (Together)" — DeepSeek V4 Flash via Together
CALLER = "a9cf243e-90b3-435d-96e2-f21e56fe08f5"  # "PB-07 Canary Caller" — agent_call -> canary
WORKFLOW = "ccd49351-9b2d-46a1-874e-16909a2b8eda"  # "PB-07 canary via workflow"
MANDATE = "realtests.pb07_canary"
SCOPE = "e380eb0b-1196-49b6-a47c-1e9fc5f96aac"  # scope "PB-07 canary" (type Canary checks)
HAIKU = "c5a1f7e3-6d28-4b9c-8e47-2f3a9d0b6c21"

TYPED = "PB7-TYPED-5R1C Please send the canary line."
VARIABLES = {"canary_code": "PB7-VAR-7Q2K"}

# The canary's authored definition, inline for the manual (Builder) door — byte-identical to the stored row.
SYSTEM_TEXT = (
    "You are the PB-07 canary desk. Marker PB7-AUTH-K3VQ.\n\nVariable code: {{canary_code}}\n\n{{<pb07_canary_block>}}\n\n"
    "Reply with one line: every token that starts with PB7- that you were given anywhere, in the order you met them, "
    "separated by single spaces. Nothing else."
)
VARIABLE_DEFINITIONS = [{
    "name": "canary_code", "label": "Canary code", "helpText": "The canary variable marker.", "required": False,
    "defaultValue": "PB7-VAR-7Q2K", "customComponent": {"type": "textarea"},
}]

DOORS = ["chat", "agent-run", "agent-api", "builder-run", "mandate-client", "mandate-try", "workflow", "agent-call", "together"]
HAS_DRY = {"chat", "agent-run", "agent-api", "builder-run", "mandate-client", "together"}


def _env() -> dict:
    env = {}
    for line in (Path.home() / "code/matrx-frontend/.env.local").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"')
    return env


def admin_token() -> str:
    env = _env()
    db, secret, pub = env["NEXT_PUBLIC_SUPABASE_URL"], env["SUPABASE_SECRET_KEY"], env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
    req = urllib.request.Request(
        db + "/auth/v1/admin/generate_link",
        data=json.dumps({"type": "magiclink", "email": "admin@admin.com"}).encode(),
        headers={"apikey": secret, "Authorization": "Bearer " + secret, "Content-Type": "application/json"},
    )
    d = json.load(urllib.request.urlopen(req))
    hashed = d.get("hashed_token") or d.get("properties", {}).get("hashed_token")
    req = urllib.request.Request(
        db + "/auth/v1/verify",
        data=json.dumps({"type": "magiclink", "token_hash": hashed}).encode(),
        headers={"apikey": pub, "Content-Type": "application/json"},
    )
    return json.load(urllib.request.urlopen(req))["access_token"]


def send(token: str, path: str, body: dict) -> tuple[int, dict, str]:
    req = urllib.request.Request(
        SERVER + path, method="POST", data=json.dumps(body).encode(),
        headers={
            "Authorization": "Bearer " + token, "Content-Type": "application/json", "X-Organization-Id": ORG,
            "User-Agent": "matrx-real-tests/1.0 (pb07-send)", "X-Matrx-Agent-Traffic": "real-tests-pb07-send",
        },
    )
    try:
        resp = urllib.request.urlopen(req, timeout=900)
        return resp.status, dict(resp.headers), resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", "replace")


def agent_body(cid: str, surface: str | None) -> dict:
    body = {"conversation_id": cid, "is_new": True, "store": True, "organization_id": ORG, "scope_ids": [SCOPE],
            "user_input": TYPED, "variables": dict(VARIABLES)}
    if surface:
        body["client"] = {"surface": surface, "capabilities": [], "state": {}}
    return body


def manual_body(cid: str, surface: str) -> dict:
    return {
        "ai_model_id": HAIKU, "agent_id": CANARY, "conversation_id": cid, "is_new": True, "store": True,
        "organization_id": ORG, "scope_ids": [SCOPE],
        "messages": [{"role": "system", "content": [{"type": "text", "text": SYSTEM_TEXT}]},
                     {"role": "user", "content": [{"type": "text", "text": TYPED}]}],
        "template_message_count": 1, "variables": dict(VARIABLES), "variable_definitions": VARIABLE_DEFINITIONS,
        "prompt_blocks": ["pb07_canary_block"], "client": {"surface": surface, "capabilities": [], "state": {}},
        "stream": True, "source_app": "matrx-frontend", "source_feature": "agent-builder", "initiation": "user",
    }


def build(door: str) -> tuple[str, dict, str, str | None]:
    """(path, body, agent id whose conversation is graded, conversation id we chose or None)."""
    cid = str(uuid.uuid4())
    if door == "chat":
        return f"/ai/agents/{CANARY}", agent_body(cid, "matrx-user/chat"), CANARY, cid
    if door == "agent-run":
        return f"/ai/agents/{CANARY}", agent_body(cid, "matrx-user/agent-run"), CANARY, cid
    if door == "agent-api":
        return f"/ai/agents/{CANARY}", agent_body(cid, None), CANARY, cid
    if door == "builder-run":
        return "/ai/manual", manual_body(cid, "matrx-user/agent-builder"), CANARY, cid
    if door == "builder-run-fault":
        return "/ai/manual", manual_body(cid, "matrx-user/canvas-viewer"), CANARY, cid
    if door == "mandate-client":
        return f"/ai/mandates/{MANDATE}", agent_body(cid, None), CANARY, cid
    if door == "mandate-try":
        return f"/mandates/{MANDATE}/try", {"variables": dict(VARIABLES), "user_input": TYPED,
                                             "candidate": {"selection": "current"}, "organization_id": ORG}, CANARY, None
    if door == "workflow":
        return f"/workflows/{WORKFLOW}/runs", {"inputs": {"typed": TYPED, **VARIABLES}, "organization_id": ORG}, CANARY, None
    if door == "agent-call":
        body = agent_body(cid, None)
        body.pop("variables")
        return f"/ai/agents/{CALLER}", body, CALLER, cid
    if door == "together":
        return f"/ai/agents/{CANARY_T}", agent_body(cid, "matrx-user/chat"), CANARY_T, cid
    raise SystemExit(f"unknown door {door}")


def record(out: Path, manifest: dict, door: str, kind: str, token: str) -> None:
    path, body, agent, cid = build(door)
    if kind == "dry":
        body = {**body, "dry_run": True}
    sent_at = datetime.now(timezone.utc).isoformat()
    status, headers, raw = send(token, path, body)
    lower = {k.lower(): v for k, v in headers.items()}
    conv = None if kind == "dry" else (lower.get("x-conversation-id") or cid)
    name = door if kind == "real" else f"{door}.dry"
    (out / f"{name}.json").write_text(json.dumps({
        "door": door, "kind": kind, "sent_at": sent_at, "request": {"url": SERVER + path, "organization": ORG, "body": body},
        "status": status, "conversation_id": conv, "request_id": lower.get("x-request-id"), "headers": headers,
        "raw_response": raw,
    }, indent=1, ensure_ascii=False))
    manifest[name] = {"door": door, "kind": kind, "sent_at": sent_at, "status": status, "conversation_id": conv,
                      "agent_id": agent, "typed": TYPED, "file": f"{name}.json"}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=1))
    print(f"{name}: HTTP {status}, conversation {conv}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--only", choices=DOORS, help="send one door")
    ap.add_argument("--dry-only", action="store_true", help="dry runs only (no model call, nothing stored)")
    ap.add_argument("--fault", action="store_true", help="fault run: builder-run on the canvas-viewer surface")
    ap.add_argument("--out", help="directory for the files (default: a new temp dir)")
    args = ap.parse_args()
    out = Path(args.out) if args.out else Path(tempfile.mkdtemp(prefix="pb07-"))
    out.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((out / "manifest.json").read_text()) if (out / "manifest.json").exists() else {}
    token = admin_token()
    if args.fault:
        if not args.dry_only:
            record(out, manifest, "builder-run-fault", "real", token)
        record(out, manifest, "builder-run-fault", "dry", token)
    else:
        for door in [args.only] if args.only else DOORS:
            if not args.dry_only:
                record(out, manifest, door, "real", token)
            if door in HAS_DRY:
                record(out, manifest, door, "dry", token)
    print(f"files in {out}")


if __name__ == "__main__":
    main()
