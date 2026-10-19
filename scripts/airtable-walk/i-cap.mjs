import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const r = await client.captureSheetDeclare({ table_id: "f636aadf-d252-4928-80ba-872bb5e1be21", title: "ATWI crew round", questions: [{ field: "name" }, { field: "qty" }] });
console.log(JSON.stringify(r));
if (r.ok) console.log(JSON.stringify(await client.capturePublish({ sheet_id: r.data, open: true })));
