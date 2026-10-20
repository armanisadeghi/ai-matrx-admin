// one-off scheduled rule: every day at now+N min (the 5-minute tick), adds a row to the log; MODE=declare|read|remove. Removed (archived) afterwards.
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const [, , MAIN, LOG, MODE, AUTO] = process.argv;
const g = (await client.fields({ table_id: LOG })).data;
if (MODE === "declare") {
  const t = new Date(Date.now() + 7 * 60000);
  // the person's zone is America/Los_Angeles
  const at = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Los_Angeles", hour: "2-digit", minute: "2-digit", hour12: false }).format(t);
  const spec = { name: "ATWH one-off schedule", trigger: { on: "schedule", every: "day", at }, actions: [{ do: "add_row", table_id: LOG, values: { [g.find((x) => x.key === "note").id]: "scheduled run fired" } }] };
  const r = await client.automationDeclare({ table_id: MAIN, spec });
  console.log("at", at, JSON.stringify(r).slice(0, 300));
  const id = r.data?.automation_id ?? r.data?.id;
  if (id) console.log("enable", JSON.stringify(await client.automationSetEnabled({ automation_id: id, enabled: true })).slice(0, 200));
} else if (MODE === "read") {
  const runs = await client.automationRuns({ automation_id: AUTO, limit: 3 });
  console.log(JSON.stringify(runs.data.runs?.map((r) => ({ at: r.at, st: r.status, trig: r.trigger, says: r.says })) ?? runs.data).slice(0, 900));
} else if (MODE === "remove") {
  console.log(JSON.stringify(await client.automationSetEnabled({ automation_id: AUTO, enabled: false })).slice(0, 150), JSON.stringify(await client.automationArchive({ automation_id: AUTO })).slice(0, 150));
}
