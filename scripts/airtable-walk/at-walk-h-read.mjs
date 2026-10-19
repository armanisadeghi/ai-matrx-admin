// read rows of the ATWH tables and every automation's last runs. args: mainId logId
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const [, , MAIN, LOG] = process.argv;
for (const [n, t] of [["main", MAIN], ["log", LOG]]) {
  const r = await client.list({ table_id: t, limit: 50 });
  console.log(n, r.ok ? JSON.stringify(r.data.rows.map((x) => x.document)) : JSON.stringify(r.error));
}
const a = await client.automations({ table_id: MAIN, include_archived: true });
for (const x of a.data?.automations ?? a.data ?? []) {
  const runs = await client.automationRuns({ automation_id: x.id, limit: 5 });
  console.log("AUTO", x.id.slice(0, 8), x.name, "enabled=" + x.enabled, "archived=" + !!x.archived_at, JSON.stringify((runs.data?.runs ?? runs.data ?? []).map((r) => ({ id: r.id?.slice(0, 8), st: r.status, on: r.trigger?.on, say: (r.says ?? r.say ?? r.message ?? "").slice?.(0, 160), steps: (r.steps ?? []).map((s) => s.say ?? s.status ?? s) }))).slice(0, 900));
}
