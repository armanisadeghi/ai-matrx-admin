// stage rule enforcement: Done needs Qty >= 5. Declared as the panel would (gates[stage]); then a move of a card that fails and one that passes.
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const [, , MAIN] = process.argv;
const f = (await client.fields({ table_id: MAIN })).data;
const qty = f.find((x) => x.key === "qty").id;
const d = await client.pipelineDeclare({ table_id: MAIN, spec: { stage_field: { key: "stage", options: ["Todo", "Doing", "Done"] }, gates: { done: [{ name: "ATWH Done needs Qty 5", message: "Qty must be at least 5 before a card can be Done.", demands: { op: "gte", args: [{ field: qty }, { const: 5 }] }, on_fail: "refuse" }] } } });
console.log("declare", JSON.stringify(d).slice(0, 300));
const rows = (await client.list({ table_id: MAIN, limit: 20 })).data.rows;
const by = (n) => rows.find((r) => r.document.name === n);
for (const n of ["FormMember walk", "FormAdmin walk"]) {
  const r = by(n);
  console.log(n, "qty", r.document.qty, "->", JSON.stringify(await client.pipelineMove({ record_id: r.id, to: "done", expected_version: r.version ?? null })).slice(0, 350));
}
