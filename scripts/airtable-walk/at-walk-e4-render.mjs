// node at-walk-e4-render.mjs <tableId> <recordId> : render each layout of the table for the record through the store as admin
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const t = await client.docTemplates({ table_id: process.argv[2] });
console.log("templates", JSON.stringify(t.ok ? t.data.map((x) => [x.id, x.name]) : t.error));
for (const x of t.data ?? []) { const r = await client.docRenderBody({ template_id: x.id, record_id: process.argv[3] }); console.log(JSON.stringify(r).slice(0, 700)); }
