import { store } from "./store.mjs";
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const TB = "85c830ae-98aa-4e2a-a864-8115e53a1a5d";
const v = must(await client.views({ table_id: TB }), "views");
console.log(v.map(x=>x.name));
if (!v.find(x=>x.name==="Big accounts")) console.log(must(await client.viewDeclare({ table_id: TB, spec: { name: "Big accounts", filters: { status: "Active" }, definition: { table_id: TB, layout: "grid", sorts: [{ field: "weekly_loaves", direction: "desc" }], presentation: { grouping: { field: "status" }, rowHeight: 72 } } } }), "declare"));
console.log(must(await client.views({ table_id: TB }), "views").map(x=>x.name));
