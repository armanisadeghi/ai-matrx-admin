// archive AT-WALK-E5 leftovers: ids by parent_id (bike base 87b7d86f..., scratch home 93f78f9e...)
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const parents = ["87b7d86f-6ebe-465e-9dd1-0a954153a056", "93f78f9e-8ecc-4238-b91a-88d85608e7de"];
const r = await client.tableList();
const ts = r.data.filter((x) => parents.includes(x.parent_id));
console.log(ts.map((x) => [x.id, x.name, x.parent_id.slice(0, 8)].join(" ")).join("\n"));
for (const t of ts) { for (let i = 0; i < 40; i++) { const a = await client.tableArchive({ table_id: t.id, chunk: 2, includeTable: true }); if (!a.ok) { console.log(t.id, "ERR", JSON.stringify(a.error).slice(0, 120)); if (i > 4) break; continue; } if (a.data.done) { console.log(t.id, "archived"); break; } } }
for (const h of parents) console.log(h, JSON.stringify(await client.recordDelete({ record_id: h })).slice(0, 100));
