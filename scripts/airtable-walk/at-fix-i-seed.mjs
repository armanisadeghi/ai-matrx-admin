// AT-FIX-I seed: one disposable table (Name text, Qty number, Notes long text) with a published capture sheet (questions name, qty). Prints ids.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const tag = Date.now().toString(36).slice(-4);
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const table = ok(await ensureTable(client, { name: `ATFI cap ${tag}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "qty", label: "Qty", type: "number", sort: 20 },
  { key: "status", label: "Status", type: "select", options: ["Open", "Done"], sort: 30 },
  { key: "notes", label: "Notes", type: "long_text", sort: 40 }] }), "table");
const rows = [["Delta", 1], ["Charlie", 5], ["Bravo", 9], ["Alpha", 3]];
for (const [name, qty] of rows) ok(await client.recordWrite({ table_id: table, data: { name, qty, status: "Open" } }), "row");
const sheet = ok(await client.captureSheetDeclare({ table_id: table, title: `ATFI crew ${tag}`, questions: [{ field: "name" }, { field: "qty" }] }), "sheet");
ok(await client.capturePublish({ sheet_id: sheet, open: true }), "publish");
const face = await client.captureOpen({ sheet_id: sheet });
console.log(JSON.stringify({ tag, table, sheet, face: face.ok ? face.data : face.error }));
