import { store } from "./at-walk2-store.mjs"; import { T } from "./at-walk2-lib.mjs";
const { client } = await store();
const names = { 9500: "Holiday gala", 3200: "Closing dinner", 2400: "Annual partners lunch" };
const r = await client.list({ table_id: T.events, limit: 50 });
for (const row of r.data.rows) { const d = row.document; const patch = {}; if (d.menu !== "Seasonal buffet") patch.menu = "Seasonal buffet"; if (d.event === "Chef's tasting menu") patch.event = names[d.price]; if (Object.keys(patch).length) console.log(row.id.slice(0,6), JSON.stringify((await client.recordUpdate({ record_id: row.id, patch })).ok)); }
