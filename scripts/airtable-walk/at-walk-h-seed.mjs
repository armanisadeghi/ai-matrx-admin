// AT-WALK-H seed in admin's Workspace: "ATWH main" (Name, Stage status Todo/Doing/Done, Qty) with 2 rows + a form, and "ATWH log" (Note, Qty) as the create-a-record target.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
import { must } from "./at-walk-h-lib.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const MEMBER = "4060701e-706a-4c76-b3ca-0bbc69fa5a14";
const { sb, client } = await store();
const tag = Date.now().toString(36).slice(-4);
const main = await ensureTable(client, { name: `ATWH main ${tag}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "stage", label: "Stage", type: "select", options: ["Todo", "Doing", "Done"], sort: 20 },
  { key: "qty", label: "Qty", type: "number", sort: 30 },
  { key: "owner_note", label: "Owner note", type: "text", sort: 40 }] });
if (!main.ok) throw new Error(JSON.stringify(main.error));
const log = await ensureTable(client, { name: `ATWH log ${tag}`, homeId: main.homeId, fields: [{ key: "note", label: "Note", type: "text", sort: 10 }, { key: "qty", label: "Qty", type: "number", sort: 20 }] });
if (!log.ok) throw new Error(JSON.stringify(log.error));
const rows = [];
for (const [name, stage, qty] of [["Alpha", "Todo", 3], ["Bravo", "Doing", 9]]) rows.push(must(await client.recordWrite({ table_id: main.data, data: { name, stage, qty } }), "row"));
const form_id = must(await client.formDeclare({ table_id: main.data, title: "ATWH intake", questions: [{ field: "name" }, { field: "qty" }] }), "form");
const g = await sb.schema("custom").rpc("share_grant", { p_organization_id: process.env.WALK_ORG_ID, p_subject_id: main.data, p_principal_kind: "user", p_principal_id: MEMBER, p_level: "editor" });
console.log(JSON.stringify({ tag, home: main.homeId, main: main.data, log: log.data, rows, form_id, share: g.error?.message ?? "ok" }));
