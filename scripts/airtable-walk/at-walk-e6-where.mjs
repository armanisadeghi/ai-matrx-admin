// node at-walk-e6-where.mjs <substr|idprefix>... : list admin's Workspace tables matching (full row JSON)
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const r = await client.tableList();
if (!r.ok) { console.log(JSON.stringify(r.error)); process.exit(1); }
for (const x of r.data) if (process.argv.slice(2).some((s) => x.id.startsWith(s) || x.name.includes(s))) console.log(JSON.stringify(x).slice(0, 400));
