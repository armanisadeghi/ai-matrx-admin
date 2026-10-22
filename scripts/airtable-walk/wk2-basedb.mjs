import { admin, say } from "./at-fix-j-lib.mjs";
const { sb } = await admin();
const r = await sb.schema("custom").from("base").select("id,name,home_id,deleted_at,organization_id").or(`home_id.eq.dc452837-7385-4c05-9ec7-4b42b80f5a0a,id.eq.dc452837-7385-4c05-9ec7-4b42b80f5a0a`);
say(r.error ?? r.data);
process.exit(0);
