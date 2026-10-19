// AT-WALK-F area 2: a Button column + a button-pressed script automation on the ATWF main table. argv[2]=table id
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const t = process.argv[2];
// (field exists)
const fields = must(await client.fields({ table_id: t }), "fields");
const go = fields.find((f) => f.key === "go").id, qty = fields.find((f) => f.key === "qty").id;
const d = must(await client.automationDeclare({ table_id: t, spec: { name: "ATWF score", trigger: { on: "button_pressed", field: go }, actions: [{ do: "script", inputs: { qty: `{{082b4cc2-2df7-4758-a228-306f771a33fa}}` }, code: 'output.set("tier", input.qty > 4 ? "Big order" : "Small order"); output.set("qty", input.qty);' }] } }), "automation");
console.log(JSON.stringify(d));
