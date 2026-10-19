// archive everything AT-WALK-E6 made: ATWE6 tables in admin's Workspace and the synced copy in Fairview People; then their Homes
import { store } from "./store.mjs";
const ADMIN = "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
process.env.WALK_ORG_ID = ADMIN;
const a = await store();
const { data: mem } = await a.sb.schema("users").from("organization_members").select("organization_id").eq("user_id", (await a.sb.auth.getUser()).data.user.id).limit(300);
const { data: orgs } = await a.sb.schema("organizations").from("organization").select("id,name").in("id", (mem ?? []).map((m) => m.organization_id).slice(0, 300)).ilike("name", "%Fairview%");
const orgIds = [ADMIN, ...(orgs ?? []).map((o) => o.id)];
console.log("orgs", JSON.stringify(orgIds));
for (const org of orgIds) {
  process.env.WALK_ORG_ID = org;
  const { client } = await store();
  const r = await client.tableList();
  if (!r.ok) { console.log(org, "list ERR", JSON.stringify(r.error).slice(0, 100)); continue; }
  const ts = r.data.filter((x) => x.name.includes("ATWE6") && !x.archived_at);
  const homes = new Set(ts.map((x) => x.parent_id).filter(Boolean));
  for (const t of ts) { for (let i = 0; i < 40; i++) { const x = await client.tableArchive({ table_id: t.id, chunk: 5, includeTable: true }); if (!x.ok) { console.log(t.id, "ERR", JSON.stringify(x.error).slice(0, 100)); if (i > 4) break; continue; } if (x.data.done) { console.log(t.name, t.id, "archived"); break; } } }
  for (const h of homes) console.log("home", h, JSON.stringify(await client.recordDelete({ record_id: h })).slice(0, 60));
}
