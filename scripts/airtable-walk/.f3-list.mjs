import { store } from "./store.mjs";
const { client } = await store();
const r = await client.tableList();
console.log(Object.keys(r.data[0]||{}));
const now=Date.now();
for (const x of r.data) { const c=x.created_at||x.createdAt; if (c && now-new Date(c)>1800e3) continue; console.log(x.id,x.name,c,x.space_id||x.spaceId||""); }
