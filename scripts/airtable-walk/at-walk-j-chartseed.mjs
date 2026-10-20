// AT-WALK-J row 3 seed: a table with a multi-select Tags + an email Contact (3 of 6 rows name test@test.com), an interface with one bar chart by Tags, shared View to test@test.com.
import { ensureTable } from "@ai-matrx/records/core";
import { randomUUID } from "node:crypto";
import { store } from "./store.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const MEMBER = "4060701e-706a-4c76-b3ca-0bbc69fa5a14";
const { sb, client } = await store();
const tag = Date.now().toString(36).slice(-4);
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const retry = async (f) => { for (let i = 0; i < 30; i++) { const r = await f(); if (r.ok || !["timed_out", "internal"].includes(r.error?.code)) return r; await new Promise((z) => setTimeout(z, 15000)); } return await f(); };
const table = ok(await retry(() => ensureTable(client, { name: `ATWJ chart ${tag}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "tags", label: "Tags", type: "multi_select", options: ["Alpha", "Beta", "Gamma"], sort: 20 },
  { key: "contact", label: "Contact", type: "email", sort: 30 }] })), "table");
const rows = [["Delta", ["Alpha", "Beta"], 1], ["Charlie", ["Beta"], 1], ["Bravo", ["Alpha", "Beta", "Gamma"], 0], ["Alpha", ["Gamma"], 1], ["Echo", ["Alpha"], 0], ["Foxtrot", ["Beta", "Gamma"], 0]];
for (const [name, tags, mine] of rows) ok(await retry(() => client.recordWrite({ table_id: table, data: { name, tags, ...(mine ? { contact: "test@test.com" } : { contact: "other@example.com" }) } })), "row");
const id = () => randomUUID(); const CH = id();
const pages = [{ id: id(), name: "Overview", charts: [{ id: CH, title: "Rows by tag", subject: table, kind: "bar", groupBy: ["tags"], measures: [{ op: "count" }], span: 12 }], blocks: [{ id: CH, kind: "chart", span: 12 }] }];
const published = { pages, version: 1, at: new Date().toISOString(), by: null };
const iface = ok(await retry(() => client.dashboardDeclare({ table_id: table, name: `ATWJ chart interface ${tag}`, blocks: [{ id: CH, title: "Rows by tag", kind: "bar", group_by: ["tags"], measures: [{ op: "count" }], span: 12 }],
  presentation: { kind: "interface", icon: "layout-dashboard", color: "violet", draft: { pages }, published, versions: [published] }, dashboard_id: null })), "interface");
const g = await sb.schema("custom").rpc("share_grant", { p_organization_id: process.env.WALK_ORG_ID, p_subject_id: iface, p_principal_kind: "user", p_principal_id: MEMBER, p_level: "viewer" });
console.log(JSON.stringify({ tag, table, iface, share: g.error ? "ERR " + g.error.message : "ok" }));
