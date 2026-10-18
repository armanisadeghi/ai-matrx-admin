// AT-WALK-B: list tables (active org, or WALK_ORG_ID) whose name starts with a prefix (default "ATWB"), with org + home.
import { store } from "./store.mjs";
const { client, organizationId } = await store();
const pre = process.argv[2] ?? "ATWB";
const r = await client.tableList({});
console.log("org", organizationId, "ok", r.ok, "tables", r.data?.length);
for (const t of (r.data ?? []).filter((t) => (t.name ?? "").startsWith(pre))) console.log(t.id, "|", t.name, "| home", t.home_id, "| org", t.organization_id);
