import { store } from "./store.mjs";
if (process.env.ORG !== "active") process.env.WALK_ORG_ID = process.env.ORG ?? "9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d";
const { client } = await store();
const r = await client.tableList({});
const re = new RegExp(process.env.RE ?? "ATWI");
console.log(JSON.stringify((r.data ?? []).filter((t) => re.test(t.name)).map((t) => ({ id: t.id, name: t.name, src: t.sync_source ?? null }))));
