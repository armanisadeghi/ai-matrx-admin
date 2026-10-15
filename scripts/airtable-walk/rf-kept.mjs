// RECORD-FIXES item 2: put a person's user id on a row, then retype the column so the value is kept aside. node rf-kept.mjs <table> <row>
import { store } from "./store.mjs";
import { env } from "./lib.mjs";
const [TB, ROW] = process.argv.slice(2);
const { sb, client } = await store();
const fl = await client.fields({ table_id: TB });
const field = fl.data.find((f) => f.key === "referred_by");
console.log("field", field?.id, field?.type);
const w = await client.recordWrite({ record_id: ROW, table_id: TB, data: { referred_by: env.AI_ADMIN_USER_ID } });
console.log("write", w.ok ? "ok" : JSON.stringify(w.error).slice(0, 200));
const r = await client.migrateRetype({ field_id: field.id, to: "range" });
console.log("retype", r.ok ? JSON.stringify(r.data).slice(0, 200) : JSON.stringify(r.error).slice(0, 300));
const rr = await client.recordRead({ record_id: ROW });
console.log("retired", JSON.stringify(rr.data?.document?._retired ?? null).slice(0, 400));
