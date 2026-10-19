import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d";
const { sb } = await store();
const r = await sb.schema("iam").from("organization_member").select("*").eq("user_id", "4060701e-706a-4c76-b3ca-0bbc69fa5a14").limit(50);
console.log(JSON.stringify(r.error ?? r.data?.map((x) => ({ o: x.organization_id, role: x.role, at: x.created_at }))));
const t = await sb.schema("iam").from("organization_member").select("user_id,role").eq("organization_id", process.env.WALK_ORG_ID).limit(30);
console.log(JSON.stringify(t.error ?? t.data));
