#!/usr/bin/env node
// scripts/store-guards/a-new-choice-wears-its-own-color.mjs — lane FX2 (tables close-out, 2026-10-17)
//
// GUARD: every choice the store makes wears its own palette color, and a color a person chose is never
// repainted. MEASURED on W3 Supplies (Cedar Ridge Physical Therapy): after an import and after a text ->
// Choice retype every choice drew gray (rgb 234,234,236) in the cells, the filter list and the editor.
// Judged: an import's choice column (field_declare with words), a text -> Choice retype (field_update),
// and a cell's "Add" (options_add) after a person painted one choice red.
// ONE transaction, ROLLED BACK. admin@admin.com in Cedar Ridge Physical Therapy.
//
//   node scripts/store-guards/a-new-choice-wears-its-own-color.mjs [--apply <file.sql>]

import { formatDurationMs } from "@ai-matrx/kit/format";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ORG = "bb6fec2f-e635-40b0-8e78-5b610e8bc65e"; // Cedar Ridge Physical Therapy (admin@admin.com, owner)
const ADMIN_CLAIMS = '{"sub":"87a6e699-3622-4869-8843-d0867456c0dd","role":"authenticated","email":"admin@admin.com"}';

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


const PALETTE = ["blue", "green", "amber", "red", "violet", "teal", "slate"];
const applyAt = process.argv.indexOf("--apply");
const applyFile = applyAt > 0 ? process.argv[applyAt + 1] : null;
const client = new pg.Client(liveUrl());
await client.connect();
const failures = [];
const passes = [];
const started = Date.now();
/** Judge one Field's looks: every live choice has a palette color, the colors are distinct (up to 7). */
function judge(name, looks, words, keep = {}) {
  const said = [];
  const colorOf = new Map((looks ?? []).map((c) => [String(c.value).toLowerCase(), c.color]));
  const worn = [];
  for (const w of words) {
    const c = colorOf.get(w.toLowerCase());
    if (!c) said.push(`"${w}" has no color (draws gray)`);
    else if (!PALETTE.includes(c) && !(w in keep)) said.push(`"${w}" wears "${c}", not a palette color`);
    else worn.push(c);
  }
  if (worn.length && new Set(worn).size < Math.min(worn.length, PALETTE.length)) said.push(`colors repeat: ${worn.join(", ")}`);
  for (const [w, c] of Object.entries(keep)) if (colorOf.get(w.toLowerCase()) !== c) said.push(`"${w}" was ${c} and became ${colorOf.get(w.toLowerCase()) ?? "nothing"}`);
  if (said.length) failures.push(`${name}: ${said.join("; ")}`);
  else passes.push(`${name}: ${words.map((w) => `${w}=${colorOf.get(w.toLowerCase())}`).join(" ")}`);
}
try {
  await client.query("begin read write");
  await client.query("set local statement_timeout = '60s'");
  if (applyFile) await client.query(readFileSync(resolve(process.cwd(), applyFile), "utf8"));
  await client.query("select set_config('request.jwt.claims', $1, true), set_config('app.actor_system', 'store-guard/a-new-choice-wears-its-own-color', true)", [ADMIN_CLAIMS]);
  const one = async (sql, args) => (await client.query(sql, args)).rows[0];
  const home = (await one(
    `select r.data ->> 'parent_id' as id from custom.record r
      where r.organization_id = $1 and r.table_id = custom.table_kernel_id() and r.deleted_at is null
        and r.data ? 'parent_id'
      group by 1 order by count(*) desc limit 1`, [ORG])).id;
  const table = (await one("select custom.table_declare($1, $2::jsonb) as id", [ORG, JSON.stringify({
    name: "Guard choice colors", slug: `guard_choice_colors_${Date.now()}`, type: "entity", label_singular: "Supply",
    label_plural: "Supplies", title_field: "title", display: "list", weight: "light", ordered: true, row_order: "sorted",
    default_sort: [{ field: "title", direction: "asc" }], parent_id: home, agent_writable: true, retention_days: 3650,
    fields: [{ name: "title" }] })])).id;
  await one("select custom.field_declare($1, $2, $3::jsonb) as id", [ORG, table, JSON.stringify({ key: "title", label: "Title", type: "text", sort: 10 })]);
  const looksOf = async (field) => (await one("select data -> 'display_format' -> 'options' -> 'choices' as c from custom.record where organization_id = $1 and id = $2", [ORG, field])).c;

  // 1. AN IMPORT'S CHOICE COLUMN: field_declare with its words, as the import wizard sends.
  const imported = (await one("select custom.field_declare($1, $2, $3::jsonb) as id", [ORG, table, JSON.stringify({ key: "region", label: "Region", parity_type: "select", options: ["North", "South", "East", "West"], sort: 20 })])).id;
  judge("import (field_declare with words)", await looksOf(imported), ["North", "South", "East", "West"]);

  // 2. A TEXT COLUMN CHANGED TO CHOICE: its words become choices (F2), and each wears a color.
  const status = (await one("select custom.field_declare($1, $2, $3::jsonb) as id", [ORG, table, JSON.stringify({ key: "status", label: "Status", type: "text", sort: 30 })])).id;
  for (const [i, value] of ["Ordered", "Shipped", "Received", "Backordered", "Shipped"].entries()) {
    await one("select custom.record_write($1, $2, $3::jsonb) as id", [ORG, table, JSON.stringify({ title: `Item ${i + 1}`, status: value })]);
  }
  await one("select custom.field_update($1, $2, $3::jsonb) as id", [ORG, status, JSON.stringify({ parity_type: "select" })]);
  judge("text -> Choice retype", await looksOf(status), ["Ordered", "Shipped", "Received", "Backordered"]);

  // 3. A COLORED CHOICE IS NEVER REPAINTED: a person paints Ordered red, then a cell adds a choice.
  const looks = ((await looksOf(status)) ?? [{ value: "Ordered" }]).map((c) => (c.value === "Ordered" ? { ...c, color: "red" } : c));
  await one("select custom.field_update($1, $2, $3::jsonb) as id", [ORG, status, JSON.stringify({ display_format: { id: "choice", options: { choices: looks } } })]);
  await one("select custom.field_update($1, $2, $3::jsonb) as id", [ORG, status, JSON.stringify({ options_add: ["Canceled"] })]);
  const after = await looksOf(status);
  judge("options_add keeps painted choices", after, ["Shipped", "Received", "Backordered", "Canceled"], { Ordered: "red" });
  const before = Object.fromEntries(looks.map((c) => [c.value, c.color]));
  for (const c of after) if (before[c.value] && before[c.value] !== c.color) failures.push(`repainted: ${c.value} ${before[c.value]} -> ${c.color}`);
} finally {
  await client.query("rollback").catch(() => {});
  await client.end();
}
for (const p of passes) console.log(`  ok  ${p}`);
for (const f of failures) console.log(`  RED ${f}`);
console.log(`${failures.length ? "RED" : "GREEN"}: ${passes.length}/${passes.length + failures.length} checks (${formatDurationMs(Date.now() - started, { style: "compact" })}, rolled back)`);
process.exit(failures.length ? 1 : 0);
