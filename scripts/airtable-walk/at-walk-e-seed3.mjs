import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const p = await ensureTable(client, { name: `ATWE plain ${Date.now().toString(36).slice(-4)}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "qty", label: "Qty", type: "number", sort: 20 }] });
if (!p.ok) throw new Error(JSON.stringify(p.error));
for (const n of ["One", "Two"]) must(await client.recordWrite({ table_id: p.data, data: { name: n, qty: 1 } }), "row");
console.log(JSON.stringify({ home: p.homeId, table: p.data }));
