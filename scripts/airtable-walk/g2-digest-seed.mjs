// AT-FIX-G2: a disposable table + saved view + HOURLY in-app summary rule (to admin only), then a row written after the rule.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const tag = Date.now().toString(36).slice(-4);
const table = ok(await ensureTable(client, { name: `G2 digest ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "table");
const view = ok(await client.viewDeclare({ table_id: table, spec: { name: `G2 digest view ${tag}`, definition: { table_id: table, layout: "grid", sorts: [] } } }), "view");
const viewId = view.view_id ?? view.id ?? view;
const rule = ok(await client.subscriptionDeclare({ table_id: table, spec: { name: `G2 hourly ${tag}`, saved_view_id: viewId, cadence: "hourly", channel: "in_app" } }), "rule");
await new Promise((r) => setTimeout(r, 1500));
const row = ok(await client.recordWrite({ table_id: table, data: { name: `G2 arrival ${tag}` } }), "row");
console.log(JSON.stringify({ table, view, rule, row }));
const subs = await client.subscriptions({ table_id: table });
console.log(JSON.stringify(subs.data));
