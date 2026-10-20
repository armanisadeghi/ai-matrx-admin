// AT-FIX-I: list the rows of a table (name, qty) through the store client.
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const r = await client.listPage({ table_id: process.argv[2], sort: [], search: null, limit: 100, offset: 0 });
if (!r.ok) throw new Error(JSON.stringify(r.error));
for (const row of r.data.rows) console.log(JSON.stringify({ name: row.document.name, qty: row.document.qty }));
