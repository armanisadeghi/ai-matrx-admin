// CLOSE-CORE CD-CORE-11 (acceptance test 12: a Text column holding "abc" and "12" becomes a Number; "12" stays,
// "abc" is kept aside with the reason, both records intact) and CD-CORE-10 (Text -> Choice keeps every word as a
// choice), live store as admin@admin.com, through the same doors the column editor uses. Disposable, archived.
// Run: node scripts/airtable-walk/close-core-retype.mjs
import { declareTable } from "@ai-matrx/records/core";
import { admin, must, say } from "./at-fix-j-lib.mjs";
const c = (await admin()).client;
const s = Math.random().toString(36).slice(2, 6);
const t = must(await declareTable(c, { name: `CC retype ${s}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "size", label: "Size", type: "text", sort: 20 },
  { key: "tier", label: "Tier", type: "text", sort: 30 },
] }), "table");
const raw = async (id) => { const r = await c.recordAsOf({ record_id: id, recorded_at: new Date().toISOString() }); return r.ok ? r.data : { error: r.error.message }; };
try {
  const r1 = must(await c.recordWrite({ table_id: t, data: { name: "Row one", size: "abc", tier: "Gold" } }), "r1");
  const r2 = must(await c.recordWrite({ table_id: t, data: { name: "Row two", size: "12", tier: "Silver" } }), "r2");
  const fields = must(await c.fields({ table_id: t }), "fields");
  const size = fields.find((f) => f.key === "size"), tier = fields.find((f) => f.key === "tier");
  // What the column editor shows before the change.
  const pre = await c.fieldRetypePreview({ field_id: size.id, patch: { type: "number" } });
  say("preview Text -> Number:", pre.ok ? pre.data : pre.error.message);
  const moved = await c.migrateRetype({ field_id: size.id, to: "range" });
  say("retype Text -> Number:", moved.ok ? moved.data : moved.error.message);
  const d1 = await raw(r1), d2 = await raw(r2);
  say("row one:", { size: d1.size ?? null, retired: d1._retired });
  say("row two:", { size: d2.size, type: typeof d2.size });
  const rows = must(await c.listByIds({ table_id: t, ids: [r1, r2] }), "rows");
  say("both records still there:", rows.map((r) => r.document.name));
  // CD-CORE-10: Text -> Choice.
  const pre2 = await c.fieldRetypePreview({ field_id: tier.id, patch: { type: "select" } });
  say("preview Text -> Choice:", pre2.ok ? pre2.data : pre2.error.message);
  const ch = await c.fieldUpdate({ field_id: tier.id, patch: { type: "select" } });
  say("Text -> Choice:", ch.ok ? "ok" : ch.error.message);
  const after = must(await c.listByIds({ table_id: t, ids: [r1, r2] }), "after");
  const tierField = must(await c.fields({ table_id: t }), "fields2").find((f) => f.key === "tier");
  say("tier values now:", after.map((r) => r.document.tier), "choices:", (tierField.options ?? tierField.config?.options ?? tierField.choices ?? []).map?.((o) => o.label ?? o) ?? tierField);
} finally {
  for (let i = 0; i < 6; i++) { const r = await c.tableArchive({ table_id: t, chunk: 5, includeTable: true }); if (r.ok && r.data?.done !== false) { say("archived", t); break; } await new Promise((res) => setTimeout(res, 4000)); }
}
