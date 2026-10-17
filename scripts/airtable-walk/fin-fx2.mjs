import { store } from "./store.mjs";
const { client } = await store();
const t = process.argv[2];
const fx = {
 h1: 'CONCATENATE({Job}, "-", {Hours}) & "|" & T({Job}) & "|" & TRUE() & "|" & FALSE() & "|" & IF(ISERROR(ERROR()), "iserr", "no")',
 h2: 'ARRAYJOIN(ARRAYFLATTEN(SPLIT({Tags}, ", ")), "+") & "|" & MEDIAN({Hours}, 1, 9) & "|" & INCLUDES(SPLIT({Tags}, ", "), "tune") & "|" & AT(SPLIT({Tags}, ", "), 1) & "|" & FINDFIRST(SPLIT({Tags}, ", "), "fleet")',
};
for (const [k, v] of Object.entries(fx)) { const r = await client.fieldDeclare({ table_id: t, spec: { key: k, label: k, type: "formula", formula_text: v } }); console.log(k, r.ok, r.ok ? "" : r.error.message.slice(0, 220)); }
const r = await client.listPage({ table_id: t, limit: 50 }); const d = r.data.rows[2].document;
for (const k of Object.keys(d).filter((k) => /^h\d/.test(k))) console.log(k, "=>", JSON.stringify(d[k]));
