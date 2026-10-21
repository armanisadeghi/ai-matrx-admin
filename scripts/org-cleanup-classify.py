"""ORG-CLEANUP classifier: sorts every active organization into the review's keep / archive tiers. READ-ONLY.

Run from aidream (it borrows aidream's live-database URL):
  cd aidream && uv run python ../matrx-frontend/scripts/org-cleanup-classify.py <out.json>
Writes {now, skipped_tables, orgs:[{id,name,keep,archive_tier,...}]} and prints the tier counts.
Rules: ORG-CLEANUP-REVIEW.md "Corrected keep rules", plus two safety keeps added by the executor (ORG-CLEANUP.md):
  * any org whose id is opened by live code (aidream / matrx-frontend, history files excluded);
  * any org a real person or guest can still reach WITHOUT a sign-in event (a refreshable auth session):
    a token refresh never touches auth.users, so the sign-in restore would not fire for them.
"""

from __future__ import annotations

import asyncio
import json
import subprocess
import sys
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

import asyncpg

from aidream.testing.live_database import live_database_url

ROOT = Path("/Users/armanisadeghi/code")
REPOS = [ROOT / "aidream", ROOT / "matrx-frontend"]
EXCLUDE = [  # history, not live opens (review §2)
    ":(exclude)*.md", ":(exclude)*.json", ":(exclude)*.jsonl", ":(exclude)**/scripts/campaign-tests/**",
    ":(exclude)**/migrations/**", ":(exclude)migrations/**", ":(exclude)**/data_fixes/**",
    ":(exclude)features/make/recent.ts", ":(exclude)**/*.sql",
]
REAL_ORGS = {
    "5dc930e9-bd65-44a1-8369-af773f6e1a5b", "f9cb3e35-2a65-4f2a-8525-088d6551071c", "39c38960-d30c-4840-b0c1-c9960de95582",
    "8df6d5a1-5aaf-4159-9185-b335b7cd0085", "6c016781-f422-4b71-9528-024f264885a4", "ee221283-c94a-4ad8-a2c6-086cdf2e0b3d",
    "171f481a-9ca1-4f95-8dc6-549a327ae71e", "5e44ec19-3965-4b12-91b2-b2bdb2712abc",
}
SERVICE_ORGS = {"fa472df2-36da-499d-a7a4-d109c1a8f6f8", "e6b695b2-ff90-47f6-ac01-825b026a1969", "70d2fc15-acb0-42fb-ac46-d5611677615d"}
TEST_HOMES = {
    "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", "8cb71c8b-5b49-4563-a5fe-d77ff600f8ee", "bb6fec2f-e635-40b0-8e78-5b610e8bc65e",
    "23c2ac41-8044-49ed-9af9-35761370e5c0", "4d793eff-cf88-40be-babc-cafaf31186d8",
}
ARMAN = {"arman@armansadeghi.com", "arman@allgreenrecycling.com", "arman@titaniumsuccess.com", "arman26@gmail.com",
         "armani@vasaro.com", "armanisadeghi26@gmail.com"}
TEST_ACCOUNTS = {"admin@admin.com", "test@test.com"}
NOT_CONTENT = {  # provisioning / bookkeeping rows every org gets (review §1)
    "users.profiles", "billing.org_plan", "platform.knob_override", "users.user_preferences", "iam.memberships",
    "iam.org_admin_audit", "iam.organizations", "platform.search_item", "platform.knob_override_audit",
    "platform.cutover_seam_press", "iam.organization_preferences",
}
NOT_CONTENT_SCHEMAS = {"audit", "history", "ops", "graveyard", "cron"}


def code_refs(ids: list[str]) -> set[str]:
    found: set[str] = set()
    for repo in REPOS:
        out = subprocess.run(["git", "grep", "-o", "-h", "-F", "-f", "-", "--", ".", *EXCLUDE], cwd=repo,
                             input="\n".join(ids), capture_output=True, text=True).stdout
        found |= {x.strip() for x in out.splitlines() if x.strip()}
    return found


def is_fixture(m) -> bool:
    return bool(m["fixture"]) or (m["email"] or "").endswith(("@fixtures.aimatrx.com", "@system.internal"))


async def main(out_path: str) -> None:
    conn = await asyncpg.connect(live_database_url(), statement_cache_size=0)
    try:
        await conn.execute("set statement_timeout = '60s'")
        orgs = await conn.fetch("select id::text, name, slug, is_system, settings::text settings from iam.organizations where archived_at is null")
        ids = [r["id"] for r in orgs]
        refs = code_refs(ids)
        members = await conn.fetch(
            """
            select m.organization_id::text org, u.email, u.is_anonymous, u.created_at, u.last_sign_in_at, u.email_confirmed_at,
                   u.raw_app_meta_data ? 'test_fixture' fixture, u.raw_app_meta_data #>> '{test_fixture,expires_at}' expires_at,
                   exists (select 1 from iam.account_closure c where c.user_id = u.id and c.reopened_at is null) closed,
                   exists (select 1 from auth.sessions s where s.user_id = u.id and (s.not_after is null or s.not_after > now())) live_session
              from iam.memberships m join auth.users u on u.id = m.user_id
             where m.container_type = 'organization' and m.status = 'active' and m.deleted_at is null
               and m.organization_id = any($1::uuid[])
            """, ids)
        tables = await conn.fetch(
            """select c.table_schema s, c.table_name t from information_schema.columns c
                 join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
                where c.column_name = 'organization_id' and t.table_type = 'BASE TABLE'""")
        content: dict[str, int] = {}
        convs: dict[str, int] = {}
        files: dict[str, int] = {}
        skipped: list[str] = []
        for r in tables:
            name = f"{r['s']}.{r['t']}"
            if name in NOT_CONTENT or r["s"] in NOT_CONTENT_SCHEMAS or r["t"].startswith("sandbox_instance"):
                continue
            try:
                rows = await conn.fetch(f'select organization_id::text o, count(*) n from "{r["s"]}"."{r["t"]}" '
                                        "where organization_id = any($1::uuid[]) group by 1", ids)
            except Exception as e:  # noqa: BLE001 — reported, never silently dropped
                skipped.append(f"{name}: {e.__class__.__name__}")
                continue
            for row in rows:
                content[row["o"]] = content.get(row["o"], 0) + row["n"]
                if name == "chat.conversation":
                    convs[row["o"]] = row["n"]
                if name == "files.files":
                    files[row["o"]] = row["n"]
        now = await conn.fetchval("select now()")
    finally:
        await conn.close()

    by_org: dict[str, list] = {}
    for m in members:
        by_org.setdefault(m["org"], []).append(m)
    d7, d30 = now - timedelta(days=7), now - timedelta(days=30)
    report = []
    for o in orgs:
        oid, ms = o["id"], by_org.get(o["id"], [])
        settings = json.loads(o["settings"] or "{}")
        emails = {m["email"] for m in ms}
        is_test_org = bool(emails & TEST_ACCOUNTS)
        has_content = content.get(oid, 0) > 0
        keep = None
        if (o["is_system"] or oid in REAL_ORGS or oid in SERVICE_ORGS or oid in TEST_HOMES or emails & ARMAN
                or (o["name"] or "").startswith("api-key:") or (o["slug"] or "").startswith("api-key")
                or str(settings.get("fixture_marker", "")).startswith("standing:") or oid in refs):
            keep = "K0"
        for m in ms:
            if keep:
                break
            if m["email"] in TEST_ACCOUNTS or m["email"] in ARMAN:
                continue
            if is_fixture(m):
                exp = m["expires_at"]
                if exp is None or datetime.fromisoformat(exp.replace("Z", "+00:00")) > now:
                    keep = "F-keep"
                continue
            if m["closed"]:
                continue
            ls, cr = m["last_sign_in_at"], m["created_at"]
            if m["is_anonymous"]:
                if max(x for x in (ls, cr) if x) >= d7 or convs.get(oid, 0) >= 3 or files.get(oid, 0) > 0:
                    keep = "K4"
            elif ls is not None and ls > cr + timedelta(minutes=10):
                keep = "K1"
            elif ls is not None or m["email_confirmed_at"] is not None:
                if has_content or (ls is not None and ls >= d30):
                    keep = "K2"
            elif has_content or cr >= d7:
                keep = "K3"
        if not keep and any(m["live_session"] and not m["closed"] and m["email"] not in TEST_ACCOUNTS and not is_fixture(m)
                            for m in ms):
            keep = "S-live-session"
        tier = None
        if not keep:
            if not ms:
                tier = "M"
            elif is_test_org:
                tier = "A1"
            elif any(m["is_anonymous"] for m in ms):
                tier = "A4"
            elif any(is_fixture(m) for m in ms):
                tier = "F"
            elif any(m["last_sign_in_at"] is None and m["email_confirmed_at"] is None for m in ms):
                tier = "A3"
            else:
                tier = "A2"
        report.append({"id": oid, "name": o["name"], "keep": keep, "archive_tier": tier, "content": content.get(oid, 0),
                       "conversations": convs.get(oid, 0), "files": files.get(oid, 0), "code_ref": oid in refs, "members": len(ms)})
    Path(out_path).write_text(json.dumps({"now": now.isoformat(), "skipped_tables": skipped, "orgs": report}, indent=1))
    print("active", len(report))
    print("keep", dict(Counter(r["keep"] for r in report if r["keep"])))
    print("archive", dict(Counter(r["archive_tier"] for r in report if r["archive_tier"])))
    print("skipped tables", skipped)


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1]))
