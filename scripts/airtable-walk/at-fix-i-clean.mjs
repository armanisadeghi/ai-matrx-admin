// AT-FIX-I cleanup: archives the tables this lane made (archive door only; the capture sheet goes with its table).
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
for (const id of process.argv.slice(2)) { let r; for (let i = 0; i < 12; i++) { r = await client.tableArchive({ table_id: id }); if (r.ok && r.data?.done) break; } console.log(id.slice(0, 8), JSON.stringify(r).slice(0, 90)); }
