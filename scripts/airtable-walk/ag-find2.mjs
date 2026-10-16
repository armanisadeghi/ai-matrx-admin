import { store } from "./store.mjs";
const { client } = await store();
const r = await client.tableListEverywhere({});
const d = r.ok ? r.data : r.error;
const arr = Array.isArray(d) ? d : (d.tables ?? d.items ?? []);
console.log(Object.keys(arr[0] ?? {}).join(","));
console.log(JSON.stringify(arr.filter((t) => /linked|green|compan/i.test(JSON.stringify(t))).slice(0, 6)).slice(0, 700));
