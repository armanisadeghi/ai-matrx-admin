#!/usr/bin/env npx tsx
/**
 * Decision retraction — does undoing a person's decision take back everything it pulled in?
 *
 * WHAT IT PROTECTS: undo without poisoned data (smart-add-brand VISION Part 10, Arman 2026-10-14: "if you
 * accidentally identify something as being us but then you change your mind, there is really no going back if
 * that item … poisoned our data"). Design: common-docs smart-add-brand/UNDO.md. `web.decision_retraction`
 * previews and applies; `web.__decision_retraction_selftest()` builds a disposable brand in the Smart Add
 * fixture org, wrongly confirms an account with captured posts and facts, retracts it, checks every row, and
 * rolls everything back.
 *
 * WHAT FAILS IT: the function missing; the preview writing anything; the apply differing from the preview;
 * the account or its tracking left live; a fact whose ONLY evidence was the account left live; a fact with
 * other evidence deleted (it must stay, certainty downgraded); a pending finding from it left live; no
 * "not us" exclusion; the decision losing its audit trail.
 *
 * PROVEN FAILING (2026-10-14, production): before web.decision_retraction existed the self-test was missing
 * (UNMEASURED → exit 1 under --strict); after, all checks green.
 *
 *   pnpm check:decision-retraction            # loud, exit 0
 *   pnpm check:decision-retraction --strict   # exit 1 on any finding or an unmeasured run
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");
const EXPECTED = [
  "preview_changes_nothing",
  "preview_counts",
  "apply_matches_preview",
  "account_and_tracking_retracted",
  "only_evidence_fact_retracted",
  "shared_evidence_fact_kept_weakened",
  "unrelated_fact_untouched",
  "finding_from_it_retracted",
  "exclusion_added",
  "decision_keeps_audit",
  "agents_see_only_live_facts",
];

function loadSupabaseEnv(): { url: string; key: string } | null {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let key = process.env.SUPABASE_SECRET_KEY ?? "";
  for (const f of [".env.local", ".env.production.local", ".env.production", ".env"]) {
    if (url && key) break;
    const p = resolve(ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (!m) continue;
      const v = (m[2] ?? "").replace(/^['"]|['"]$/g, "");
      if (!url && m[1] === "NEXT_PUBLIC_SUPABASE_URL") url = v;
      if (!key && m[1] === "SUPABASE_SECRET_KEY") key = v;
    }
  }
  return url && key ? { url, key } : null;
}

async function main(): Promise<number> {
  const env = loadSupabaseEnv();
  if (!env) {
    console.error("LIVE PULL FAILED — UNMEASURED: no Supabase URL/secret key in env or .env* files");
    return STRICT ? 1 : 0;
  }
  const res = await fetch(`${env.url.replace(/\/$/, "")}/rest/v1/rpc/__decision_retraction_selftest`, {
    method: "POST",
    headers: {
      apikey: env.key,
      Authorization: `Bearer ${env.key}`,
      "Content-Type": "application/json",
      "Content-Profile": "web",
      "Accept-Profile": "web",
    },
    body: "{}",
    signal: AbortSignal.timeout(30_000),
  }).catch((error: unknown) => error as Error);
  if (res instanceof Error || !res.ok) {
    const why = res instanceof Error ? res.message : `${res.status} ${(await res.text()).slice(0, 300)}`;
    console.error(`LIVE PULL FAILED — UNMEASURED: ${why}`);
    return STRICT ? 1 : 0;
  }
  const rows = (await res.json()) as Array<{ check_name: string; ok: boolean; detail: string }>;
  let findings = 0;
  for (const row of rows.filter((r) => !EXPECTED.includes(r.check_name))) {
    findings++;
    console.log(`FAIL  ${row.check_name}: ${row.detail}`);
  }
  for (const name of EXPECTED) {
    const row = rows.find((r) => r.check_name === name);
    if (!row) {
      findings++;
      console.log(`FAIL  ${name}: missing from web.__decision_retraction_selftest()`);
    } else if (!row.ok) {
      findings++;
      console.log(`FAIL  ${name}: ${row.detail}`);
    } else {
      console.log(`ok    ${name}`);
    }
  }
  console.log(findings ? `${findings} finding(s)` : "decision retraction: all checks green");
  return findings && STRICT ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);
