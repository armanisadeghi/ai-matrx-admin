import { store } from "./store.mjs";
const { client } = await store();
const r = await client.tableList();
let n = 0;
for (const x of r.data) if (/^AT2 /.test(x.name) || /^Harbor (member )?walk /.test(x.name)) { for (let i = 0; i < 40; i++) { const a = await client.tableArchive({ table_id: x.id, chunk: 20, includeTable: true }); if (!a.ok || a.data.done) break; } n++; console.log("archived", x.name); }
console.log(n);
