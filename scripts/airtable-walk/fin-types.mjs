import { store } from "./store.mjs";
const { client } = await store();
const [cust, jobs] = process.argv.slice(2);
const D = async (t, spec) => { const r = await client.fieldDeclare({ table_id: t, spec }); console.log(spec.key, r.ok ? "ok" : "FAIL " + r.error.message.slice(0, 200)); return r.ok; };
await D(cust, { key: "jobs_rel", label: "Jobs", type: "relation", relation_target: jobs });
await D(jobs, { key: "price", label: "Price", type: "formula", formula_text: "{Hours} * {Rate}" });
