// AT-WALK-G seed in "Template sweep (test)": ATWG main table (typed fields, 4 rows), a form with a showIf question,
// an Interface with 4 pages (Dashboard / Elements / Edit grid / Form), shares to test@test.com. Prints ids as JSON.
// TABLE=<id> reuses a table made earlier (ensureTable returns {ok,data}).
import { ensureTable } from "@ai-matrx/records/core";
import { randomUUID } from "node:crypto";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d";
const MEMBER = "4060701e-706a-4c76-b3ca-0bbc69fa5a14";
const { sb, client } = await store();
const tag = Date.now().toString(36).slice(-4);
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
let table = process.env.TABLE;
if (!table) table = ok(await ensureTable(client, { name: `ATWG main ${tag}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "status", label: "Status", type: "select", options: ["Open", "Done"], sort: 20 },
  { key: "qty", label: "Qty", type: "number", sort: 30 },
  { key: "kind", label: "Kind", type: "select", options: ["Hardware", "Service"], sort: 40 },
  { key: "detail", label: "Detail", type: "text", sort: 50 }] }), "table");
const fields = ok(await client.fields({ table_id: table }), "fields");
const fid = (k) => fields.find((f) => f.key === k)?.id;
const rows = [["Alpha","Open",3,"Hardware","has a bolt"],["Bravo","Done",9,"Service",""],["Charlie","Open",5,"Hardware","has a nut"],["Delta","Open",1,"Service",""]];
const ids = [];
for (const [name,status,qty,kind,detail] of rows) { const d = { name, status, qty, kind }; if (detail) d.detail = detail; ids.push(ok(await client.recordWrite({ table_id: table, data: d }), "row")); }
const form_id = ok(await client.formDeclare({ table_id: table, title: "ATWG form", questions: [{ field: "name" }, { field: "kind" }, { field: "detail", showIf: { op: "eq", args: [{ field: fid("kind") }, { const: "Hardware" }] } }] }), "form");
const CH = randomUUID();
const id = () => randomUUID();
const pages = [
  { id: id(), name: "Dashboard", charts: [{ id: CH, title: "Rows by status", subject: table, kind: "bar", groupBy: ["status"], measures: [{ op: "count" }], span: 6 }], blocks: [
    { id: id(), kind: "heading", text: "Dashboard heading", span: 12 },
    { id: id(), kind: "number", title: "All rows", table_id: table, span: 3 },
    { id: id(), kind: "number", title: "Open rows", table_id: table, filter: { status: "Open" }, span: 3 },
    { id: CH, kind: "chart", span: 6 }] },
  { id: id(), name: "Elements", charts: [], blocks: [
    { id: id(), kind: "heading", text: "ATWG heading text", span: 12 },
    { id: id(), kind: "text", text: "ATWG body paragraph for the text element.", span: 12 },
    { id: id(), kind: "image", url: "https://www.gstatic.com/webp/gallery/1.jpg", alt: "ATWG image", span: 6 },
    { id: id(), kind: "embed", url: "https://example.com", title: "ATWG embed", span: 6 },
    { id: "L1", kind: "list", table_id: table, title: "ATWG list", columns: ["name", "status", "qty"], limit: 20, span: 12 },
    { id: "R1", kind: "record", source: "L1", span: 12 }] },
  { id: id(), name: "Edit grid", charts: [], blocks: [
    { id: id(), kind: "layout", layout: "grid", title: "ATWG grid", table_id: table, columns: ["name", "status", "qty"], span: 12 }] },
  { id: id(), name: "Form", charts: [], blocks: [
    { id: id(), kind: "form", table_id: table, form_id, span: 12 }] },
];
const published = { pages, version: 1, at: new Date().toISOString(), by: null };
const iface = ok(await client.dashboardDeclare({ table_id: table, name: `ATWG interface ${tag}`, blocks: [{ id: CH, title: "Rows by status", kind: "bar", group_by: ["status"], measures: [{ op: "count" }], span: 6 }],
  presentation: { kind: "interface", icon: "layout-dashboard", color: "violet", draft: { pages }, published, versions: [published] }, dashboard_id: null }), "interface");
const ORG = process.env.WALK_ORG_ID;
const share = async (rid, level) => { const g = await sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: rid, p_principal_kind: "user", p_principal_id: MEMBER, p_level: level }); return g.error ? "ERR " + g.error.message : "ok"; };
const shares = { table: await share(table, "editor"), iface: await share(iface, "viewer"), form: await share(form_id, "viewer") };
console.log(JSON.stringify({ tag, table, rows: ids, form_id, iface, pages: pages.map((p) => p.id), shares }));
