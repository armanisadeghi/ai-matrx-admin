// AT-WALK-F area 3: declare formula columns on the ATWF main table and print each row's value. argv[2]=table id, argv[3]=JSON {key: formula}
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const t = process.argv[2]; const fx = JSON.parse(process.argv[3]);
for (const [k, v] of Object.entries(fx)) { const r = await client.fieldDeclare({ table_id: t, spec: { key: k, label: k, type: "formula", formula_text: v } }); if (!r.ok) console.log("DECLARE FAIL", k, JSON.stringify(r.error).slice(0, 260)); }
await new Promise((r) => setTimeout(r, 1500));
const r = await client.listPage({ table_id: t, limit: 50 });
if (!r.ok) { console.log("LIST FAIL", JSON.stringify(r.error)); process.exit(1); }
for (const row of r.data.rows) { const d = row.document; console.log(d.name, "|", Object.keys(fx).map((k) => `${k}=${JSON.stringify(d[k])}`).join("  ")); }
