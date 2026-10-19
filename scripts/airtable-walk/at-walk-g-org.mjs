// AT-WALK-G: who is in the Template sweep (test) org, and is test@test.com a member?
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d";
const { sb } = await store();
const o = await sb.schema("organizations").from("organizations").select("id,name").eq("id", process.env.WALK_ORG_ID).maybeSingle();
console.log("org", JSON.stringify(o));
for (const t of ["organization_members","members"]) { const r = await sb.schema("organizations").from(t).select("*").eq("organization_id", process.env.WALK_ORG_ID).limit(20); console.log(t, r.error?.message ?? JSON.stringify(r.data?.map(x=>({u:x.user_id,r:x.role})))); }
