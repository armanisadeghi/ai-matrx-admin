// Archives the AT-WALK tables (T in lib.mjs); archiving is the delete (nothing is hard-deleted).
import { store } from "./store.mjs"; import { T } from "./lib.mjs";
const { client } = await store();
for (const id of [T.events, T.clients]) for (let i = 0; i < 5; i++) { const r = await client.tableArchive({ table_id: id }); console.log(id, r.ok && r.data.done, JSON.stringify(r).slice(0, 120)); if (!r.ok || r.data.done) break; }
