// AT-WALK-E4 seed (admin's Workspace): three bases for the base-move walk: plain unnamed, two tables linked to each other, and one linking to a table outside it.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const tag = Date.now().toString(36).slice(-4);
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r; };
const plain = ok(await ensureTable(client, { name: `ATWE4 plain ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "plain");
await client.recordWrite({ table_id: plain.data, data: { name: "one" } });
const p = ok(await ensureTable(client, { name: `ATWE4 Projects ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "p");
const t = ok(await ensureTable(client, { name: `ATWE4 Tasks ${tag}`, homeId: p.homeId, fields: [{ key: "task", label: "Task", type: "text", sort: 10 }, { key: "project", label: "Project", type: "relation", relationTarget: p.data, sort: 20 }] }), "t");
const pr = ok(await client.recordWrite({ table_id: p.data, data: { name: "Rebrand" } }), "row").data;
await client.recordWrite({ table_id: t.data, data: { task: "Logo", project: pr } });
const outside = ok(await ensureTable(client, { name: `ATWE4 Outside Clients ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] }), "o");
const linker = ok(await ensureTable(client, { name: `ATWE4 Linker ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "client", label: "Client", type: "relation", relationTarget: outside.data, sort: 20 }] }), "l");
console.log(JSON.stringify({ tag, plain: [plain.homeId, plain.data], projects: [p.homeId, p.data], tasks: t.data, outside: [outside.homeId, outside.data], linker: [linker.homeId, linker.data] }));
