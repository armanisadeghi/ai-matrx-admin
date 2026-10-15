import { store } from "./store.mjs";
const { client } = await store();
const r = await client.tableList({});
const rows = r.ok ? (r.data.tables ?? r.data) : r;
console.log(JSON.stringify(rows).slice(0,200));
for (const t of Array.isArray(rows)?rows:[]) if (/wholesale/i.test(t.name ?? t.document?.name ?? "")) console.log(t.id, t.name ?? t.document?.name);
