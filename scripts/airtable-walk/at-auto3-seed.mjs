// AT-AUTO3 seed: admin@admin.com's disposable "AA3 Customers" + "AA3 Orders" and one webhook automation written the way the visual editor writes it. Archive after (at-auto3-clean.mjs).
import { declareTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
import { writeFileSync } from "node:fs";
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const { client } = await store();
const cust = must(await declareTable(client, { name: "AA3 Customers", labelSingular: "Customer", labelPlural: "Customers", fields: [
  { key: "name", label: "Name", type: "text", sort: 10 }, { key: "email", label: "Email", type: "email", sort: 20 },
  { key: "tier", label: "Tier", type: "select", sort: 30, options: ["VIP", "Standard"] } ] }), "cust");
const ord = must(await declareTable(client, { name: "AA3 Orders", labelSingular: "Order", labelPlural: "Orders", fields: [
  { key: "customer", label: "Customer", type: "text", sort: 10 }, { key: "total", label: "Total", type: "number", sort: 20 },
  { key: "status", label: "Status", type: "text", sort: 30 } ] }), "ord");
for (const [name, email, tier] of [["Hearth & Crumb Bakery", "buyer@hearthcrumb.test", "VIP"], ["Corner Deli", "orders@cornerdeli.test", "Standard"]])
  must(await client.recordWrite({ table_id: cust, data: { name, email, tier } }), "row");
const of = must(await client.fields({ table_id: ord }), "fields"); const cf = must(await client.fields({ table_id: cust }), "cfields");
const F = (fs, k) => fs.find((f) => f.key === k).id;
const spec = { name: "Tier onto new orders", trigger: { on: "webhook" }, actions: [
  { do: "find", table_id: cust, limit: 1, where: { op: "eq", args: [{ field: F(cf, "email") }, { const: "{{trigger.body.email}}" }] } },
  { do: "add_row", table_id: ord, values: { [F(of, "customer")]: "{{step1.first.name}}", [F(of, "total")]: "{{trigger.body.total}}", [F(of, "status")]: "{{step1.first.tier}}" } } ] };
const d = must(await client.automationDeclare({ table_id: ord, spec }), "declare");
writeFileSync("/tmp/airtable-walk/at-auto3.json", JSON.stringify({ cust, ord, automation: d.automation_id ?? d.id ?? d, org: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f" }));
console.log(JSON.stringify({ cust, ord, d }).slice(0, 400));
