// AT-FIX-G1 item 5: an Interface dashboard archives directly through the dashboard door.
// Makes one table + one interface in the sweep org, archives the interface by its own door, reads it back, archives the table.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d";
const { client } = await store();
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const tag = Date.now().toString(36).slice(-4);
const table = ok(await ensureTable(client, { name: `ATFG1 door ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "table");
const published = { pages: [{ id: "p1", name: "Dashboard", charts: [], blocks: [{ id: "h1", kind: "heading", text: "x", span: 12 }] }], version: 1, at: new Date().toISOString(), by: null };
const iface = ok(await client.dashboardDeclare({ table_id: table, name: `ATFG1 interface ${tag}`, blocks: [], presentation: { kind: "interface", icon: "layout-dashboard", color: "violet", draft: { pages: published.pages }, published, versions: [published] }, dashboard_id: null }), "interface");
const del = await client.dashboardDelete({ dashboard_id: iface });
console.log("dashboardDelete:", JSON.stringify(del));
const left = await client.dashboards({ table_id: table });
console.log("still listed:", JSON.stringify((Array.isArray(left.data) ? left.data : left.data?.dashboards ?? []).map((d) => d.id === iface)));
for (let i = 0; i < 20; i++) { const a = await client.tableArchive({ table_id: table, chunk: 2, includeTable: true }); if (a.ok && a.data.done) { console.log("table archived"); break; } }
process.exit(del.ok ? 0 : 1);
