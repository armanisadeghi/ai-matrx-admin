import { store } from "./store.mjs";
const { client } = await store();
const jobs = "e740f9c2-4f45-4550-a66f-d77f5da413f7";
const list = (await client.automations({ table_id: jobs })).data.automations;
for (const n of ["find_each", "archive", "slack", "outhook", "email"]) {
  const a = list.find((x) => x.spec.name === "FINAL " + n);
  const t = await client.automationTest({ automation_id: a.id });
  console.log("==", n, t.ok ? t.data.status : JSON.stringify(t.error)); if (t.ok) for (const s of t.data.steps ?? []) console.log("  ", s.n, s.do, s.status, (s.says ?? "").slice(0, 160), JSON.stringify(s).slice(0, 0));
}
const r = await client.automationRuns({ automation_id: list.find((x) => x.spec.name === "FINAL match").id }); console.log(JSON.stringify(r.data.runs.map((x) => ({ s: x.status, t: x.trigger, test: x.test }))).slice(0, 400));
