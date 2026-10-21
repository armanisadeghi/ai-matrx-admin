#!/usr/bin/env npx tsx
/**
 * Offering mint sources — is a brand offering ever minted from a signal that is
 * not a positive one belonging to THIS brand?
 *
 * WHY IT EXISTS: census 2026-10-17 found datadestruction.com (a hard-drive
 * shredder) carrying "platelet rich plasma", "androgenetic alopecia", "knee
 * osteoarthritis" and "Cosmetic Injectables". The site valuer had ruled those
 * platform topics `offering_match = not_offered` (worth 0); the brand-offerings
 * cutover's `seo.fn_reconcile_site_offering_facts` minted a brand offering from
 * EVERY worth row and EVERY winning ladder placement, including system- and
 * organization-tier placements nobody at the brand made, and `seo.gsc_set_topic_value`
 * adopted the offering even for a not_offered or cleared ruling. The reconcile
 * also ignored soft-deleted rows, so a rerun re-minted retracted offerings.
 * Fixed by migrations/brand_offerings_mint_only_from_positive_signal.sql.
 *
 * HOW IT MEASURES: `seo.__offering_mint_conformance()` PLANTS each signal on
 * one live branded site (a not_offered ruling, a cleared ruling, a positive
 * ruling, a not_offered worth row, a retracted offering with a positive worth
 * row behind it, a system-tier placement of a keyword in the site's corpus),
 * runs the real writers, reads back, and rolls everything back by raising a
 * private error it catches. EXECUTE is granted to service_role only.
 *
 * PROVEN FAILING: on the pre-fix bodies (2026-10-21, production, rolled back)
 * not_offered_valuation_never_mints, cleared_valuation_never_mints,
 * reconcile_never_mints_from_not_offered, reconcile_never_resurrects_retracted
 * and reconcile_never_mints_from_foreign_tier all FAILED while
 * positive_valuation_still_adopts passed; after the fix all ten passed with
 * zero residue.
 *
 *   pnpm check:offering-mint-sources            # loud, exit 0
 *   pnpm check:offering-mint-sources:strict     # exit 1 on ANY finding
 *
 * Exit codes: 0 ok (or advisory findings), 1 findings/unmeasured with --strict,
 * 2 crashed. UNMEASURED IS NOT PASSED.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { exitAfterDrain } from "./lib/exit-after-drain";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RPC = "__offering_mint_conformance";
const TIMEOUT_MS = 20_000;
const STRICT = process.argv.includes("--strict");

/**
 * The checks the deployed function is contracted to return. An absent key is a
 * finding in its own right — see the header.
 */
const EXPECTED_CHECKS = [
  "probe_fixtures_available",
  "probe_ran_clean",
  "probe_planted_valuations",
  "not_offered_valuation_never_mints",
  "cleared_valuation_never_mints",
  // FALSIFIABILITY: a person's positive ruling must still adopt the offering.
  "positive_valuation_still_adopts",
  "reconcile_never_mints_from_not_offered",
  "reconcile_never_resurrects_retracted",
  "reconcile_never_mints_from_foreign_tier",
  "probe_left_no_residue",
] as const;

type ExpectedCheck = (typeof EXPECTED_CHECKS)[number];

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};
const TAG = {
  info: `${C.cyan}[INFO]${C.reset} `,
  warn: `${C.yellow}[WARN]${C.reset} `,
  fail: `${C.red}[FAIL]${C.reset} `,
  ok: `${C.green}[ OK ]${C.reset} `,
};

interface ConformanceRow {
  readonly check_key: string;
  readonly ok: boolean;
  readonly severity?: string;
  readonly detail: Record<string, unknown> | null;
}

/**
 * Same resolution order as check-soft-delete-cascade.ts, and for the same
 * reason: the secret key WINS over the publishable one regardless of file order,
 * because EXECUTE on this RPC is granted to service_role and postgres and never
 * to anon or authenticated — any other key answers 401/403 and the gate would
 * report itself UNMEASURED against a perfectly healthy database.
 */
function loadSupabaseEnv(): { url: string; key: string } | null {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let key = process.env.SUPABASE_SECRET_KEY ?? "";
  if (!url || !key) {
    let secret = "";
    for (const f of [".env.local", ".env.production.local", ".env.production", ".env"]) {
      const p = resolve(ROOT, f);
      if (!existsSync(p)) continue;
      for (const line of readFileSync(p, "utf8").split("\n")) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
        if (!m) continue;
        const v = (m[2] ?? "").replace(/^['"]|['"]$/g, "");
        if (!url && m[1] === "NEXT_PUBLIC_SUPABASE_URL") url = v;
        if (!secret && m[1] === "SUPABASE_SECRET_KEY") secret = v;
      }
      if (url && secret) break;
    }
    if (!key) key = secret;
  }
  return url && key ? { url, key } : null;
}

function isRow(value: unknown): value is ConformanceRow {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.check_key === "string" && typeof r.ok === "boolean";
}

async function fetchConformance(): Promise<
  { rows: ConformanceRow[]; failure: null } | { rows: null; failure: string }
> {
  const env = loadSupabaseEnv();
  if (!env) return { rows: null, failure: "no Supabase URL/secret key in env or .env* files" };

  const endpoint = `${env.url.replace(/\/$/, "")}/rest/v1/rpc/${RPC}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: env.key,
        Authorization: `Bearer ${env.key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Content-Profile": "seo",
        "Accept-Profile": "seo",
      },
      body: "{}",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      return {
        rows: null,
        failure: `rpc/${RPC} returned ${res.status}: ${(await res.text()).slice(0, 300)}`,
      };
    }
    const parsed: unknown = JSON.parse(await res.text());
    if (!Array.isArray(parsed)) return { rows: null, failure: `rpc/${RPC} did not return an array` };
    const rows = parsed.filter(isRow);
    if (rows.length !== parsed.length) {
      return { rows: null, failure: `rpc/${RPC} returned rows that are not {check_key, ok, ...}` };
    }
    return { rows, failure: null };
  } catch (err) {
    return {
      rows: null,
      failure: `could not reach Supabase at ${endpoint} (${err instanceof Error ? err.message : String(err)})`,
    };
  }
}

function renderDetail(detail: Record<string, unknown> | null): string[] {
  if (!detail) return [];
  const lines: string[] = [];
  const why = detail.why;
  if (typeof why === "string" && why.trim()) lines.push(`${C.dim}${why.trim()}${C.reset}`);
  for (const [k, v] of Object.entries(detail)) {
    if (k === "why") continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      lines.push(`${k}: ${v.map((i) => JSON.stringify(i)).join(", ")}`);
    } else if (v !== null && v !== undefined && v !== "") {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    }
  }
  return lines;
}

function unmeasured(reason: string): never {
  console.log("");
  console.log(
    `${TAG.warn}${C.bold}${C.yellow}LIVE PULL FAILED — offering mint sources are UNMEASURED${C.reset}`,
  );
  console.log(`  ${C.dim}${reason}${C.reset}`);
  console.log(
    `  ${C.dim}Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY. Nothing was checked — that is NOT a pass.${C.reset}`,
  );
  console.log("");
  exitAfterDrain(STRICT ? 1 : 0);
}

async function main(): Promise<number> {
  const result = await fetchConformance();
  if (result.rows === null) unmeasured(result.failure);

  const rows = result.rows;
  if (rows.length === 0) {
    unmeasured(`rpc/${RPC} returned zero rows — it measured nothing`);
  }

  const byKey = new Map(rows.map((r) => [r.check_key, r]));
  const missing = EXPECTED_CHECKS.filter((k) => !byKey.has(k));
  const failed = rows.filter((r) => !r.ok);

  console.log("");
  console.log(
    `${C.bold}Offering mint sources${C.reset} ${C.dim}(seo.${RPC})${C.reset}`,
  );

  for (const key of EXPECTED_CHECKS) {
    const row = byKey.get(key);
    if (!row) {
      console.log(`  ${TAG.fail}${key} ${C.dim}— NOT RETURNED by the function${C.reset}`);
      continue;
    }
    if (row.ok) {
      console.log(`  ${TAG.ok}${key}`);
      continue;
    }
    console.log(`  ${TAG.fail}${key}`);
    for (const line of renderDetail(row.detail)) console.log(`        ${line}`);
  }

  // A key the function returns that this file does not know about is not a
  // failure — it is a new check whose key belongs in EXPECTED_CHECKS.
  for (const r of rows) {
    if (!EXPECTED_CHECKS.includes(r.check_key as ExpectedCheck)) {
      console.log(
        `  ${TAG.info}unlisted  ${r.check_key} ${C.dim}— add it to EXPECTED_CHECKS in scripts/check-offering-mint-sources.ts${C.reset}`,
      );
    }
  }

  console.log("");
  if (failed.length === 0 && missing.length === 0) {
    console.log(
      `${TAG.ok}A brand offering is minted only from a positive signal of that brand; a retracted one stays retracted.`,
    );
    console.log("");
    return 0;
  }

  console.log(
    `${TAG.fail}${C.bold}${C.red}OFFERINGS CAN BE MINTED FROM THE WRONG SIGNAL — ${failed.length} failing check(s), ${missing.length} missing check(s)${C.reset}`,
  );
  console.log(
    `  ${C.dim}A "not offered" ruling, a cleared ruling, or another tenant's keyword placement can put an${C.reset}`,
  );
  console.log(
    `  ${C.dim}offering on a brand (2026-10-17: a data-destruction company carried a clinic's PRP items).${C.reset}`,
  );
  console.log(
    `  ${C.dim}Fix: re-apply migrations/brand_offerings_mint_only_from_positive_signal.sql, then re-run.${C.reset}`,
  );
  console.log("");
  return STRICT ? 1 : 0;
}

main().then(
  (code) => exitAfterDrain(code),
  (err) => {
    console.error(`${TAG.fail}check-offering-mint-sources crashed:`, err);
    exitAfterDrain(2);
  },
);
