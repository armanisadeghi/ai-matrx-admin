#!/usr/bin/env node
// check:data-home-search-in-budget — the /data search answers inside the page's budget, for the worst
// case: admin@admin.com, a member of ~40 organizations, ~950 Tables. READ-ONLY: calls
// custom.data_home(null, <term>) as the `authenticated` role with the same 8 s statement_timeout the
// page's request has (a timeout there is the page's "Search inside fields did not answer").
// Defect L38 (2026-10-19): the search step joined EVERY Table-definition record in every organization
// to read 944 descriptions (3 s) — red at the budget below, green after custom.data_home reads each
// description by its primary key. Exit 1 when a searched call is slower than BUDGET_MS or fails, or
// when a searched call costs more than SEARCH_OVERHEAD_MS over the unsearched call.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pg = require("pg");

const BUDGET_MS = Number(process.env.DATA_HOME_SEARCH_BUDGET_MS ?? 4000);
const SEARCH_OVERHEAD_MS = Number(process.env.DATA_HOME_SEARCH_OVERHEAD_MS ?? 2000);
const TERMS = ["uifix-live Dock", "dock", "customer"];

function env() {
  const out = {};
  for (const f of ["./.env.local", "./.env", "../aidream/.env"]) {
    let text = "";
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    for (const line of text.split("\n")) {
      const m = line.match(/^(SUPABASE_MATRIX_[A-Z_]+)=(.*)$/);
      if (m && !(m[1] in out)) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return out;
}
const e = env();
const client = new pg.Client({
  host: e.SUPABASE_MATRIX_HOST, port: 5432 /* session pooler */,
  database: e.SUPABASE_MATRIX_DATABASE_NAME ?? e.SUPABASE_MATRIX_DB_NAME ?? e.SUPABASE_MATRIX_DATABASE,
  user: e.SUPABASE_MATRIX_USER, password: e.SUPABASE_MATRIX_PASSWORD, ssl: { rejectUnauthorized: false },
});
await client.connect();
let failed = false;
try {
  await client.query("begin read only");
  const uid = (await client.query("select id from auth.users where email = 'admin@admin.com'")).rows[0]?.id;
  if (!uid) throw new Error("admin@admin.com not found");
  await client.query("set local role authenticated");
  await client.query("set local statement_timeout = '8s'");
  await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
  const once = async (term) => {
    const t = Date.now();
    try { await client.query("select custom.data_home(null, $1, false)", [term]); } catch (err) {
      await client.query("rollback"); await client.query("begin read only");
      await client.query("set local role authenticated"); await client.query("set local statement_timeout = '8s'");
      await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
      return 99999; // a timeout counts as 99.999 s
    }
    return Date.now() - t;
  };
  // median of three: the shared database is noisy, a single sample is not evidence
  const time = async (term) => (await Promise.all([0, 1, 2].map(() => null)).then(async () => { const xs = []; for (let i = 0; i < 3; i++) xs.push(await once(term)); return xs.sort((a, b) => a - b); }))[1];
  await once(null); // warm the caches; the page's first call is warm too
  const base = await time(null);
  for (const term of TERMS) {
    let ms;
    try { ms = await time(term); } catch (err) { console.log(`FAIL  "${term}": ${err.message}`); failed = true; await client.query("rollback"); await client.query("begin read only"); continue; }
    const bad = ms > BUDGET_MS || ms - base > SEARCH_OVERHEAD_MS;
    console.log(`${bad ? "FAIL" : "ok  "}  "${term}": ${ms} ms (unsearched ${base} ms; budget ${BUDGET_MS}, overhead cap ${SEARCH_OVERHEAD_MS})`);
    if (bad) failed = true;
  }
} finally {
  await client.query("rollback").catch(() => {});
  await client.end();
}
process.exit(failed ? 1 : 0);
