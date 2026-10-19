// AT-WALK-E seed in admin's Workspace (WALK_ORG_ID): base "ATWE base" (Projects+Tasks, rows, link) and base "ATWE roster" (Person column, several allowed).
import { ensureTable, KERNEL_TABLES } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client, organizationId } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const tag = Date.now().toString(36).slice(-4);
const PERSON = KERNEL_TABLES.find((t) => t.name === "Person").id;
const p = await ensureTable(client, { name: `ATWE Projects ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "budget", label: "Budget", type: "number", sort: 20 }] });
if (!p.ok) throw new Error(JSON.stringify(p.error));
const t = await ensureTable(client, { name: `ATWE Tasks ${tag}`, homeId: p.homeId, fields: [{ key: "task", label: "Task", type: "text", sort: 10 }, { key: "project", label: "Project", type: "relation", relationTarget: p.data, sort: 20 }] });
if (!t.ok) throw new Error(JSON.stringify(t.error));
const pr = must(await client.recordWrite({ table_id: p.data, data: { name: "Rebrand", budget: 12000 } }), "row");
for (const task of ["Logo", "Palette"]) must(await client.recordWrite({ table_id: t.data, data: { task, project: pr } }), "row");
const r = await ensureTable(client, { name: `ATWE roster ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "owner", label: "Owner", type: "relation", relationTarget: PERSON, relationMax: 5, sort: 20 }] });
if (!r.ok) throw new Error(JSON.stringify(r.error));
must(await client.recordWrite({ table_id: r.data, data: { name: "Row A" } }), "row");
console.log(JSON.stringify({ org: organizationId, home: p.homeId, projects: p.data, tasks: t.data, roster: r.data, rosterHome: r.homeId, tag }));
