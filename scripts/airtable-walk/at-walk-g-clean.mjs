// AT-WALK-G cleanup through the archive doors: forms, interfaces, automation, views, subscription rule, then every "ATWG " table in both orgs.
import { store } from "./store.mjs";
const ORGS = ["9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d", "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f"];
for (const org of ORGS) {
  process.env.WALK_ORG_ID = org;
  const { client } = await store();
  const tl = await client.tableList(); const mine = (tl.data ?? []).filter((t) => /^ATWG /.test(t.name));
  console.log(org.slice(0, 8), "tables:", mine.map((t) => t.id.slice(0, 8) + " " + t.name).join(" ; "));
  for (const t of mine) {
    const subs = await client.subscriptions({ table_id: t.id }); for (const s of subs.data ?? []) console.log("sub", s.name, JSON.stringify(await client.recordDelete({ record_id: s.rule_id })).slice(0, 60));
    const ds = await client.dashboards({ table_id: t.id }); for (const d of ds.data ?? []) if (/^ATWG /.test(d.name ?? "")) console.log("dashboard", d.name, JSON.stringify(await client.dashboardDelete({ dashboard_id: d.id })).slice(0, 60));
    const fm = await client.formList?.({ table_id: t.id }); for (const f of fm?.data ?? []) console.log("form", f.title, JSON.stringify(await client.formArchive({ form_id: f.id })).slice(0, 60));
    const vs = await client.views({ table_id: t.id }); for (const v of vs.data ?? []) if (/^ATWG /.test(v.name)) console.log("view", v.name, JSON.stringify(await client.viewArchive({ view_id: v.view_id })).slice(0, 60));
    const au = await client.automations?.({ table_id: t.id }); for (const a of au?.data ?? []) if (/^ATWG /.test(a.name)) console.log("automation", a.name, JSON.stringify(await client.automationArchive({ automation_id: a.id })).slice(0, 60));
    for (let i = 0; i < 40; i++) { const a = await client.tableArchive({ table_id: t.id, chunk: 2, includeTable: true }); if (!a.ok) { console.log(t.id.slice(0, 8), "ERR", JSON.stringify(a.error).slice(0, 100)); if (i > 4) break; continue; } if (a.data.done) { console.log(t.id.slice(0, 8), "archived"); break; } }
  }
}
