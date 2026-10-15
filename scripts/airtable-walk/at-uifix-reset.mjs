import { store } from "./store.mjs";
const { client } = await store();
const TB = "85c830ae-98aa-4e2a-a864-8115e53a1a5d";
const v = (await client.views({ table_id: TB })).data.find((x) => x.name === "All records");
const r = await client.viewDeclare({ table_id: TB, spec: { view_id: v.view_id, filters: null, definition: { sorts: [], presentation: null } } });
console.log(JSON.stringify(r).slice(0, 300));
