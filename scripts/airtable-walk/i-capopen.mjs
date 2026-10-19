import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const t=Date.now(); const r = await client.captureOpen({ sheet_id: "690f9a05-b222-4d9a-b852-74f5c925f5dc" });
console.log(Date.now()-t, r.ok, JSON.stringify(r).slice(0,200));
