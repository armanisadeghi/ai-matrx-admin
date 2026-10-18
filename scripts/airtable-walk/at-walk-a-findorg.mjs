import { store } from "./store.mjs";
import { createRecordsClient, supabaseDataSource } from "@ai-matrx/records/core";
const { sb, client } = await store();
const { data: u } = await sb.auth.getUser();
const r = await sb.schema("organizations").from("organization_members").select("organization_id").eq("user_id", u.user.id).limit(300);
console.log("members", r.error?.message, r.data?.length);
const ids = (r.data ?? []).map((x) => x.organization_id);
for (const id of ids) {
  const c = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: id, actor: { actor: "user", user_id: u.user.id, on_behalf_of: null } });
  const t = await c.tableList(); if (t.ok && t.data.some((x) => x.id === process.argv[2])) {
    console.log("FOUND org", id);
    for (let i = 0; i < 40; i++) { const a = await c.tableArchive({ table_id: process.argv[2], chunk: 20, includeTable: true }); if (!a.ok || a.data.done) { console.log("archive", a.ok ? "done" : JSON.stringify(a.error).slice(0, 120)); break; } }
    break;
  }
}
