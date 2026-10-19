import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { sb } = await store();
const r = await sb.schema("custom").rpc("formula_node_kinds");
if (r.error) console.log(JSON.stringify(r.error)); else for (const x of r.data.filter((x) => /map|filter|some|every|findfirst|index|current|at$|includes|median|split/i.test(JSON.stringify(x))).slice(0, 30)) console.log(JSON.stringify(x).slice(0, 300));
