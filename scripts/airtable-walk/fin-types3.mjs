import { store } from "./store.mjs";
const { client } = await store();
const [cust, jobs] = process.argv.slice(2);
const cids = JSON.parse(process.env.CIDS), jids = JSON.parse(process.env.JIDS);
const D = async (t, spec) => { const r = await client.fieldDeclare({ table_id: t, spec }); console.log(spec.key, r.ok ? "ok" : "FAIL " + r.error.message.slice(0, 220)); return r.ok; };
await D(cust, { key: "jobs_m", label: "All jobs", type: "relation", relation_target: jobs, multi: true, relation_max: 20 });
const link = [[cids[0], [jids[0], jids[3]]], [cids[1], [jids[1]]], [cids[2], [jids[2], jids[4]]]];
for (const [c, js] of link) { const r = await client.recordUpdate({ record_id: c, patch: { jobs_m: js } }); console.log("link", r.ok ? "ok" : JSON.stringify(r.error).slice(0,200)); }
await D(cust, { key: "total", label: "Lifetime spend", type: "rollup", via: "jobs_m", of: "price", agg: "sum" });
await D(cust, { key: "njobs", label: "Job count", type: "count", via: "jobs_m" });
await D(jobs, { key: "pickup", label: "Pickup time", plain: "text", display_format: { id: "time" } });
const r = await client.listPage({ table_id: cust, limit: 10 });
for (const x of r.data.rows) console.log(JSON.stringify(x.document).slice(0, 400));
