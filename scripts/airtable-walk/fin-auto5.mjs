import { automationWebhookUrl } from "@ai-matrx/records";
import { store } from "./store.mjs";
const { client } = await store();
const jobs = "e740f9c2-4f45-4550-a66f-d77f5da413f7", log = "58035195-6072-4710-826f-efc30fc085eb", jr = "5a31f12b-c2d3-4fa0-b99f-9c54c2a924e5";
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error).slice(0, 300)); return r.data; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = must(await client.automations({ table_id: jobs }), "list").automations;
for (const n of ["find_each", "archive", "email", "agent", "slack", "outhook"]) {
  const a = list.find((x) => x.spec.name === "FINAL " + n);
  const url = automationWebhookUrl("https://server.app.matrxserver.com", a);
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ n: 9, job: "Webhook job" }) });
  console.log("hook", n, r.status, (await r.text()).slice(0, 120));
}
for (const n of ["sched", "sched2", "form", "match"]) { const a = list.find((x) => x.spec.name === "FINAL " + n); const t = await client.automationTest({ automation_id: a.id, record_id: jr }); console.log("test", n, JSON.stringify(t.ok ? t.data : t.error).slice(0, 260)); }
await sleep(25000);
for (const a of must(await client.automations({ table_id: jobs }), "list2").automations) { const r = must(await client.automationRuns({ automation_id: a.id }), "runs").runs; console.log(a.spec.name.padEnd(18), JSON.stringify(r.map((x) => `${x.status}:${(x.says ?? "").slice(0, 70)}`).slice(0, 2))); }
console.log("LOG:", JSON.stringify(must(await client.listPage({ table_id: log, limit: 50 }), "log").rows.map((x) => x.document.what)));
const rv = await client.automationRevisions({ automation_id: list.find((x) => x.spec.name === "FINAL btn").id }); console.log("revisions", rv.ok ? JSON.stringify(rv.data).slice(0, 200) : JSON.stringify(rv.error));
