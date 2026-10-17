import { store } from "./store.mjs";
const { client } = await store();
const jobs = process.argv[2];
const r = await client.automations({ table_id: jobs });
console.log(r.ok, Object.keys(r.data ?? {}), r.data?.automations?.length);
for (const a of r.data.automations) console.log(a.id.slice(0,8), a.spec.name, a.enabled, JSON.stringify(a.spec.trigger).slice(0,80));
