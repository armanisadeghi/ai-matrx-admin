import { store } from "./store.mjs";
const { client } = await store();
const r = await client.tableSyncSettingsSet({ table_id: process.env.T, settings: { auto_refresh: "off" } });
console.log(JSON.stringify(r).slice(0, 200));
