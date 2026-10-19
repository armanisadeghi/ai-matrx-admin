// AT-FIX-F cleanup: archive the "ATFF" tables and their home (admin's Workspace). Archive only; nothing deleted.
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const tl = await client.tableList();
const mine = tl.data.filter((t) => /^ATFF /.test(t.name));
for (const t of mine) { for (let i = 0; i < 40; i++) { const a = await client.tableArchive({ table_id: t.id, chunk: 2, includeTable: true }); if (!a.ok) { console.log(t.id, "ERR", JSON.stringify(a.error).slice(0, 120)); if (i > 6) break; continue; } if (a.data.done) { console.log(t.id, t.name, "archived"); break; } } }
for (const h of [...new Set(mine.map((t) => t.parent_id).filter(Boolean))]) console.log("home", h, JSON.stringify(await client.recordDelete({ record_id: h })).slice(0, 80));
