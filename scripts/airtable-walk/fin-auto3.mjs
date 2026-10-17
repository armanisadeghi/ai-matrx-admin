import { declareTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
const { client } = await store();
const [cust, jobs] = process.argv.slice(2);
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error).slice(0, 300)); return r.data; };
const log = "58035195-6072-4710-826f-efc30fc085eb";
const jf = must(await client.fields({ table_id: jobs }), "jf"); const J = (k) => jf.find((f) => f.key === k).id;
const lf = must(await client.fields({ table_id: log }), "lf"); const L = (k) => lf.find((f) => f.key === k).id;
const bf = await client.fieldDeclare({ table_id: jobs, spec: { key: "start", label: "Start work", type: "button", button: { label: "Start work", do: "run_automation" } } }); console.log("button field", bf.ok ? "ok" : JSON.stringify(bf.error).slice(0,200));
const jf2 = must(await client.fields({ table_id: jobs }), "jf2"); const BTN = jf2.find((f) => f.key === "start")?.id;
const eq = (id, v) => ({ op: "eq", args: [{ field: id }, { const: v }] });
const specs = {
  find_each: { trigger: { on: "webhook" }, actions: [
    { do: "find", table_id: jobs, where: eq(J("status"), "Waiting"), limit: 5 },
    { do: "for_each", list: "{{step1.records}}", actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "waiting: {{item.id}}" } }] },
    { do: "if", branches: [{ label: "big", when: { all: [{ value: "{{trigger.body.n}}", is: "gt", to: 5 }] }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "if-big" } }] }], else: [{ do: "add_row", table_id: log, values: { [L("what")]: "if-else" } }] },
  ] },
  btn: { trigger: { on: "button_pressed", field: BTN }, actions: [{ do: "set", values: { [J("tags")]: "button-ran" } }] },
  sched2: { trigger: { on: "schedule", every: "week", weekday: 1, at: "09:00" }, actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "weekly" } }] },
  match: { trigger: { on: "record_matches" }, condition: eq(J("status"), "Done"), actions: [{ do: "add_row", table_id: log, values: { [L("what")]: "matches: {{trigger.record.job}}" } }] },
};
for (const k of ["find_each","btn","sched2","match"]) {
  const r = await client.automationDeclare({ table_id: jobs, spec: { name: "FINAL " + k, ...specs[k] } });
  console.log(k, JSON.stringify(r).slice(0, 500));
}
const l = must(await client.automations({ table_id: jobs }), "list"); console.log(l.automations.length, l.automations.map((a) => a.spec.name).join(","));
