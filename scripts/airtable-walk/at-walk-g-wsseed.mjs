// AT-WALK-G member-check seed on the Workspace table: tags/due columns + values, formula columns, a Button + script automation, a saved calendar view.
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const T = "a825b088-400b-4872-8482-60366664b8eb";
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const decl = async (spec) => { const r = await client.fieldDeclare({ table_id: T, spec }); if (!r.ok) console.log("DECLARE FAIL", spec.key, JSON.stringify(r.error).slice(0, 240)); return r; };
await decl({ key: "tags", label: "Tags", type: "text", sort: 60 });
await decl({ key: "due", label: "Due", type: "datetime", sort: 70 });
await decl({ key: "go", label: "Score qty", type: "button", sort: 80, config: { button: { label: "Score qty" } } });
const fx = { f_sort: 'SORT(SPLIT({Tags}, ", "))', f_first: 'FIRST(SPLIT({Tags}, ", "))', f_map: 'MAP(SPLIT({Tags}, ", "), UPPER(CURRENT()))', f_median: "MEDIAN(1, {Qty}, 10)", f_some: 'SOME(SPLIT({Tags}, ", "), CURRENT()="blue")', f_incl: 'INCLUDES(SPLIT({Tags}, ", "), "red")', f_blank: "ISBLANK({Tags})" };
for (const [k, v] of Object.entries(fx)) await decl({ key: k, label: k, type: "formula", formula_text: v, sort: 90 });
const list = must(await client.listPage({ table_id: T, limit: 50 }), "list");
const tags = { Charlie: "red, urgent, red", Bravo: "blue, green", Delta: "" }; const due = { Charlie: "2026-11-17", Bravo: "2026-11-10", Delta: "2026-12-01" };
for (const row of list.rows) { const n = row.document.name; const data = n === "BravoMemberWS" ? { tags: "urgent, red, blue", due: "2026-11-03" } : tags[n] !== undefined ? { tags: tags[n], due: due[n] } : null; if (!data) continue; if (data.tags === "") delete data.tags;
  const r = await client.recordUpdate({ record_id: row.id, patch: data }); if (!r.ok) console.log("UPDATE FAIL", n, JSON.stringify(r.error).slice(0, 200)); }
const fields = must(await client.fields({ table_id: T }), "fields");
const go = fields.find((f) => f.key === "go")?.id, qty = fields.find((f) => f.key === "qty")?.id;
const a = await client.automationDeclare({ table_id: T, spec: { name: "ATWG score", trigger: { on: "button_pressed", field: go }, actions: [{ do: "script", inputs: { qty: `{{${qty}}}` }, code: 'output.set("tier", input.qty > 4 ? "Big order" : "Small order"); output.set("qty", input.qty);' }] } });
console.log("automation", a.ok ? JSON.stringify(a.data) : JSON.stringify(a.error).slice(0, 240));
const v = await client.viewDeclare({ table_id: T, spec: { name: "ATWG due calendar", definition: { table_id: T, layout: "calendar", date_field: "due", sorts: [] } } });
console.log("view", v.ok ? JSON.stringify(v.data) : JSON.stringify(v.error).slice(0, 240));
const after = must(await client.listPage({ table_id: T, limit: 50 }), "list2");
for (const row of after.rows) { const d = row.document; console.log(d.name, "|", Object.keys(fx).map((k) => `${k}=${JSON.stringify(d[k])}`).join(" ")); }
