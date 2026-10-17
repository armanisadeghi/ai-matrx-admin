import { store } from "./store.mjs";
const { client } = await store();
const jobs = "e740f9c2-4f45-4550-a66f-d77f5da413f7", jr = "5a31f12b-c2d3-4fa0-b99f-9c54c2a924e5";
const sk = () => "WO-" + Math.random().toString(36).slice(2, 8);
const show = (w, r) => console.log(w.padEnd(34), r.ok ? "OK " + JSON.stringify(r.data).slice(0, 100) : "REFUSED " + (r.error?.message ?? JSON.stringify(r.error)).slice(0, 160));
show("write w/o required sku", await client.recordWrite({ table_id: jobs, data: { job: "NoSku" } }));
const a = sk(); const w1 = await client.recordWrite({ table_id: jobs, data: { job: "Rules A", sku: a } }); show("write with sku", w1);
show("write duplicate sku", await client.recordWrite({ table_id: jobs, data: { job: "Rules B", sku: a } }));
const d = (await client.listPage({ table_id: jobs, limit: 100 })).data.rows.find((r) => r.id === w1.data).document; console.log("default priority:", JSON.stringify(d.pri), "modified_by in", JSON.stringify(d.edited_by));
// version conflict
const rec = await client.recordGet?.({ record_id: w1.data }); 
const ver = (await client.listPage({ table_id: jobs, limit: 100 })).data.rows.find((r) => r.id === w1.data);
console.log("row keys", Object.keys(ver).join(","));
const u1 = await client.recordUpdate({ record_id: w1.data, patch: { job: "Rules A2" }, expected_version: ver.version }); show("update w/ right version", u1);
const u2 = await client.recordUpdate({ record_id: w1.data, patch: { job: "Rules A3" }, expected_version: ver.version }); show("update w/ stale version", u2);
// archive and restore
const ar = await client.recordArchive?.({ record_id: w1.data }); if (ar) show("archive", ar); else console.log("no recordArchive; client has:", Object.keys(client).filter((k) => /archiv|restore|trash/i.test(k)).join(","));
