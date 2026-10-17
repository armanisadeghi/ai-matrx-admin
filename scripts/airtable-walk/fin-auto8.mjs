import { store } from "./store.mjs";
const { client } = await store();
const jobs = "e740f9c2-4f45-4550-a66f-d77f5da413f7";
const jf = (await client.fields({ table_id: jobs })).data; const J = (k) => jf.find((f) => f.key === k).id;
for (const c of ["waiting", "Waiting"]) for (const op of ["eq", "equals"]) {
  const d = await client.automationDeclare({ table_id: jobs, spec: { name: "FINAL fk " + c + op, trigger: { on: "webhook" }, actions: [{ do: "find", table_id: jobs, where: { op, args: [{ field: J("status") }, { const: c }] }, limit: 10 }] } });
  if (!d.data.automation_id) { console.log(c, op, JSON.stringify(d.data).slice(0, 150)); continue; }
  const t = await client.automationTest({ automation_id: d.data.automation_id }); console.log(c, op, t.data.steps.map((s) => s.says).join("/"));
}
