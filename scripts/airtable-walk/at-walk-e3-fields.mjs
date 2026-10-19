// AT-WALK-E3: add Owner (Person, up to 5) + Notes columns and 3 rows to TABLE (env), retrying DB timeouts.
import { KERNEL_TABLES } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const id = process.env.TABLE;
const PERSON = KERNEL_TABLES.find((t) => t.name === "Person").id;
const retry = async (f, w) => { for (let i = 0; i < 5; i++) { const r = await f(); if (r.ok) return r; console.log(w, "retry", JSON.stringify(r.error).slice(0, 120)); } throw new Error(w); };
const have = (await retry(() => client.fields({ table_id: id }), "fields")).data.map((f) => f.key);
if (!have.includes("owner")) await retry(() => client.fieldDeclare({ table_id: id, spec: { key: "owner", label: "Owner", type: "relation", relation_target: PERSON, relation_max: 5, sort: 20 } }), "owner");
for (const n of ["Row A", "Row B", "Row C"]) await retry(() => client.recordWrite({ table_id: id, data: { name: n } }), "row " + n);
console.log("done", (await client.fields({ table_id: id })).data.map((f) => f.key + ":" + f.type).join(","));
