// seed a small table with a Status choice column for the kanban walk
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const tag = Date.now().toString(36);
const p = await ensureTable(client, { name: `ATWE6 board ${tag}`, fields: [{ key: "task", label: "Task", type: "text", sort: 10 }, { key: "status", label: "Status", type: "select", sort: 20, options: ["Todo", "Doing", "Done"] }] });
if (!p.ok) throw new Error(JSON.stringify(p.error));
console.log("TABLE", p.data, "HOME", p.homeId);
for (const [task, status] of [["Wash the van", "Todo"], ["Pack the order", "Doing"], ["Send invoice", "Done"]]) console.log(JSON.stringify(await client.recordWrite({ table_id: p.data, data: { task, status } })).slice(0, 80));
