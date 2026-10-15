import { store } from "./store.mjs"; import { T } from "./lib.mjs";
const { client } = await store();
const r = await client.listPage({ table_id: process.argv[2] ?? T.events, limit: 50 });
console.log(r.data.rows.map((x) => JSON.stringify(x.document).slice(0, 110)).join("\n"));
