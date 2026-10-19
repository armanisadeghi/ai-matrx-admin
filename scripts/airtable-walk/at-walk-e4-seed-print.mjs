// AT-WALK-E4 print seed: table with 5 rows (name, note, logo = tiny data: PNG) in admin's Workspace.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const tag = Date.now().toString(36).slice(-4);
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const t = await ensureTable(client, { name: `ATWE4 slips ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "note", label: "Note", type: "text", sort: 20 }, { key: "logo", label: "Logo", type: "text", sort: 30 }] });
if (!t.ok) throw new Error(JSON.stringify(t.error));
const ids = [];
for (const n of ["Alpha", "Bravo", "Charlie", "Delta", "Echo"]) { const r = await client.recordWrite({ table_id: t.data, data: { name: n, note: "Note for " + n, logo: PNG } }); ids.push(r.data); }
console.log(JSON.stringify({ tag, home: t.homeId, table: t.data, ids }));
