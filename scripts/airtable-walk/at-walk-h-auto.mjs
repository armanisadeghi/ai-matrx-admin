// AT-WALK-H: declare the script / agent / legacy-agent / failing automations on ATWH main (all fire on an edit of Owner note).
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const [, , MAIN, LOG] = process.argv;
const f = (await client.fields({ table_id: MAIN })).data, g = (await client.fields({ table_id: LOG })).data;
const id = (a, k) => a.find((x) => x.key === k).id;
const on = { on: "property_edited", field: id(f, "owner_note") };
const decl = async (spec) => { const r = await client.automationDeclare({ table_id: MAIN, spec }); console.log(spec.name, r.ok && r.data.ok ? "declared " + (r.data.automation_id ?? r.data.id ?? JSON.stringify(r.data).slice(0, 80)) : "REFUSED " + JSON.stringify(r.ok ? r.data._errors : r.error)); };
const note = (t) => ({ [id(g, "note")]: t });
await decl({ name: "ATWH script", trigger: on, actions: [
  { do: "script", inputs: { qty: "{{trigger.qty}}", who: "{{trigger.name}}" }, code: 'output.set("msg", input.who + " has qty " + input.qty + (input.qty > 4 ? " (big)" : " (small)")); console.log("script ran for", input.who);' },
  { do: "add_row", table_id: LOG, values: note("script said: {{step1.output.msg}}") }] });
await decl({ name: "ATWH ask agent", trigger: on, actions: [
  { do: "run_mandate", mandate_key: "realtests.routing_line", input: "Reply with exactly the word OK.", variables: {} },
  { do: "add_row", table_id: LOG, values: note("agent said: {{step1.output.text}}") }] });
await decl({ name: "ATWH legacy agent", trigger: on, actions: [{ do: "agent", prompt: "Summarize {{trigger.name}} in one line." }] });
await decl({ name: "ATWH failing", trigger: on, actions: [{ do: "webhook", url: "https://atwh-no-such-host.invalid/hook" }] });
