import { store } from "./store.mjs"; import { T } from "./lib.mjs";
const { client } = await store();
const l = await client.automations({ table_id: T.events });
console.log(l.data.automations.map((a) => [a.spec.name, a.enabled]));
