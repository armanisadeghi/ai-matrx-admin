import { store } from "./store.mjs";
const { client } = await store();
const jobs = "e740f9c2-4f45-4550-a66f-d77f5da413f7", log = "58035195-6072-4710-826f-efc30fc085eb";
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error).slice(0, 300)); return r.data; };
const jf = must(await client.fields({ table_id: jobs }), "jf"); const J = (k) => jf.find((f) => f.key === k).id;
const lf = must(await client.fields({ table_id: log }), "lf"); const L = lf.find((f) => f.key === "what").id;
const rows = must(await client.listPage({ table_id: jobs, limit: 50 }), "rows").rows;
const wait = rows.find((r) => r.document.status === "Waiting" || r.document._choices?.status?.label === "Waiting"); console.log("status doc", JSON.stringify(wait.document.status), JSON.stringify(wait.document._choices?.status));
const cid = wait.document._choices.status.id;
for (const [name, where] of [["by id", { op: "eq", args: [{ field: J("status") }, { const: cid }] }], ["by label", { op: "eq", args: [{ field: J("status") }, { const: "Waiting" }] }], ["hours>3", { op: "gt", args: [{ field: J("hours") }, { const: 3 }] }]]) {
  const d = must(await client.automationDeclare({ table_id: jobs, spec: { name: "FINAL find " + name, trigger: { on: "webhook" }, actions: [{ do: "find", table_id: jobs, where, limit: 10 }, { do: "for_each", list: "{{step1.records}}", actions: [{ do: "add_row", table_id: log, values: { [L]: "found " + name + ": {{item.job}}" } }] }] } }), "decl");
  const t = must(await client.automationTest({ automation_id: d.automation_id }), "test"); console.log(name, t.steps.map((s) => s.says).join(" / "));
}
const d2 = must(await client.automationDeclare({ table_id: jobs, spec: { name: "FINAL archive2", trigger: { on: "webhook" }, actions: [{ do: "add_row", table_id: log, values: { [L]: "to-archive2" } }, { do: "archive", record: "{{step1.record_id}}", table_id: log }] } }), "d2");
const t2 = must(await client.automationTest({ automation_id: d2.automation_id }), "t2"); console.log("archive2", t2.steps.map((s) => s.says).join(" / "));
const lg = must(await client.listPage({ table_id: log, limit: 80 }), "log").rows.map((x) => x.document.what); console.log("LOG", JSON.stringify(lg.filter((x) => /found|archive2/.test(x))));
