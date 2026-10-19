import { store } from "./store.mjs";
const { client } = await store();
for (const id of process.argv.slice(2)) { for (let i = 0; i < 40; i++) { const r = await client.tableArchive({ table_id: id, chunk: 2, includeTable: true }); if (!r.ok) { console.log(id, "ERR", JSON.stringify(r.error).slice(0, 150)); break; } if (r.data.done) { console.log(id, "archived"); break; } } }
