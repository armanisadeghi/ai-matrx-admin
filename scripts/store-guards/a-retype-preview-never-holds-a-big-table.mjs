#!/usr/bin/env node
// scripts/store-guards/a-retype-preview-never-holds-a-big-table.mjs — lane ADV-FIX-B (ADV-1 F8, 2026-10-18)
//
// GUARD: the panel's count before a column change (custom.field_retype_preview) runs the real change inside
// a subtransaction it rolls back, so it holds row locks on every record of the column while it runs, and
// the panel asks on every pick. It must be bounded:
//   1. a small column (6 values) answers EXACTLY (converts + kept_aside, not limited);
//   2. a column of 10,000 values answers "limited" with the count held, in well under 3 seconds, and
//      touches nothing (the same call leaves no row changed);
//   3. a medium column (1,500 values) finishes inside the statement cap either way (exact or limited).
// The whole run is ONE transaction that is ROLLED BACK. Runs on the main database as admin@admin.com in
// its own Cedar Ridge Physical Therapy workspace.
//
//   node scripts/store-guards/a-retype-preview-never-holds-a-big-table.mjs [--apply <file.sql>]
//
// `--apply` executes a SQL file inside the rolled-back transaction first (a migration not yet applied), so
// the guard is seen RED on the live body and GREEN on the new one without changing anything.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ORG = "bb6fec2f-e635-40b0-8e78-5b610e8bc65e";
const ADMIN_CLAIMS = '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated","email":"admin@admin.com"}';
const PATCH = JSON.stringify({ parity_type: "select" });
const WORDS = ["Ordered", "Shipped", "Received", "Backordered", "Returned"];

function liveUrl() {
  const env = readFileSync(resolve(ROOT, "../aidream/.env"), "utf8");
  const get = (k) => [...env.matchAll(new RegExp(`^${k}=(.*)$`, "gm"))].pop()?.[1]?.trim().replace(/^["']|["']$/g, "");
  return { host: get("SUPABASE_MATRIX_HOST"), port: Number(get("SUPABASE_MATRIX_PORT") || 5432), database: get("SUPABASE_MATRIX_DATABASE_NAME"),
    user: get("SUPABASE_MATRIX_USER"), password: get("SUPABASE_MATRIX_PASSWORD"), ssl: { rejectUnauthorized: false } };
}

const applyAt = process.argv.indexOf("--apply");
const applyFile = applyAt > 0 ? process.argv[applyAt + 1] : null;
const client = new pg.Client(liveUrl());
await client.connect();
const failures = [];
try {
  await client.query("begin");
  await client.query("set local statement_timeout = '120s'");
  if (applyFile) await client.query(readFileSync(resolve(process.cwd(), applyFile), "utf8"));
  await client.query("select set_config('request.jwt.claims', $1, true), set_config('app.actor_system', 'store-guard/a-retype-preview-never-holds-a-big-table', true)", [ADMIN_CLAIMS]);
  const one = async (sql, args) => (await client.query(sql, args)).rows[0];
  const home = (await one(
    `select r.data ->> 'parent_id' as id from custom.record r
      where r.organization_id = $1 and r.table_id = custom.table_kernel_id() and r.deleted_at is null and r.data ? 'parent_id'
      group by 1 order by count(*) desc limit 1`, [ORG])).id;

  async function build(rows) {
    const table = (await one("select custom.table_declare($1, $2::jsonb) as id", [ORG, JSON.stringify({
      name: `Guard preview ${rows}`, slug: `guard_preview_${rows}_${Date.now()}`, type: "entity", label_singular: "Supply", label_plural: "Supplies",
      title_field: "title", display: "list", weight: "light", ordered: true, row_order: "sorted", default_sort: [{ field: "title", direction: "asc" }],
      parent_id: home, agent_writable: true, retention_days: 3650, fields: [{ name: "title" }] })])).id;
    await one("select custom.field_declare($1, $2, $3::jsonb) as id", [ORG, table, JSON.stringify({ key: "title", label: "Title", type: "text", sort: 10 })]);
    const field = (await one("select custom.field_declare($1, $2, $3::jsonb) as id", [ORG, table, JSON.stringify({ key: "status", label: "Status", type: "text", sort: 20 })])).id;
    const data = Array.from({ length: rows }, (_, i) => ({ title: `Item ${i + 1}`, status: WORDS[i % WORDS.length] }));
    await one("select cardinality(custom.record_write_many($1, $2, array(select jsonb_array_elements($3::jsonb)))) as n", [ORG, table, JSON.stringify(data)]);
    return { table, field };
  }

  for (const [rows, kind] of [[6, "small"], [1500, "medium"], [10000, "big"]]) {
    await client.query("savepoint t");
    try {
      const { table, field } = await build(rows);
      const t0 = Date.now();
      const p = (await one("select custom.field_retype_preview($1, $2, $3::jsonb) as p", [ORG, field, PATCH])).p;
      const ms = Date.now() - t0;
      const unchanged = (await one(
        `select count(*)::int as n from custom.record x where x.organization_id = $1 and x.table_id = $2 and x.deleted_at is null
            and x.data ->> 'status' = any($3)`, [ORG, table, WORDS])).n;
      const said = [];
      if (unchanged !== rows) said.push(`the preview left ${unchanged}/${rows} words in place`);
      if (kind === "small") {
        if (p.limited) said.push("a 6-value column answered limited, not exactly");
        if (p.converts + p.kept_aside !== rows) said.push(`exact count wrong: ${p.converts} + ${p.kept_aside} != ${rows}`);
      }
      if (kind === "big") {
        if (!p.limited) said.push("a 10,000-value column was run, not limited");
        if (p.held_before !== rows) said.push(`held_before ${p.held_before} != ${rows}`);
        if (ms > 3000) said.push(`took ${ms} ms (cap 3000)`);
      }
      if (kind === "medium" && ms > 6000) said.push(`took ${ms} ms (cap 6000)`);
      if (said.length) failures.push(`${kind} (${rows}): ${said.join("; ")}`);
      else console.log(`  ok  ${kind} (${rows} values): ${p.limited ? "limited (" + p.why + ")" : `exact ${p.converts}/${p.kept_aside}`} in ${ms} ms`);
    } catch (e) {
      failures.push(`${kind} (${rows}): ${e.message}`);
    }
    await client.query("rollback to savepoint t");
  }
} finally {
  await client.query("rollback").catch(() => {});
  await client.end();
}
for (const f of failures) console.log(`  RED ${f}`);
console.log(`${failures.length ? "RED" : "GREEN"} (rolled back)`);
process.exit(failures.length ? 1 : 0);
