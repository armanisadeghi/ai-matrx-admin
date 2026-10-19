import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const r = await client.tableList?.({});
const mine = (r?.data ?? []).filter((t) => /^ATWI /.test(t.name)).map((t) => ({ id: t.id, name: t.name, home: t.home_id ?? t.homeId }));
console.log(JSON.stringify(mine), r?.ok, Object.keys(client).slice(0,5));
