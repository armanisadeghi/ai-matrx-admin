import { store } from "./store.mjs";
import { readFileSync } from "node:fs";
const S = JSON.parse(readFileSync("/tmp/airtable-walk/at-auto3.json", "utf8"));
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const { client } = await store();
const of = must(await client.fields({ table_id: S.ord }), "f"); const F = (k) => of.find((f) => f.key === k).id;
const d = must(await client.automationDeclare({ table_id: S.ord, spec: { name: "Script discount", trigger: { on: "webhook" }, actions: [
  { do: "script", inputs: { total: "{{trigger.body.total}}" }, code: 'output.set("label", input.total > 500 ? "Big order" : "Small order");' },
  { do: "add_row", table_id: S.ord, values: { [F("customer")]: "Script test", [F("status")]: "{{step1.output.label}}" } } ] } }), "declare");
const l = must(await client.automations({ table_id: S.ord }), "list");
const a = l.automations.find((x) => x.spec.name === "Script discount");
const url = (await import("@ai-matrx/records")).automationWebhookUrl("https://server.app.matrxserver.com", a);
const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ total: 640 }) });
console.log("hook", r.status, await r.text());
for (let i = 0; i < 30; i++) {
  await new Promise((x) => setTimeout(x, 6000));
  const runs = must(await client.automationRuns({ automation_id: a.id }), "runs");
  const run = runs.runs[0]; console.log(i, run.status, run.says);
  if (run.status !== "waiting" && run.status !== "running") break;
}
