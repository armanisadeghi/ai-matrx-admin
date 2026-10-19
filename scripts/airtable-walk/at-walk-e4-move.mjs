// node at-walk-e4-move.mjs <homeId> <targetOrgId>  : base move via the store door as admin (timed)
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const t = Date.now();
const r = await client.baseMove({ home_id: process.argv[2], to_organization_id: process.argv[3] });
console.log(((Date.now() - t) / 1000).toFixed(1) + "s", JSON.stringify(r).slice(0, 400));
