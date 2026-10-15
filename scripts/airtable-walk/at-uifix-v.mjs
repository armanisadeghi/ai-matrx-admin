import { store } from "./store.mjs";
const { client } = await store();
const r = await client.views({ table_id: "85c830ae-98aa-4e2a-a864-8115e53a1a5d" });
console.log(JSON.stringify((r.data ?? r).map ? (r.data ?? r).map((v) => ({ n: v.name, f: v.filters, d: v.definition })) : r));
const l = await client.viewLookRead({ table_id: "85c830ae-98aa-4e2a-a864-8115e53a1a5d" });
console.log("looks", JSON.stringify(l.data ?? l));
