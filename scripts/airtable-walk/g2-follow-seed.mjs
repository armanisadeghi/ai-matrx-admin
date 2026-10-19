// AT-FIX-G2: a disposable "G2 follow" table with one row in admin's Workspace (test@test.com is a member there). Prints ids.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const tag = Date.now().toString(36).slice(-4);
const table = ok(await ensureTable(client, { name: `G2 follow ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "qty", label: "Qty", type: "number", sort: 20 }] }), "table");
const row = ok(await client.recordWrite({ table_id: table, data: { name: `Followed row ${tag}`, qty: 1 } }), "row");
console.log(JSON.stringify({ table, row, tag }));
