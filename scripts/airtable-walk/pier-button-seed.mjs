// ACCEPT-FIX-3: a disposable table with a Button column that runs a script automation (popover answer check).
import { store } from "./store.mjs";
import { declareTable } from "@ai-matrx/records/core";
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const t = must(await declareTable(client, { name: "Pier Street Button Check", labelSingular: "Unit", labelPlural: "Units",
  fields: [{ key: "unit", label: "Unit", type: "text", sort: 10 }, { key: "rent", label: "Rent", type: "number", sort: 20 }, { key: "go", label: "Score rent", type: "button", sort: 30, config: { button: { label: "Score rent" } } }] }), "table");
const fields = must(await client.fields({ table_id: t }), "fields");
const go = fields.find((f) => f.key === "go").id;
const rent = fields.find((f) => f.key === "rent").id;
must(await client.recordWrite({ table_id: t, data: { unit: "1A", rent: 1800 } }), "row");
must(await client.automationDeclare({ table_id: t, spec: { name: "Score rent", trigger: { on: "button_pressed", field: go }, actions: [{ do: "script", inputs: { rent: `{{record.${rent}}}` }, code: 'output.set("tier", input.rent > 1500 ? "Premium unit" : "Standard unit"); output.set("rent", input.rent);' }] } }), "declare");
console.log("TABLE", t);
