// CLOSE-CORE CD-CORE-19 re-check: a table says which organization it lives in, moves to another of the
// person's organizations with its rows, and comes back. Live store, admin@admin.com; disposable table archived.
// Run: node scripts/airtable-walk/close-core-org.mjs
import { declareTable } from "@ai-matrx/records/core";
import { admin, say } from "./at-fix-j-lib.mjs";
const HOME = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f"; // admin's Workspace
const AWAY = "2643e470-b275-47f3-95f3-ae275ad3ca47"; // Oak Street Studio (admin is owner)
const c = (await admin()).client;
const tries = async (fn) => { let r; for (let i = 0; i < 5; i++) { r = await fn(); if (r.ok || !["timed_out", "unreachable"].includes(r.error?.code)) return r; await new Promise((res) => setTimeout(res, 4000)); } return r; };
let fails = 0;
const check = (ok, what, detail) => { if (!ok) fails++; say(ok ? "PASS" : "FAIL", what, detail ?? ""); };
const t = await tries(() => declareTable(c, { name: `CC org ${Math.random().toString(36).slice(2, 6)}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }));
if (!t.ok) throw new Error(t.error.message);
const id = t.data;
try {
  const row = await tries(() => c.recordWrite({ table_id: id, data: { name: "Kept row" } }));
  const h1 = await tries(() => c.tableHome({ table_id: id }));
  check(h1.ok && h1.data?.organization?.name === "admin's Workspace", "the table says where it lives", h1.ok ? h1.data?.organization : h1.error.message);
  const m1 = await tries(() => c.tableMove({ table_id: id, to_organization_id: AWAY }));
  check(m1.ok, "moved to Oak Street Studio", m1.ok ? m1.data : m1.error.message);
  const h2 = await tries(() => c.tableHome({ table_id: id }));
  check(h2.ok && h2.data?.organization?.name === "Oak Street Studio", "it now says Oak Street Studio", h2.ok ? h2.data?.organization : h2.error.message);
  const m2 = await tries(() => c.tableMove({ table_id: id, to_organization_id: HOME }));
  check(m2.ok, "moved back", m2.ok ? m2.data : m2.error.message);
  const h3 = await tries(() => c.tableHome({ table_id: id }));
  check(h3.ok && h3.data?.organization?.name === "admin's Workspace", "home again", h3.ok ? h3.data?.organization?.name : h3.error.message);
  const rows = await tries(() => c.listByIds({ table_id: id, ids: [row.data] }));
  check(rows.ok && rows.data[0]?.document?.name === "Kept row", "its row came along both ways", rows.ok ? rows.data.map((r) => r.document) : rows.error.message);
} finally {
  for (let i = 0; i < 6; i++) { const r = await c.tableArchive({ table_id: id, chunk: 5, includeTable: true }); if (r.ok && r.data?.done !== false) { say("archived", id); break; } await new Promise((res) => setTimeout(res, 4000)); }
  say(fails ? `${fails} FAILED` : "ALL PASS");
}
