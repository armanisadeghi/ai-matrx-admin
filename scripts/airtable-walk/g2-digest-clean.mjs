// AT-FIX-G2: remove the disposable hourly rule and archive the disposable "G2 digest" tables (admin's Workspace).
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { client } = await store();
const tl = await client.tableList();
for (const t of (tl.data ?? []).filter((x) => /^G2 /.test(x.name))) {
  const subs = await client.subscriptions({ table_id: t.id });
  for (const s of subs.data ?? []) console.log("rule", s.name, "last_sent_at=" + s.last_sent_at, JSON.stringify(await client.recordDelete({ record_id: s.rule_id })).slice(0, 80));
  const vs = await client.views({ table_id: t.id });
  for (const v of vs.data ?? []) if (/^G2 /.test(v.name)) console.log("view", v.name, JSON.stringify(await client.viewArchive({ view_id: v.view_id })).slice(0, 60));
  for (let i = 0; i < 40; i++) { const a = await client.tableArchive({ table_id: t.id, chunk: 2, includeTable: true }); if (!a.ok) { console.log(t.id.slice(0, 8), "ERR", JSON.stringify(a.error).slice(0, 100)); if (i > 4) break; continue; } if (a.data.done) { console.log(t.id.slice(0, 8), t.name, "archived"); break; } }
}
