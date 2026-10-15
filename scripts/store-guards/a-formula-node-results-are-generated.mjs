#!/usr/bin/env node
// A FORMULA SCREEN NEVER LACKS A FUNCTION THE STORE HAS (lane AT-FORMULA).
//
// `FORMULA_NODE_RESULTS` (what each fx.* node answers: number, text, boolean, date, unknown) is GENERATED into
// aidream/apps/shared/records/src/store.generated.ts by `pnpm records:generate` from the live
// `custom.formula_node_kinds()`, and re-exported by records-ui. This guard diffs that generated map against the
// live function (production, a read-only select) and goes RED on the first node added, removed or retyped
// without a regenerate.
//
//   node scripts/store-guards/a-formula-node-results-are-generated.mjs
//   node scripts/store-guards/a-formula-node-results-are-generated.mjs --node-table <file.ts>   (the plant: another copy)
//
// RED first: before FORMULA_NODE_RESULTS was generated, the hand-kept copy in records-ui/workedOutDate.ts was 99
// nodes behind and this diff listed them all.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../..");
const require = createRequire(import.meta.url);
const pg = require("pg");

const at = process.argv.indexOf("--node-table");
const file = at > 0 ? resolve(process.argv[at + 1]) : resolve(ROOT, "../aidream/apps/shared/records/src/store.generated.ts");
const ts = readFileSync(file, "utf8");
const block = /FORMULA_NODE_RESULTS[^=]*= \{([\s\S]*?)\};/.exec(ts)?.[1] ?? "";
const mirror = Object.fromEntries([...block.matchAll(/"([^"]+)":\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));

const env = {};
for (const line of readFileSync(resolve(ROOT, "../aidream/.env"), "utf8").split("\n")) {
  const m = /^(SUPABASE_MATRIX_[A-Z_]+)=(.*)$/.exec(line);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const client = new pg.Client({
  host: env.SUPABASE_MATRIX_HOST, port: Number(env.SUPABASE_MATRIX_PORT), user: env.SUPABASE_MATRIX_USER,
  password: env.SUPABASE_MATRIX_PASSWORD, database: env.SUPABASE_MATRIX_DATABASE_NAME, ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
await client.connect();
let live;
try {
  live = Object.fromEntries((await client.query("select node, result from custom.formula_node_kinds()")).rows.map((r) => [r.node, r.result]));
} finally {
  await client.end();
}
const failures = [];
for (const node of new Set([...Object.keys(mirror), ...Object.keys(live)])) {
  if (mirror[node] !== live[node]) failures.push(`FORMULA_NODE_RESULTS["${node}"] is ${mirror[node] ?? "missing"}, the store says ${live[node] ?? "missing"}`);
}
if (Object.keys(mirror).length === 0) failures.push("FORMULA_NODE_RESULTS was not found in the generated file");
if (failures.length) {
  console.error(`RED — a-formula-node-results-are-generated: ${failures.length} wrong (run pnpm records:generate in aidream/apps/shared/records)\n  - ${failures.slice(0, 20).join("\n  - ")}`);
  process.exit(1);
}
console.log(`GREEN — a-formula-node-results-are-generated: all ${Object.keys(live).length} nodes answer as the store does.`);
