// set the run-an-agent step's variables (the cheap routing-desk test mandate needs 7), then test it on a row
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const [, , MAIN, AUTO, ROW] = process.argv;
const a = (await client.automations({ table_id: MAIN })).data.automations.find((x) => x.id === AUTO);
const spec = JSON.parse(JSON.stringify(a.spec));
spec.actions[0].mandate_key = "realtests.routing_line";
spec.actions[0].variables = { move_number: "4471", destination_city: "{{trigger.name}}", delivery_window: "ATWH window", dispatcher_initials: "AT", carrier: "ATWH carrier", piano_crew: "No", insurance_policy: "ATWH-1" };
const r = await client.automationDeclare({ table_id: MAIN, spec: { name: a.name, trigger: spec.trigger, actions: spec.actions }, automation_id: AUTO });
console.log(r.ok && r.data.ok ? "updated" : JSON.stringify(r.ok ? r.data._errors : r.error));
if (ROW) console.log("test", JSON.stringify(await client.automationTest({ automation_id: AUTO, record_id: ROW })).slice(0, 400));
await new Promise((r) => setTimeout(r, 60000));
const runs = await client.automationRuns({ automation_id: AUTO, limit: 2 });
console.log(JSON.stringify(runs.data.runs?.[0] ?? runs.data).slice(0, 1500));
