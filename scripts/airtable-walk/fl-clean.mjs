import { store } from "./store.mjs";
const { client, organizationId } = await store();
const a = (await client.tableListEverywhere({})); const arr = a.tables ?? a.data?.tables ?? [];
const today = arr.filter(x => x.organization_id === organizationId && String(x.created_at).startsWith("2026-10-16T1") && x.created_at > "2026-10-16T16:30");
console.log(organizationId, today.map(x => [x.id, x.table_name, x.created_at, x.user_id].join(" ")).join("\n"));
if (process.env.GO) for (const t of today) console.log("archive", t.table_name, JSON.stringify(await client.tableArchive({ table_id: t.id })).slice(0, 80));
