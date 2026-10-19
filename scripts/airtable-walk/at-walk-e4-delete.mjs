// node at-walk-e4-delete.mjs <recordId> : archive one record as admin (store door recordDelete)
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
console.log(JSON.stringify(await client.recordDelete({ record_id: process.argv[2] })).slice(0, 200));
