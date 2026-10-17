import { automationWebhookUrl } from "@ai-matrx/records";
import { store } from "./store.mjs";
const { client } = await store();
const jobs = "e740f9c2-4f45-4550-a66f-d77f5da413f7", log = "58035195-6072-4710-826f-efc30fc085eb";
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error).slice(0, 300)); return r.data; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jf = must(await client.fields({ table_id: jobs }), "jf"); const J = (k) => jf.find((f) => f.key === k)?.id;
const L = (await (async () => must(await client.fields({ table_id: log }), "lf"))()).find((f) => f.key === "what").id;
// button
let BTN = J("start");
if (!BTN) { const r = await client.fieldDeclare({ table_id: jobs, spec: { key: "start", label: "Start work", type: "button", button: { label: "Start work", do: "open_url", url: "https://example.com/job" } } }); console.log("button", r.ok ? "ok" : JSON.stringify(r.error).slice(0, 200)); BTN = must(await client.fields({ table_id: jobs }), "").find((f) => f.key === "start").id; }
const bd = await client.automationDeclare({ table_id: jobs, spec: { name: "FINAL btn", trigger: { on: "button_pressed", field: BTN }, actions: [{ do: "set", values: { [J("tags")]: "button-ran" } }, { do: "add_row", table_id: log, values: { [L]: "button: {{trigger.record.job}}" } }] } });
console.log("btn declare", JSON.stringify(bd).slice(0, 160));
const auts = () => must(client.automations({ table_id: jobs }) , "");
const list = must(await client.automations({ table_id: jobs }), "list").automations; const A = (n) => list.find((a) => a.spec.name === "FINAL " + n);
const fu = await client.fieldUpdate({ field_id: BTN, patch: { button: { label: "Start work", do: "run_automation", automation_id: A("btn")?.id } } }); console.log("button->automation", fu.ok ? "ok" : JSON.stringify(fu.error).slice(0, 200));
// real fires
const jr = must(await client.recordWrite({ table_id: jobs, data: { job: "Tubeless conversion", hours: 1.5, rate: 70, dropped: "2026-10-16", status: "Waiting", tags: "wheel, new", sku: "WO-" + Date.now() } }), "new job");
await sleep(4000);
const ur = await client.recordUpdate({ record_id: jr, patch: { status: "Done" } }); console.log("update", ur.ok ? "ok" : JSON.stringify(ur.error).slice(0, 200));
const bp = await client.buttonPress({ record_id: jr, field_id: BTN }); console.log("buttonPress", JSON.stringify(bp).slice(0, 400));
await sleep(12000);
const res = {};
for (const a of must(await client.automations({ table_id: jobs }), "list2").automations) { const r = must(await client.automationRuns({ automation_id: a.id }), "runs").runs; res[a.spec.name] = r.map((x) => `${x.status}|${x.trigger}|${(x.says ?? "").slice(0, 60)}`).slice(0, 3); }
console.log(JSON.stringify(res, null, 1));
const lg = must(await client.listPage({ table_id: log, limit: 50 }), "log").rows.map((x) => x.document.what); console.log("LOG:", JSON.stringify(lg));
console.log(JSON.stringify({ jr }));
