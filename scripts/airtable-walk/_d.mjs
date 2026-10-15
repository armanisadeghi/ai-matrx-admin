import { store } from "./store.mjs"; import { T } from "./lib.mjs";
const { client } = await store();
const r = await client.dashboards({ table_id: T.events });
console.log(JSON.stringify(r.ok ? r.data : r.error, null, 1).slice(0, 2500));
const run = await client.dashboardRun({ dashboard_id: "6c5e70c9-5cf1-4193-845e-c6e8ff0c0108" });
console.log("RUN", JSON.stringify(run.ok ? run.data : run.error).slice(0, 700));
