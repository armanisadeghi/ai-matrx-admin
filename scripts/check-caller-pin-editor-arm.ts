#!/usr/bin/env npx tsx
/**
 * THE CALLER-PIN GUARD — a RESTRICTIVE "<col>_is_the_caller_update" policy must
 * never block a legitimate non-owner editor.
 *
 * WHY: SECURITY-SWEEP-2 put RESTRICTIVE WITH CHECK (user_id = auth.uid() OR admin) on
 * ~43 tables. Where the permissive std_update admits shared editors
 * (iam.has_access(token, id, 'editor')), every save by a non-owner editor failed 42501
 * (workbench.udt_workbooks, 2026-10-12). The fix is the access arm on the restrictive
 * check PLUS a way to refuse ownership change: either the _bridge_legacy_owner trigger
 * (mirrors user_id -> created_by, which iam._guard_governance_columns refuses) or
 * iam._guard_pin_column on the pin column.
 *
 * FAILS ON
 *   A — a restrictive caller-pin UPDATE policy with no iam.has_access arm on a table whose
 *       permissive UPDATE policy admits editors via iam.has_access.
 *   B — a caller-pin policy WITH the access arm on a table carrying neither
 *       _bridge_legacy_owner nor _guard_pin_column (editors could rewrite the pin).
 *
 *   pnpm check:caller-pin-editor-arm [--strict]   pnpm check:caller-pin-editor-arm:self-test
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { unwrapRows } from "../lib/integrity/unwrap";
import { exitAfterDrain } from "./lib/exit-after-drain";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");

export interface PinRow {
  schema_name: string;
  table_name: string;
  policy_name: string;
  check_expr: string;
  editor_admitted: boolean; // a permissive UPDATE/ALL(non-service) policy mentions iam.has_access
  has_pin_trigger: boolean; // _bridge_legacy_owner or _guard_pin_column present
}

export function findings(rows: PinRow[]): string[] {
  const out: string[] = [];
  for (const r of rows) {
    const arm = /iam\.has_access\(/.test(r.check_expr);
    const t = `${r.schema_name}.${r.table_name}`;
    if (!arm && r.editor_admitted)
      out.push(`${t}: ${r.policy_name} blocks shared editors (no iam.has_access arm) — every non-owner edit fails 42501`);
    if (arm && !r.has_pin_trigger)
      out.push(`${t}: ${r.policy_name} has the editor arm but no _bridge_legacy_owner/_guard_pin_column — editors could rewrite the pin`);
  }
  return out;
}

const LIVE_QUERY = `
select n.nspname as schema_name, c.relname as table_name, pol.polname as policy_name,
  coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') as check_expr,
  exists (select 1 from pg_policy p2 where p2.polrelid = pol.polrelid and p2.polpermissive
          and p2.polcmd in ('w','*') and p2.polname <> 'svc_all'
          and coalesce(pg_get_expr(p2.polqual, p2.polrelid), '') like '%iam.has_access(%') as editor_admitted,
  exists (select 1 from pg_trigger g join pg_proc f on f.oid = g.tgfoid
          where g.tgrelid = pol.polrelid and not g.tgisinternal
            and f.proname in ('_bridge_legacy_owner', '_guard_pin_column')) as has_pin_trigger
from pg_policy pol join pg_class c on c.oid = pol.polrelid join pg_namespace n on n.oid = c.relnamespace
where not pol.polpermissive and pol.polcmd in ('w','*') and pol.polname like '%\\_is\\_the\\_caller\\_update'
order by 1, 2`;

function selfTest(): number {
  const base: PinRow = { schema_name: "s", table_name: "t", policy_name: "t_user_id_is_the_caller_update",
    check_expr: "((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT is_platform_admin() AS x))", editor_admitted: true, has_pin_trigger: true };
  const cases: Array<[string, PinRow, number]> = [
    ["planted: pin with no access arm, editors admitted", base, 1],
    ["owner-only table (editors not admitted)", { ...base, editor_admitted: false }, 0],
    ["fixed: access arm + pin trigger", { ...base, check_expr: base.check_expr + " OR iam.has_access('x'::text, id, 'editor'::permission_level)" }, 0],
    ["planted: access arm but no pin trigger", { ...base, check_expr: "iam.has_access('x'::text, id, 'editor'::permission_level)", has_pin_trigger: false }, 1],
  ];
  let bad = 0;
  for (const [label, row, want] of cases) {
    const got = findings([row]).length;
    if (got !== want) bad++;
    console.log(`  ${got === want ? "PASS" : "FAIL"}  expected ${want} finding(s), got ${got}  ${label}`);
  }
  return bad ? 1 : 0;
}

function loadEnv(): { url: string; key: string } | null {
  const want = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY"];
  const env: Record<string, string> = {};
  for (const k of want) if (process.env[k]) env[k] = process.env[k] as string;
  for (const f of [".env.local", ".env.production.local", ".env.production", ".env"]) {
    const p = resolve(ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && want.includes(m[1]) && !env[m[1]]) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  }
  return env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SECRET_KEY ? { url: env.NEXT_PUBLIC_SUPABASE_URL, key: env.SUPABASE_SECRET_KEY } : null;
}

async function main(): Promise<number> {
  if (process.argv.includes("--self-test")) return selfTest();
  const env = loadEnv();
  if (!env) {
    console.log("UNMEASURED — no NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY; this is not a pass.");
    return STRICT ? 1 : 0;
  }
  const db = createClient(env.url, env.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.rpc("execute_admin_query", { query: LIVE_QUERY });
  if (error) {
    console.error(`ERROR could not read pg_policy: ${error.message}`);
    return 2;
  }
  const rows = unwrapRows(data) as unknown as PinRow[];
  const f = findings(rows);
  if (f.length === 0) {
    console.log(`OK ${rows.length} caller-pin update policies; none blocks a shared editor or leaves the pin rewritable.`);
    return 0;
  }
  console.log(`${f.length} CALLER-PIN FINDING(S)`);
  for (const l of f) console.log(`  ${l}`);
  console.log("  Fix: add OR iam.has_access('<token>', id, 'editor') to the check and a _guard_pin_column trigger (see iam._guard_pin_column).");
  return 1;
}

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main().then((c) => exitAfterDrain(c), (e) => { console.error(e); exitAfterDrain(2); });
