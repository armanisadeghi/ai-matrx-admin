// seed a disposable 1,050-row table in admin's Workspace; prints the id. node at-walk-e6-seed-big.mjs
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const tag = Date.now().toString(36);
const p = await ensureTable(client, { name: `ATWE6 big ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "n", label: "N", type: "number", sort: 20 }] });
if (!p.ok) throw new Error(JSON.stringify(p.error));
console.log("TABLE", p.data, "HOME", p.homeId);
let done = 0;
for (let i = 0; i < 1050; i += 10) {
  const rs = await Promise.all(Array.from({ length: 10 }, (_, j) => client.recordWrite({ table_id: p.data, data: { name: `Row ${i + j + 1}`, n: i + j + 1 } }).catch((e) => ({ ok: false, error: String(e) }))));
  for (const r of rs) { if (r.ok) done++; else { await new Promise((z) => setTimeout(z, 3000)); } }
}
console.log("written", done);
