import { store } from "./store.mjs";
const { client } = await store();
const t = process.argv[2];
if (process.argv[3] === "mod") { const r = await client.fieldDeclare({ table_id: t, spec: { key: "f_num", label: "f_num", type: "formula", formula_text: 'ABS(-3) & "|" & ROUND({Hours} * 1.37, 1) & "|" & ({Hours} % 5) & "|" & MAX({Hours}, 3) & "|" & MIN({Hours}, 3) & "|" & SUM({Hours}, {Rate}) & "|" & AVERAGE({Hours}, {Rate})' } }); console.log("mod", r.ok, JSON.stringify(r.error ?? "").slice(0,300)); }
const r = await client.listPage({ table_id: t, limit: 50 });
const rows = r.data.rows;
const d = rows[2].document;
for (const k of Object.keys(d).filter((k) => k.startsWith("f_"))) console.log(k, "=>", JSON.stringify(d[k]));
console.log("keys", Object.keys(d).join(","));
