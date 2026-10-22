// CLOSE-CORE CD-CORE-14 (acceptance test 4, "Category grows up"): a Pick list is a table; it gains two fields,
// its display turns from list to page, and every record that uses a choice still points at the same choice
// record. Nothing migrates. Live store, admin@admin.com, disposable tables archived at the end.
// Run: node scripts/airtable-walk/close-core-pick-grows.mjs
import { declareTable } from "@ai-matrx/records/core";
import { updateOnTheWinningVersion, readTableVersionNow } from "@ai-matrx/records/versions";
import { admin, say } from "./at-fix-j-lib.mjs";
const c = (await admin()).client;
const tries = async (fn) => { let r; for (let i = 0; i < 5; i++) { r = await fn(); if (r.ok || !["timed_out", "unreachable"].includes(r.error?.code)) return r; await new Promise((res) => setTimeout(res, 4000)); } return r; };
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + r.error.message); return r.data; };
const s = Math.random().toString(36).slice(2, 6);
const made = [];
let fails = 0;
const check = (ok, what, detail) => { if (!ok) fails++; say(ok ? "PASS" : "FAIL", what, detail ?? ""); };
try {
  const paint = must(await tries(() => declareTable(c, { name: `CC paint ${s}`, fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "color", label: "Color", type: "select", options: ["Red", "Blue"], sort: 20 },
  ] })), "paint");
  made.push(paint);
  const ids = [];
  for (const [name, color] of [["Barn", "red"], ["Door", "red"], ["Sky", "blue"]]) ids.push(must(await tries(() => c.recordWrite({ table_id: paint, data: { name, color } })), "row"));
  const color = must(await tries(() => c.fields({ table_id: paint })), "fields").find((f) => f.key === "color");
  const list = color.config?.options_table_id;
  check(!!list, "the Color pick list is its own table", list);
  const before = must(await tries(() => c.listPage({ table_id: list, limit: 20 })), "choices").rows;
  const red = before.find((r) => /red/i.test(JSON.stringify(r.document)));
  say("choices before:", before.map((r) => ({ id: r.id, doc: r.document })));
  const valuesBefore = must(await tries(() => c.listByIds({ table_id: paint, ids })), "rows").map((r) => r.document.color);
  const tableBefore = must(await tries(() => c.tableRead({ table_id: list })), "list table");
  say("pick list table before:", { display: tableBefore.display, title_field: tableBefore.title_field });
  // It grows: two fields.
  must(await tries(() => c.fieldDeclare({ table_id: list, spec: { key: "hex", label: "Hex", type: "text", sort: 50 } })), "hex");
  must(await tries(() => c.fieldDeclare({ table_id: list, spec: { key: "shade", label: "Shade", type: "text", sort: 60 } })), "shade");
  must(await tries(() => c.recordUpdate({ record_id: red.id, patch: { hex: "#C0392B", shade: "Brick" } })), "red hex");
  // It becomes a page.
  const v = await readTableVersionNow(c, list);
  const shown = await tries(() => updateOnTheWinningVersion(c, list, { display: "page" }, v, "always"));
  check(shown.ok, "display list -> page saved", shown.ok ? "" : shown.error.message);
  const tableAfter = must(await tries(() => c.tableRead({ table_id: list })), "list table after");
  check(tableAfter.display === "page", "the pick list now shows as a page", tableAfter.display);
  const after = must(await tries(() => c.listPage({ table_id: list, limit: 20 })), "choices after").rows;
  check(JSON.stringify(after.map((r) => r.id).sort()) === JSON.stringify(before.map((r) => r.id).sort()), "same choice records, same ids (nothing migrated)", after.map((r) => r.id));
  const redAfter = after.find((r) => r.id === red.id);
  check(redAfter?.document?.hex === "#C0392B" && redAfter?.document?.shade === "Brick", "Red carries its new fields", redAfter?.document);
  const valuesAfter = must(await tries(() => c.listByIds({ table_id: paint, ids })), "rows after").map((r) => r.document.color);
  check(JSON.stringify(valuesAfter) === JSON.stringify(valuesBefore), "every record still holds the same choice", { before: valuesBefore, after: valuesAfter });
  const more = await tries(() => c.recordWrite({ table_id: paint, data: { name: "Truck", color: "red" } }));
  check(more.ok, "a new record still picks Red from the grown list", more.ok ? "" : more.error.message);
  if (more.ok) { const d = must(await tries(() => c.listByIds({ table_id: paint, ids: [more.data] })), "truck")[0].document.color; check(d === "Red", "and it reads as Red", d); }
  const raw = async (id) => { const r = await c.recordAsOf({ record_id: id, recorded_at: new Date().toISOString() }); return r.ok ? r.data?.color : r.error.message; };
  const stored = await Promise.all([...ids, ...(more.ok ? [more.data] : [])].map(raw));
  say("what each record stores for Color:", stored);
  const redKeys = new Set(stored.filter((x, i) => i !== 2));
  check(redKeys.size === 1, "Barn, Door and the new Truck store one and the same Red", [...redKeys]);
  const colorAfter = must(await tries(() => c.fields({ table_id: paint })), "fields after").find((f) => f.key === "color");
  check(colorAfter.config?.options_table_id === list, "the Color field still takes its choices from the same table", colorAfter.config?.options_table_id);
} catch (e) { fails++; say("ERROR", e.message); }
finally {
  for (const id of made) for (let i = 0; i < 6; i++) { const r = await c.tableArchive({ table_id: id, chunk: 5, includeTable: true }); if (r.ok && r.data?.done !== false) { say("archived", id); break; } await new Promise((res) => setTimeout(res, 4000)); }
  say(fails ? `${fails} FAILED` : "ALL PASS");
}
