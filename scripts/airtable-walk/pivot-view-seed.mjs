// PIVOT-VIEW seed: admin@admin.com's disposable "Pivot Proof Deals" (40 deals, deterministic) with a pivot view and the
// four new chart shapes saved as views. Prints the ids as JSON. Archive after the walk (pivot-view-walk.mjs --archive).
import { declareTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";

const { client, organizationId } = await store();
const must = (r, what) => { if (!r.ok) throw new Error(what + ": " + JSON.stringify(r.error)); return r.data; };
const existing = must(await client.tableList(), "tables").find((t) => t.name === "Pivot Proof Deals" && !t.deleted_at && !t.archived_at);
const table = existing ? existing.id : must(await declareTable(client, {
  name: "Pivot Proof Deals", labelSingular: "Deal", labelPlural: "Deals",
  fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "stage", label: "Stage", type: "select", sort: 20, options: ["Lead", "Qualified", "Proposal", "Won", "Lost"] },
    { key: "owner", label: "Owner", type: "select", sort: 30, options: ["Ana", "Ben", "Cara", "Dev"] },
    { key: "region", label: "Region", type: "select", sort: 40, options: ["West", "East", "South"] },
    { key: "amount", label: "Amount", type: "number", sort: 50 },
    { key: "employees", label: "Employees", type: "number", sort: 60 },
  ],
}), "table");
const have = existing ? must(await client.list({ table_id: table, limit: 100 }), "list").rows.length : 0;
let seed = 20261018;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const pick = (xs) => xs[rnd(xs.length)];
const stages = ["Lead", "Qualified", "Proposal", "Won", "Lost"], owners = ["Ana", "Ben", "Cara", "Dev"], regions = ["West", "East", "South"];
const names = ["Acme", "Birch", "Cobalt", "Dune", "Ember", "Fjord", "Gale", "Harbor", "Iris", "Juniper"];
for (let i = 0; i < 40; i += 1) {
  if (i < have) { for (let k = 0; k < 6; k += 1) rnd(2); continue; }
  const employees = 5 + rnd(400);
  must(await client.recordWrite({ table_id: table, data: { name: `${names[i % 10]} ${Math.floor(i / 10) + 1}`, stage: pick(stages), owner: pick(owners), region: pick(regions), amount: employees * (20 + rnd(30)) + rnd(500), employees } }), "row " + i);
}
const fields = must(await client.fields({ table_id: table }), "fields");
const key = (label) => fields.find((f) => f.label === label)?.key;
const view = async (name, definition) => must(await client.viewDeclare({ table_id: table, spec: { name, definition } }), name);
const views = {
  pivot: await view("Stage by owner (total amount)", { layout: "pivot", group_field: key("Stage"), column_field: key("Owner"), measure: key("Amount"), pivot_measure: "sum" }),
  pivotCount: await view("Stage by region (count)", { layout: "pivot", group_field: key("Stage"), column_field: key("Region") }),
  pivotAvg: await view("Owner by stage (average amount)", { layout: "pivot", group_field: key("Owner"), column_field: key("Stage"), measure: key("Amount"), pivot_measure: "avg" }),
  area: await view("Area", { layout: "chart", chart_kind: "area", group_field: key("Stage"), chart_measure: "sum", measure: key("Amount"), presentation: { chartLabels: true } }),
  pie: await view("Pie", { layout: "chart", chart_kind: "pie", group_field: key("Stage"), presentation: { chartLabels: true } }),
  stacked: await view("Stacked", { layout: "chart", chart_kind: "stacked", group_field: key("Stage"), column_field: key("Owner"), presentation: { chartLabels: true } }),
  scatter: await view("Scatter", { layout: "chart", chart_kind: "scatter", group_field: key("Owner"), x_field: key("Employees"), measure: key("Amount"), chart_measure: "avg", presentation: { chartLabels: true } }),
};
console.log(JSON.stringify({ organizationId, table, views, keys: { stage: key("Stage"), owner: key("Owner"), region: key("Region"), amount: key("Amount") } }));
