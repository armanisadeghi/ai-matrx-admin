// declare Gmail + Calendar trigger automations (saved off), switch each on, and print what the store says
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const [, , MAIN, LOG] = process.argv;
const g = (await client.fields({ table_id: LOG })).data;
const note = (t) => ({ [g.find((x) => x.key === "note").id]: t });
const acts = [{ do: "add_row", table_id: LOG, values: note("app trigger fired: {{trigger.body.subject}}") }];
for (const [name, trigger] of [["ATWH gmail", { on: "gmail_received", query: "subject:ATWH-nonexistent-subject" }], ["ATWH calendar", { on: "calendar_event", when: "created" }]]) {
  const r = await client.automationDeclare({ table_id: MAIN, spec: { name, trigger, actions: acts } });
  const id = r.data?.automation_id ?? r.data?.id;
  console.log(name, id, r.ok && r.data.ok ? "declared enabled=" + r.data.enabled : JSON.stringify(r.ok ? r.data._errors : r.error));
  if (id) { const e = await client.automationSetEnabled({ automation_id: id, enabled: true }); console.log("  switch on:", JSON.stringify(e).slice(0, 400)); }
}
