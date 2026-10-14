#!/usr/bin/env npx tsx
/**
 * Brand archive cascade — does archiving a brand still take EVERY owned row with it?
 *
 * WHAT IT PROTECTS: the Smart Add fresh start (smart-add-brand VISION Part 11, Arman 2026-10-14: "archive a brand
 * and everything goes with it … each time will start totally fresh"). `web.brand_archive` stamps one row; the
 * parts follow through `platform.soft_delete_edge` cascade edges and `web._brand_cascade_softdelete_extras`.
 *
 * WHAT FAILS IT (live pull of `web.__brand_archive_conformance()`):
 *   brand_edges_ruled          a soft-deletable table gained an FK to web.brand with no ruled edge (cascade/keep)
 *                              — a NEW owned table added without an edge leaves a trace behind every archive;
 *   cascade_trigger_on_brand   the generic cascade trigger is missing/disabled on web.brand;
 *   extras_trigger_on_brand    captured posts, setup runs, provision snapshots and live crawls stopped following;
 *   no_legacy_refusal          the old "delete its sites first" refusal came back;
 *   owned_unique_keys_partial  a unique key on brand/site/property/tracked account/captured post counts archived
 *                              rows, so re-creating the same name/site/handle collides.
 *   archive_restore_roundtrip  (live pull of `web.__brand_archive_roundtrip()`) real brands archived then restored
 *                              inside rolled-back subtransactions: a child guard refused the archive because its
 *                              parent was already archived, or the restore left parts behind.
 *
 * PROVEN FAILING (2026-10-14, production, round trip): with `web.validate_brand_offering_scope` put back to its
 * pre-fix body inside a rolled-back transaction, archive_restore_roundtrip failed on two brands with
 * "brand_offering_scope_mismatch: organization must match the live brand" (the exact error a person hit in
 * Marketing › Brands); with the fix, 4/4 brands archived and restored exactly.
 *
 * PROVEN FAILING (2026-10-14, production): before the edges were declared all five checks failed (22 unruled
 * edges, no cascade trigger, no extras trigger, legacy guard present, brand_slug_key not partial); after, all green.
 *
 *   pnpm check:brand-archive-cascade            # loud, exit 0
 *   pnpm check:brand-archive-cascade --strict   # exit 1 on any finding or an unmeasured run
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");
const EXPECTED = [
  "brand_edges_ruled",
  "cascade_trigger_on_brand",
  "extras_trigger_on_brand",
  "no_legacy_refusal",
  "owned_unique_keys_partial",
  "archive_restore_roundtrip",
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
  type Row = { check_name: string; ok: boolean; detail: string };
  const pull = async (fn: string, timeoutMs: number): Promise<Row[] | string> => {
    const res = await fetch(`${env.url.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: {
        apikey: env.key,
        Authorization: `Bearer ${env.key}`,
        "Content-Type": "application/json",
        "Content-Profile": "web",
        "Accept-Profile": "web",
      },
      body: "{}",
      signal: AbortSignal.timeout(timeoutMs),
    }).catch((error: unknown) => error as Error);
    if (res instanceof Error) return `${fn}: ${res.message}`;
    if (!res.ok) return `${fn}: ${res.status} ${(await res.text()).slice(0, 300)}`;
    return (await res.json()) as Row[];
  };
  const pulls = await Promise.all([
    pull("__brand_archive_conformance", 15_000),
    pull("__brand_archive_roundtrip", 60_000),
  ]);
  const failed = pulls.filter((p): p is string => typeof p === "string");
  if (failed.length) {
    console.error(`LIVE PULL FAILED — UNMEASURED: ${failed.join("; ")}`);
    return STRICT ? 1 : 0;
  }
  const rows = pulls.flat() as Row[];
  let findings = 0;
  for (const name of EXPECTED) {
    const row = rows.find((r) => r.check_name === name);
    if (!row) {
      findings++;
      console.log(`FAIL  ${name}: missing from web.__brand_archive_conformance()`);
    } else if (!row.ok) {
      findings++;
      console.log(`FAIL  ${name}: ${row.detail}`);
    } else {
      console.log(`ok    ${name}`);
    }
  }
  console.log(findings ? `${findings} finding(s)` : "brand archive cascade: all checks green");
  return findings && STRICT ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);
