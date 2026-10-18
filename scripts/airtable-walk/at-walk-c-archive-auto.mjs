// AT-WALK-C: switch off + archive every automation whose name starts with a prefix on one table, then archive the table.
import { store } from "./store.mjs";
const { client } = await store();
const [table, prefix] = process.argv.slice(2);
const a = await client.automations({ table_id: table }).catch((e) => ({ ok: false, error: e.message }));
const list = Array.isArray(a?.data) ? a.data : (a?.data?.automations ?? []);
console.log("automations", a?.ok, list.length, a?.ok ? "" : JSON.stringify(a).slice(0, 200));
for (const x of list) {
  console.log(x.name, x.id, x.enabled);
  if (!x.name?.startsWith(prefix)) continue;
  const off = await client.automationSetEnabled({ automation_id: x.id, enabled: false }).catch((e) => ({ ok: false, error: e.message }));
  const ar = await (client.automationArchive?.({ automation_id: x.id }) ?? Promise.resolve({ ok: false, error: "no automationArchive" }));
  console.log("  off", off.ok, "archive", ar.ok, ar.ok ? "" : JSON.stringify(ar.error).slice(0, 120));
}
