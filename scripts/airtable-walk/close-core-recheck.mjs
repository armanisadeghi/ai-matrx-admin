// CLOSE-CORE re-check of rows already verified live, on the live store as admin@admin.com:
//   CD-CORE-02 a new table names each record by its title field; a link to it reads as that title.
//   CD-CORE-06 the parity-floor field types each save and read back in their own shape.
//   CD-CORE-07 a Time column keeps 14:30 / 09:15 / 11:45, sorts 09:15 first, refuses 25:00 by name.
//   CD-CORE-10 Text -> Choice keeps every word as a choice.
//   CD-CORE-12 required, default and unique are enforced by name.
// Disposable tables, archived at the end. Run: node scripts/airtable-walk/close-core-recheck.mjs
import { declareTable } from "@ai-matrx/records/core";
import { admin, say } from "./at-fix-j-lib.mjs";
const c = (await admin()).client;
const tries = async (fn) => { let r; for (let i = 0; i < 5; i++) { r = await fn(); if (r.ok || !["timed_out", "unreachable"].includes(r.error?.code)) return r; await new Promise((res) => setTimeout(res, 4000)); } return r; };
const word = (r) => (r.ok ? "ok" : `refused: ${r.error.message}`);
const s = Math.random().toString(36).slice(2, 6);
const made = [];
try {
  const people = await tries(() => declareTable(c, { name: `CC people ${s}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }));
  if (!people.ok) throw new Error(people.error.message);
  made.push(people.data);
  const kinds = await tries(() => declareTable(c, { name: `CC kinds ${s}`, fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "tier", label: "Tier", type: "select", options: ["Gold", "Silver"], sort: 20 },
    { key: "tags", label: "Tags", type: "multi_select", options: ["Alpha", "Beta"], sort: 30 },
    { key: "site", label: "Site", type: "url", sort: 40 },
    { key: "mail", label: "Mail", type: "email", sort: 50 },
    { key: "tel", label: "Phone", type: "phone", sort: 60 },
    { key: "price", label: "Price", type: "currency", unit: "$", sort: 70 },
    { key: "share", label: "Share", type: "percent", sort: 80 },
    { key: "when", label: "When", type: "datetime", kind: "datetime", sort: 90 },
    { key: "day", label: "Day", type: "datetime", kind: "date", sort: 100 },
    { key: "at", label: "At", type: "time", sort: 110 },
    { key: "who", label: "Contact", type: "relation", relationTarget: people.data, sort: 120 },
    { key: "words", label: "Words", type: "text", sort: 130 },
    { key: "code", label: "Code", type: "text", required: true, unique: true, declaration: { default: "NEW" }, sort: 140 },
  ] }));
  if (!kinds.ok) throw new Error(kinds.error.message);
  made.push(kinds.data);
  const tables = await tries(() => c.tableRead ? c.tableRead({ table_id: people.data }) : Promise.resolve({ ok: false, error: { message: "no tableRead" } }));
  say("CD-CORE-02 people title field:", tables.ok ? tables.data.title_field ?? tables.data : tables.error.message);
  const dana = await tries(() => c.recordWrite({ table_id: people.data, data: { name: "Dana Whitcomb" } }));
  const values = { name: "Row A", tier: "gold", tags: ["alpha", "beta"], site: "https://example.org", mail: "dana@example.org", tel: "+1 949 555 0142", price: 12.5, share: 0.25, when: "2026-11-03T17:30:00Z", day: "2026-11-02", at: "14:30", who: dana.data, words: "Kiwi", code: "A-1" };
  const a = await tries(() => c.recordWrite({ table_id: kinds.data, data: values }));
  say("CD-CORE-06 write every type:", word(a));
  const back = a.ok ? await tries(() => c.listByIds({ table_id: kinds.data, ids: [a.data] })) : null;
  if (back?.ok) { const d = back.data[0].document; say("  read back:", Object.fromEntries(Object.keys(values).map((k) => [k, d[k]]))); }
  const fields = (await tries(() => c.fields({ table_id: kinds.data }))).data ?? [];
  const who = fields.find((f) => f.key === "who");
  const w = who && dana.ok ? await tries(() => c.relationWords({ field_id: who.id, value: dana.data })) : null;
  say("CD-CORE-02 the link reads as:", w ? (w.ok ? w.data : w.error.message) : "n/a");
  // CD-CORE-07
  for (const [n, t] of [["Row B", "09:15"], ["Row C", "11:45"]]) await tries(() => c.recordWrite({ table_id: kinds.data, data: { name: n, at: t, code: `T-${t}` } }));
  const bad = await tries(() => c.recordWrite({ table_id: kinds.data, data: { name: "Row bad", at: "25:00", code: "T-bad" } }));
  say("CD-CORE-07 25:00:", word(bad));
  const page = await tries(() => c.listPage({ table_id: kinds.data, limit: 10, sort: [{ field: "at", direction: "asc" }] }));
  say("  sorted by At:", page.ok ? (page.data.rows ?? page.data).map((r) => r.document.at) : page.error.message);
  // CD-CORE-12
  const blank = await tries(() => c.recordWrite({ table_id: kinds.data, data: { name: "Row D" } }));
  say("CD-CORE-12 a row with no Code (default fills):", word(blank));
  if (blank.ok) { const d = await tries(() => c.listByIds({ table_id: kinds.data, ids: [blank.data] })); say("  its Code:", d.ok ? d.data[0].document.code : d.error.message); }
  const dup = await tries(() => c.recordWrite({ table_id: kinds.data, data: { name: "Row E", code: "A-1" } }));
  say("  a duplicate Code:", word(dup));
  const empty = await tries(() => c.recordWrite({ table_id: kinds.data, data: { name: "Row F", code: "" } }));
  say("  an empty Code:", word(empty));
  // CD-CORE-10
  const wordsField = fields.find((f) => f.key === "words");
  await tries(() => c.recordWrite({ table_id: kinds.data, data: { name: "Row G", words: "Mango", code: "G-1" } }));
  const ch = await tries(() => c.fieldUpdate({ field_id: wordsField.id, patch: { type: "select" } }));
  say("CD-CORE-10 Text -> Choice:", word(ch));
  const after = await tries(() => c.fields({ table_id: kinds.data }));
  const wf = after.ok ? after.data.find((f) => f.key === "words") : null;
  say("  choices now:", wf ? JSON.stringify(wf.options ?? wf.config?.choices ?? wf.config?.options ?? wf).slice(0, 300) : "n/a");
  const rows = await tries(() => c.listPage({ table_id: kinds.data, limit: 20 }));
  say("  values:", rows.ok ? (rows.data.rows ?? rows.data).map((r) => r.document.words).filter(Boolean) : rows.error.message);
} finally {
  for (const t of made) for (let i = 0; i < 6; i++) { const r = await c.tableArchive({ table_id: t, chunk: 5, includeTable: true }); if (r.ok && r.data?.done !== false) { say("archived", t); break; } await new Promise((res) => setTimeout(res, 4000)); }
}
