// RECORD-PROVE: put the admin's user id on a person column of a row, retype the column to text (old value kept aside). node rp-keep4.mjs <table> <row> <key> <to>
import { store } from "../airtable-walk/store.mjs";
const [TB, ROW, KEY, TO] = process.argv.slice(2);
const { sb, client } = await store(); const ME = (await sb.auth.getUser()).data.user.id;
let f = (await client.fields({ table_id: TB })).data.find((x) => x.key === KEY);
if (!f) { const d = await client.fieldDeclare({ table_id: TB, spec: { key: KEY, label: "Ref " + KEY, type: "member", sort: 90 } }); console.log("declare", d.ok ? "ok" : JSON.stringify(d.error).slice(0, 200)); f = (await client.fields({ table_id: TB })).data.find((x) => x.key === KEY); }
const w = await client.recordUpdate({ record_id: ROW, patch: { [KEY]: ME } });
console.log("update", w.ok ? "ok" : JSON.stringify(w.error).slice(0, 300));
console.log("before", JSON.stringify((await client.recordRead({ record_id: ROW })).data?.document));
const r = await client.migrateRetype({ field_id: f.id, to: TO });
console.log("retype", r.ok ? "ok" : JSON.stringify(r.error).slice(0, 200));
console.log("after", JSON.stringify((await client.recordRead({ record_id: ROW })).data?.document));
