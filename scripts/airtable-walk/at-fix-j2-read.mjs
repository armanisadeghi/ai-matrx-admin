import { admin, say, must } from "./at-fix-j-lib.mjs";
const a = await admin();
const page = must(await a.client.listPage({ table_id: process.env.TABLE, limit: 20, offset: 0, sort: [], search: null, filter: {}, view_id: null }), "page");
for (const r of page.rows) say(JSON.stringify(r.document));
