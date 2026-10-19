// AT-WALK-E3: assign Owner people on ROW of TABLE: STEP=1 -> test@test.com only; STEP=2 -> test@test.com + Studio Admin. Prints the ids.
import { KERNEL_TABLES } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client, sb } = await store();
const PERSON = KERNEL_TABLES.find((t) => t.name === "Person").id;
const retry = async (f, w) => { for (let i = 0; i < 5; i++) { const r = await f(); if (r.ok) return r.data; console.log(w, "retry", JSON.stringify(r.error).slice(0, 150)); } throw new Error(w); };
const T = process.env.TABLE, ROW = process.env.ROW;
const test = await retry(() => client.recordWrite({ table_id: PERSON, data: { user_id: "4060701e-706a-4c76-b3ca-0bbc69fa5a14", full_name: "Test User", email: "test@test.com" } }), "test person");
const admin = await retry(() => client.recordWrite({ table_id: PERSON, data: { user_id: "87a6e699-3622-4869-8843-d0867456c0dd", full_name: "Studio Admin", email: "admin@admin.com" } }), "admin person");
console.log(JSON.stringify({ test, admin }));
const val = process.env.STEP === "2" ? [test, admin] : [test];
const r = await client.recordUpdate({ table_id: T, record_id: ROW, patch: { owner: val } });
console.log(JSON.stringify(r).slice(0, 300));
