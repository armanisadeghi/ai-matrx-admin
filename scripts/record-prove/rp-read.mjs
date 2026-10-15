import { store } from "../airtable-walk/store.mjs";
const [ROW, TB] = process.argv.slice(2);
const { client } = await store();
const r = await client.recordRead({ record_id: ROW });
console.log(JSON.stringify(r.ok ? { doc: r.data.document, hidden: r.data.hidden, keys: Object.keys(r.data) } : r.error).slice(0, 900));
const f = await client.fields({ table_id: TB });
console.log(JSON.stringify(f.data.map((x) => [x.key, x.type, x.retired_at ?? x.retired ?? ""])));
