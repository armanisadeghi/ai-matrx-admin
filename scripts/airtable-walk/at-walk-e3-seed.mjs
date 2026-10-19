// AT-WALK-E3 seed: one disposable table (Name, Owner Person up to 5) in admin's Workspace (WALK_ORG_ID).
import { ensureTable, KERNEL_TABLES } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client, organizationId } = await store();
const tag = Date.now().toString(36).slice(-4);
const PERSON = KERNEL_TABLES.find((t) => t.name === "Person").id;
let r;
for (let i = 0; i < 4; i++) {
  r = await ensureTable(client, { name: `ATWE3 grid ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "owner", label: "Owner", type: "relation", relationTarget: PERSON, relationMax: 5, sort: 20 }] });
  if (r.ok) break; console.error("retry", JSON.stringify(r.error));
}
if (!r.ok) throw new Error(JSON.stringify(r.error));
for (const n of ["Row A", "Row B"]) { const w = await client.recordWrite({ table_id: r.data, data: { name: n } }); if (!w.ok) console.error("row", JSON.stringify(w.error)); }
console.log(JSON.stringify({ org: organizationId, table: r.data, home: r.homeId, tag }));
