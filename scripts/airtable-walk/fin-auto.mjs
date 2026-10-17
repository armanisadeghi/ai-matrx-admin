import { declareTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
const { client } = await store();
const [cust, jobs] = process.argv.slice(2);
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error).slice(0, 300)); return r.data; };
const log = must(await declareTable(client, { name: "Ridgeback Log", labelSingular: "Entry", labelPlural: "Entries", fields: [{ key: "what", label: "What", type: "text", sort: 10 }, { key: "who", label: "Who", type: "text", sort: 20 }] }), "log");
const jf = must(await client.fields({ table_id: jobs }), "jf"); const J = (k) => jf.find((f) => f.key === k).id;
const lf = must(await client.fields({ table_id: log }), "lf"); const L = (k) => lf.find((f) => f.key === k).id;
const specs = {
  added: { trigger: { on: "row_added" }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "added: {{trigger.record.job}}" } }] },
  upd: { trigger: { on: "record_updated", fields: [J("status")] }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "updated: {{trigger.record.job}}" } }] },
  prop: { trigger: { on: "property_edited", field: J("status"), to: "Done" }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "edited-to-done: {{trigger.record.job}}" } }] },
  find_each: { trigger: { on: "webhook" }, actions: [
    { do: "find", table_id: jobs, where: { all: [{ field: J("status"), is: "eq", to: "Waiting" }] }, limit: 5 },
    { do: "for_each", list: "{{step1.records}}", actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "waiting: {{item.id}}" } }] },
    { do: "if", branches: [{ label: "big", when: { all: [{ value: "{{trigger.body.n}}", is: "gt", to: 5 }] }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "if-big" } }] }], else: [{ do: "add_row", table_id: log, values: { [L("what")]: "if-else" } }] },
  ] },
  btn: { trigger: { on: "button_pressed", field: J("frame") }, actions: [{ do: "set", values: { [J("tags")]: "button-ran" } }] },
  sched: { trigger: { on: "schedule", every: "minutes", minutes: 30 }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "tick" } }] },
  sched2: { trigger: { on: "schedule", every: "week", weekday: "monday", at: "09:00" }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "weekly" } }] },
  date: { trigger: { on: "date_arrives", field: J("dropped"), offset_days: 1, at: "09:00" }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "date: {{trigger.record.job}}" } }] },
  match: { trigger: { on: "record_matches" }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "matches: {{trigger.record.job}}" } }] },
  form: { trigger: { on: "form_answered" }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "form" } }] },
  email: { trigger: { on: "webhook" }, actions: [{ do: "email", to: { author: true }, subject: "Ridgeback walk", body: "Job {{trigger.body.job}}" }] },
  slack: { trigger: { on: "webhook" }, actions: [{ do: "slack", url: "https://hooks.slack.com/services/T000/B000/walkdummy", text: "hi" }] },
  outhook: { trigger: { on: "webhook" }, actions: [{ do: "webhook", url: "https://example.invalid/hook" }] },
  agent: { trigger: { on: "webhook" }, actions: [{ do: "agent", prompt: "Say hello in five words." }] },
  archive: { trigger: { on: "webhook" }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "to-archive" } }, { do: "archive", record: "{{step1.record.id}}", table_id: log }] },
};
const out = { log, jobs, autos: {} };
for (const [k, s] of Object.entries(specs)) {
  const r = await client.automationDeclare({ table_id: jobs, spec: { name: "FINAL " + k, ...s } });
  console.log("declare", k, r.ok ? "ok" : "FAIL " + JSON.stringify(r.error).slice(0, 260));
}
const l = must(await client.automations({ table_id: jobs }), "list");
for (const a of l.automations) { out.autos[a.spec.name] = { id: a.id, enabled: a.enabled }; }
console.log(JSON.stringify(out));
