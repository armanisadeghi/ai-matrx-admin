// AT-WALK-A seed: admin's disposable "ATWA grid" table. Archive with at-walk-a-archive.mjs.
import { declareTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const id = must(await declareTable(client, { name: "ATWA grid", labelSingular: "Item", labelPlural: "Items", fields: [
  { key: "item", label: "Item name that is deliberately rather long to test header wrapping", type: "text", sort: 10 },
  { key: "qty", label: "Quantity", type: "number", sort: 20 },
  { key: "price", label: "Price", type: "currency", unit: "$", sort: 30 },
  { key: "status", label: "Status", type: "select", sort: 40, options: ["Todo", "Doing", "Done"] },
  { key: "notes", label: "Notes", type: "long_text", sort: 50 },
] }), "table");
for (const [item, qty, price, status] of [["Alpha", 1234567.891, 10.5, "Todo"], ["Bravo", 2, 20, "Doing"], ["Charlie", 3, 30.25, "Done"], ["Delta", 4, 40, "Todo"], ["Echo", 5, 50, "Doing"]])
  must(await client.recordWrite({ table_id: id, data: { item, qty, price, status } }), "row");
const D = async (spec) => { const r = await client.fieldDeclare({ table_id: id, spec }); console.log(spec.key, r.ok ? "ok" : "FAIL " + r.error.message.slice(0, 200)); };
await D({ key: "edited_by", label: "Last modified by", type: "modified_by" });
await D({ key: "code", label: "Barcode", type: "barcode", symbology: "code128" });
console.log("TABLE", id);
const tl = must(await client.tableList(), "list").find((t) => t.id === id); console.log(JSON.stringify(tl).slice(0, 300));
