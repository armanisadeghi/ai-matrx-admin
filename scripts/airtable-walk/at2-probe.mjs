import { ensureTable, createRecordsClient, supabaseDataSource } from "/tmp/at2s.VgpnrW/apps/shared/records/src/core/index.ts";
import { duplicateBase, snapshotBase, restoreSnapshot } from "/tmp/at2s.VgpnrW/apps/shared/records/src/base.ts";
import { store } from "./store.mjs";
const { sb, client: old } = await store();
const { data: au } = await sb.auth.getUser();
const client = createRecordsClient({ dataSource: supabaseDataSource(sb), organizationId: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", actor: { actor: "user", user_id: au.user.id, on_behalf_of: null } });
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const tag = Date.now().toString(36);
const p = await ensureTable(client, { name: "AT2 Projects " + tag, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }] });
const t = await ensureTable(client, { name: "AT2 Tasks " + tag, homeId: p.homeId, fields: [{ key: "task", label: "Task", type: "text", sort: 10 }, { key: "project", label: "Project", type: "relation", relationTarget: p.data, sort: 20 }] });
console.log("seed", p.ok, t.ok, p.homeId);
const fields = must(await client.fields({ table_id: t.data }), "f");
const fTask = fields.find((f) => f.key === "task");
const auto = await client.automationDeclare({ table_id: t.data, spec: { name: "Notice edits", trigger: { on: "property_edited", field: fTask.id }, actions: [{ do: "notify", to: { author: true }, text: "edited" }] } });
console.log("auto", JSON.stringify(auto).slice(0, 300));
const dash = await client.dashboardDeclare({ table_id: p.data, name: "Overview", blocks: [], presentation: { kind: "page" } });
console.log("dash", JSON.stringify(dash).slice(0, 200));
const port = {
  tableDuplicate: (a) => client.tableDuplicate(a), finish: (a) => client.baseCopyFinish(a),
  automations: (id) => client.automations({ table_id: id }), automationDeclare: (a) => client.automationDeclare(a), automationSetEnabled: (a) => client.automationSetEnabled(a),
  dashboards: (id) => client.dashboards({ table_id: id }), dashboardDeclare: (a) => client.dashboardDeclare(a),
  createHome: async (name) => { const k = must(await client.personKernelId(), "pk"); return client.recordWrite({ table_id: k, data: { name } }); },
  moveInto: (id, home) => client.recordReparent({ record_id: id, parent_id: home }),
  fieldsOf: (id) => client.fields({ table_id: id }), viewsOf: (id) => client.views({ table_id: id }),
  archive: async (id) => { for (let i = 0; i < 40; i++) { const r = await client.tableArchive({ table_id: id, chunk: 20, includeTable: true }); if (!r.ok || r.data.done) return r; } },
  unarchive: (id) => client.tableRestoreWhole({ table_id: id }),
};
const made = [p.data, t.data];
const homeOf = async () => Object.fromEntries(must(await client.tableList(), "list").filter((x) => x.name.includes(tag)).map((x) => [x.name, { home: x.home_id, kept: x.kept_for }]));
console.log("before", await homeOf());
const out = await duplicateBase(port, { organizationId: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", tables: [{ id: p.data, name: "AT2 Projects " + tag }, { id: t.data, name: "AT2 Tasks " + tag }], withRecords: true, nameFor: (x) => x.name + " (copy)", homeName: "AT2 base " + tag + " (copy)" });
console.log("dup", out.ok ? { home: out.data.homeId, autos: out.data.automations, pages: out.data.pages, refused: out.data.extrasRefused, cols: out.data.relinkedColumns } : out);
if (out.ok) made.push(...Object.values(out.data.pairs));
console.log("after dup", await homeOf());
const snap = await snapshotBase(port, { organizationId: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", tables: [{ id: p.data, name: "AT2 Projects " + tag }, { id: t.data, name: "AT2 Tasks " + tag }], label: "s" + tag });
console.log("snap", snap.ok);
console.log("after snap", await homeOf());
if (snap.ok) {
  const r = await restoreSnapshot(port, { organizationId: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", snapshot: snap.snapshot, baseName: "AT2 base " + tag });
  console.log("restore", r.ok ? { home: r.data.homeId, autos: r.data.automations, refused: r.data.extrasRefused } : r);
  if (r.ok) made.push(...Object.values(r.data.pairs));
  made.push(...snap.snapshot.tables.map((x) => x.snapshot_table_id));
}
console.log("final", await homeOf());
for (const x of must(await client.tableList(), "l")) if (x.name.includes(tag)) made.push(x.id);
for (const id of new Set(made)) for (let i = 0; i < 40; i++) { const r = await client.tableArchive({ table_id: id, chunk: 20, includeTable: true }); if (!r.ok || r.data.done) break; }
console.log("archived");
