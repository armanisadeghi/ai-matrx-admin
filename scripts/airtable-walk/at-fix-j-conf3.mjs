import { admin, member, say, must } from "./at-fix-j-lib.mjs";
const id = process.env.TABLE;
const a = await admin(); const m = await member();
const qty = must(await a.client.fields({ table_id: id }), "fields").find((f) => f.key === "qty");
must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: "confidential" } }), "set");
try {
  const page = await m.client.listPage({ table_id: id, limit: 5, offset: 0, sort: [], search: null, filter: {}, view_id: null });
  say("member rows level:", page.data.rows.map((r) => r.level), "qty:", page.data.rows.map((r) => r.document.qty));
  const rights = await m.client.tableRights?.({ table_id: id });
  say("member table rights", rights?.ok ? rights.data : rights);
  const r2 = await m.sb.schema("custom").rpc("read_records_page", { p_organization_id: (await import("./at-fix-j-lib.mjs")).ORG, p_table_id: id, p_filter: {}, p_search: null, p_sort: [], p_view_id: null, p_limit: 3, p_offset: 0 });
  say("raw page door:", JSON.stringify(r2.data).slice(0, 600));
} finally { must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: "internal" } }), "restore"); }
