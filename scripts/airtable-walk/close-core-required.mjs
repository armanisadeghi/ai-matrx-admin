// CLOSE-CORE CD-CORE-12: a required column refuses a missing value AND a blank one ("" or spaces), on a new row
// and on an edit, naming the column; a default fills a row that leaves the column out. Live store, admin.
// Run: node scripts/airtable-walk/close-core-required.mjs   (exit 0 = every expectation held)
import { declareTable } from "@ai-matrx/records/core";
import { admin, say } from "./at-fix-j-lib.mjs";
const c = (await admin()).client;
const tries = async (fn) => { let r; for (let i = 0; i < 5; i++) { r = await fn(); if (r.ok || !["timed_out", "unreachable"].includes(r.error?.code)) return r; await new Promise((res) => setTimeout(res, 4000)); } return r; };
const t = await tries(() => declareTable(c, { name: `CC required ${Math.random().toString(36).slice(2, 6)}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "code", label: "Code", type: "text", required: true, unique: true, sort: 20 },
  { key: "tier", label: "Tier", type: "text", sort: 30, declaration: { default: "Standard" } },
] }));
if (!t.ok) throw new Error(t.error.message);
let bad = 0;
const expect = (what, r, refused) => { const okay = refused ? !r.ok && /Code is required|different on every record/.test(r.error.message) : r.ok; if (!okay) bad += 1; say(okay ? "PASS" : "FAIL", what, r.ok ? "saved" : `refused: ${r.error.message}`); return r; };
try {
  expect("missing Code", await tries(() => c.recordWrite({ table_id: t.data, data: { name: "One" } })), true);
  expect('Code ""', await tries(() => c.recordWrite({ table_id: t.data, data: { name: "Two", code: "" } })), true);
  expect('Code "   "', await tries(() => c.recordWrite({ table_id: t.data, data: { name: "Three", code: "   " } })), true);
  const ok = expect("Code A-1", await tries(() => c.recordWrite({ table_id: t.data, data: { name: "Four", code: "A-1" } })), false);
  expect("duplicate Code A-1", await tries(() => c.recordWrite({ table_id: t.data, data: { name: "Five", code: "A-1" } })), true);
  if (ok.ok) {
    const row = await tries(() => c.listByIds({ table_id: t.data, ids: [ok.data] }));
    const tier = row.ok ? row.data[0].document.tier : null;
    if (tier !== "Standard") bad += 1;
    say(tier === "Standard" ? "PASS" : "FAIL", "default fills Tier:", tier);
    const v = await tries(() => c.recordRead({ record_id: ok.data, withVersion: true }));
    expect('edit Code to ""', await tries(() => c.recordUpdate({ record_id: ok.data, patch: { code: "" }, expectedVersion: v.data?.version })), true);
  }
} finally {
  for (let i = 0; i < 6; i++) { const r = await c.tableArchive({ table_id: t.data, chunk: 5, includeTable: true }); if (r.ok && r.data?.done !== false) { say("archived", t.data); break; } await new Promise((res) => setTimeout(res, 4000)); }
}
say(bad === 0 ? "ALL PASS" : `${bad} FAILED`);
process.exit(bad === 0 ? 0 : 1);
