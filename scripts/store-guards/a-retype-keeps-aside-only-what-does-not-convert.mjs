#!/usr/bin/env node
// scripts/store-guards/a-retype-keeps-aside-only-what-does-not-convert.mjs — lane F2 (tables close-out, D11)
//
// GUARD: changing what a column holds converts every value that converts and keeps aside ONLY the ones
// that do not — and the panel's count before the change (custom.field_retype_preview) is exactly what the
// change then does. MEASURED 2026-10-17 on W1 Supplies (Cedar Ridge Physical Therapy): a text Status
// (Ordered / Shipped / Received) changed to Choice got an empty choice list, every value went to
// `_retired` ("0 converted, 6 kept"), and the panel had promised "6 values convert to choice".
//
// For every target the panel offers (Choice, Multi-choice, Number, Date, Yes/no, Email, Phone, Link,
// Money, Percentage, Text) a fresh text column of real clinic-supply words is changed through
// custom.field_update, as the panel does, and judged:
//   1. the preview's converts / kept-aside equal what the change did;
//   2. converted + kept aside = the values held before (nothing lost, nothing counted twice);
//   3. no record both holds the value and keeps it aside;
//   4. no sentence a person reads (a kept-aside reason, the migration note) carries an internal code;
//   5. a Choice or Multi-choice change keeps nothing aside — its words become its choices.
//
// The whole run is ONE transaction that is ROLLED BACK; each target runs in a SAVEPOINT rolled back too.
// Runs against the main database as admin@admin.com in its own Cedar Ridge Physical Therapy workspace.
//
//   node scripts/store-guards/a-retype-keeps-aside-only-what-does-not-convert.mjs
//   node scripts/store-guards/a-retype-keeps-aside-only-what-does-not-convert.mjs --apply <file.sql>
//
// `--apply` executes a SQL file inside the rolled-back transaction first (a migration not yet applied),
// so the guard can be seen RED on the live bodies and GREEN on the new ones without changing anything.

import { formatDurationMs } from "@ai-matrx/kit/format";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ORG = "bb6fec2f-e635-40b0-8e78-5b610e8bc65e"; // Cedar Ridge Physical Therapy (admin@admin.com, owner)
const ADMIN_CLAIMS = '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated","email":"admin@admin.com"}';
const CODE = /\([A-Z]{2,}-\d+|\bT\d+\)|\(VAL-|\(FLD-/;

/** Values a supply ledger really holds, per target: what converts and what cannot. */
const TARGETS = [
  { name: "Choice", patch: { parity_type: "select" }, values: ["Ordered", "Shipped", "Received", "Shipped", "Ordered", "shipped"], keepsNothing: true },
  { name: "Multi-choice", patch: { parity_type: "multi_select" }, values: ["Gloves, Masks", "Masks", "Gauze; Tape", "Gloves"], keepsNothing: true },
  { name: "Number", patch: { type: "number" }, values: ["40", "12.5", "a box", "7"] },
  { name: "Date", patch: { parity_type: "datetime" }, values: ["2026-10-01", "2026-09-15", "next week"] },
  { name: "Yes / no", patch: { type: "checkbox" }, values: ["yes", "no", "maybe"] },
  { name: "Email address", patch: { parity_type: "email" }, values: ["orders@medline.com", "call them"] },
  { name: "Phone number", patch: { parity_type: "phone" }, values: ["(800) 633-5463", "ask front desk"] },
  { name: "Link", patch: { parity_type: "url" }, values: ["https://www.medline.com", "not a site at all"] },
  { name: "Money", patch: { parity_type: "currency" }, values: ["12.50", "free"] },
  { name: "Percentage", patch: { parity_type: "percent" }, values: ["15", "most"] },
];

function liveUrl() {
  const env = readFileSync(resolve(ROOT, "../aidream/.env"), "utf8");
  const get = (k) => [...env.matchAll(new RegExp(`^${k}=(.*)$`, "gm"))].pop()?.[1]?.trim().replace(/^["']|["']$/g, "");
  return {
    host: get("SUPABASE_MATRIX_HOST"),
    port: 5432 /* session pooler */,
    database: get("SUPABASE_MATRIX_DATABASE_NAME"),
    user: get("SUPABASE_MATRIX_USER"),
    password: get("SUPABASE_MATRIX_PASSWORD"),
    ssl: { rejectUnauthorized: false },
  };
}

const applyAt = process.argv.indexOf("--apply");
const applyFile = applyAt > 0 ? process.argv[applyAt + 1] : null;
const client = new pg.Client(liveUrl());
await client.connect();
const failures = [];
const started = Date.now();
try {
  await client.query("begin read write");
  await client.query("set local statement_timeout = '60s'");
  if (applyFile) await client.query(readFileSync(resolve(process.cwd(), applyFile), "utf8"));
  await client.query("select set_config('request.jwt.claims', $1, true), set_config('app.actor_system', 'store-guard/a-retype-keeps-aside-only-what-does-not-convert', true)", [ADMIN_CLAIMS]);
  const one = async (sql, args) => (await client.query(sql, args)).rows[0];
  const home = (await one(
    `select r.data ->> 'parent_id' as id from custom.record r
      where r.organization_id = $1 and r.table_id = custom.table_kernel_id() and r.deleted_at is null
        and r.data ? 'parent_id'
      group by 1 order by count(*) desc limit 1`, [ORG])).id;

  for (const target of TARGETS) {
    await client.query("savepoint t");
    try {
      const table = (await one("select custom.table_declare($1, $2::jsonb) as id", [ORG, JSON.stringify({
        name: `Guard supplies ${target.name}`, slug: `guard_supplies_${Date.now()}`, type: "entity", label_singular: "Supply",
        label_plural: "Supplies", title_field: "title", display: "list", weight: "light", ordered: true, row_order: "sorted",
        default_sort: [{ field: "title", direction: "asc" }], parent_id: home, agent_writable: true, retention_days: 3650,
        fields: [{ name: "title" }] })])).id;
      await one("select custom.field_declare($1, $2, $3::jsonb) as id", [ORG, table, JSON.stringify({ key: "title", label: "Title", type: "text", sort: 10 })]);
      const field = (await one("select custom.field_declare($1, $2, $3::jsonb) as id", [ORG, table, JSON.stringify({ key: "status", label: "Status", type: "text", sort: 20 })])).id;
      for (const [i, value] of target.values.entries()) {
        await one("select custom.record_write($1, $2, $3::jsonb) as id", [ORG, table, JSON.stringify({ title: `Item ${i + 1}`, status: value })]);
      }
      // The preview door, when the store has it; without it the change is still judged (rules 2-5).
      let preview = null;
      await client.query("savepoint p");
      try {
        preview = (await one("select custom.field_retype_preview($1, $2, $3::jsonb) as p", [ORG, field, JSON.stringify(target.patch)])).p;
        await client.query("release savepoint p");
      } catch (e) {
        await client.query("rollback to savepoint p");
        preview = { missing: e.message };
      }
      await one("select custom.field_update($1, $2, $3::jsonb) as id", [ORG, field, JSON.stringify(target.patch)]);
      const after = await one(
        `with rec as (select x.id, x.data from custom.record x
                       where x.organization_id = $1 and x.table_id = $2 and x.deleted_at is null),
              kept as (select r.id, e.value as e from rec r
                         cross join lateral jsonb_array_elements(coalesce(r.data -> '_retired', '[]'::jsonb)) e
                        where e.value ->> 'key' = 'status' and not (e.value ? 'was_an_alternate_ranked'))
         select (select count(*)::int from rec where data ? 'status' and jsonb_typeof(data -> 'status') <> 'null') as converts,
                (select count(*)::int from kept) as kept,
                (select count(*)::int from kept k join rec r on r.id = k.id where r.data ? 'status') as both,
                (select coalesce(jsonb_agg(k.e ->> 'reason'), '[]'::jsonb) from kept k) as reasons,
                (select m.note from history.migration_log m where m.organization_id = $1 and m.target_id = $3
                  order by m.applied_at desc limit 1) as note`, [ORG, table, field]);
      const said = [];
      if (preview.missing) said.push(`no preview from the store (${preview.missing})`);
      else if (preview.converts !== after.converts || preview.kept_aside !== after.kept) {
        said.push(`preview said ${preview.converts} convert / ${preview.kept_aside} kept aside, the change did ${after.converts} / ${after.kept}`);
      }
      if (after.converts + after.kept !== target.values.length) said.push(`${after.converts} + ${after.kept} is not the ${target.values.length} values held`);
      if (after.both > 0) said.push(`${after.both} record(s) hold the value AND keep it aside`);
      if (target.keepsNothing && after.kept > 0) said.push(`${after.kept} value(s) kept aside — its words were not made its choices`);
      for (const text of [...after.reasons, after.note ?? ""]) if (CODE.test(text)) said.push(`a person reads an internal code: "${text.slice(0, 140)}"`);
      if (said.length) failures.push(`${target.name}: ${said.join("; ")}`);
      else console.log(`  ok  ${target.name}: ${after.converts} converted, ${after.kept} kept aside (preview agreed)`);
    } catch (e) {
      failures.push(`${target.name}: ${e.message}`);
      await client.query("rollback to savepoint t");
      continue;
    }
    await client.query("rollback to savepoint t");
  }
} finally {
  await client.query("rollback").catch(() => {});
  await client.end();
}
for (const f of failures) console.log(`  RED ${f}`);
console.log(`${failures.length ? "RED" : "GREEN"}: ${TARGETS.length - failures.length}/${TARGETS.length} targets (${formatDurationMs(Date.now() - started, { style: "compact" })}, rolled back)`);
process.exit(failures.length ? 1 : 0);
