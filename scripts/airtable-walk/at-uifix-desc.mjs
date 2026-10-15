import { store } from "./store.mjs";
const { client } = await store();
const TB = "85c830ae-98aa-4e2a-a864-8115e53a1a5d";
const f = await client.fields({ table_id: TB });
const fs = f.data ?? f;
const w = (Array.isArray(fs) ? fs : fs.fields).find((x) => x.key === "weekly_loaves");
console.log(w.id, JSON.stringify(w.config));
const r = await client.fieldUpdate({ field_id: w.id, patch: { description: "Standing order, loaves per week" } });
console.log(JSON.stringify(r).slice(0, 200));
