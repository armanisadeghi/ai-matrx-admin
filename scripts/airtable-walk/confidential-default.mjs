// CONFIDENTIAL-DEFAULT TEST (live, lane confidential-default, 2026-10-20). Arman's ruling: a column marked Confidential is
// hidden below admin unless someone is granted it (knob custom/field_sensitivity_levels read.confidential = admin).
// Seeds a disposable table as admin@admin.com, marks Qty Confidential, then asks every door as test@test.com (a plain
// member) whether a Qty value comes back: the store's page read (grid), the CSV export (custom.io_export_csv; custom.export_records is not a client door), a chart (aggregate), the REST v1
// rows + aggregate, and the AI Dream "tables" MCP tool. Then: the admin still reads Qty, and the member reads it once the
// Qty column record is shared with her. Exits 1 on any failed check. RED before migration 20261020140000_confdef_a_a_*
// (the member read Qty from Editor up); GREEN after. Archives its table in every case.
// Usage: node scripts/airtable-walk/confidential-default.mjs [grant-level, default admin]
import { admin, member, seedTable, say, must, ORG } from "./at-fix-j-lib.mjs";
const SERVER = process.env.SERVER ?? "https://server.app.matrxserver.com";
const GRANT = process.argv[2] ?? "admin";
const QTY = /"q(?:ty)?"\s*:\s*(?:3|9|5)\b/i; // the seeded Qty values are 3, 9, 5 (sum 17)
let failed = 0;
const check = (name, ok, detail) => { if (!ok) failed++; say(ok ? "PASS" : "FAIL", name, detail ?? ""); };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const a = await admin(); const m = await member();
say("admin", a.email, "member", m.email, "org", ORG);
const id = await seedTable(a.client, "conf-default");
say("table", id);
try {
  const qty = must(await a.client.fields({ table_id: id }), "fields").find((f) => f.key === "qty");
  must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: "confidential" } }), "set confidential");
  await pause(2500);
  const token = (await m.sb.auth.getSession()).data.session.access_token;
  const http = async (path, init) => {
    const r = await fetch(SERVER + path, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json, text/event-stream", ...(init?.headers ?? {}) } });
    return { status: r.status, text: await r.text() };
  };
  const mcp = (args) => http("/matrx-mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "tables", arguments: { organization_id: ORG, table: id, ...args } } }) });

  // MEMBER — every door withholds Qty
  const page = await m.client.listPage({ table_id: id, limit: 10, offset: 0, sort: [], search: null, filter: {}, view_id: null });
  const pageQty = page.ok ? page.data.rows.map((r) => r.document?.qty ?? null) : null;
  check("member grid read withholds Qty", page.ok && page.data.rows.length === 3 && pageQty.every((v) => v === null), JSON.stringify(pageQty ?? page.error));
  const csv = await m.sb.schema("custom").rpc("io_export_csv", { p_organization_id: ORG, p_table_id: id });
  const csvText = typeof csv.data === "string" ? csv.data : JSON.stringify(csv.data);
  check("member CSV export withholds Qty", !csv.error && !/,(3|9|5)(,|\n|\r|$)/m.test(csvText.replace(/\d{4}-\d\d-\d\d[^,\n]*/g, "")), csv.error?.message ?? csvText.slice(0, 200));
  const sum = await m.client.recordAggregate({ table_id: id, measures: [{ op: "sum", key: "qty" }] });
  check("member chart sum(Qty) withheld", !(sum.ok && /\b17\b/.test(JSON.stringify(sum.data))), JSON.stringify(sum.ok ? sum.data : sum.error).slice(0, 200));
  const rows = await http(`/v1/tables/${id}/rows?limit=10`);
  check("member REST rows withhold Qty", rows.status === 200 && !QTY.test(rows.text), rows.status + " " + rows.text.slice(0, 200));
  const restAgg = await http(`/v1/tables/${id}/aggregate`, { method: "POST", body: JSON.stringify({ measure: "sum", column: "Qty" }) });
  check("member REST aggregate sum(Qty) withheld", !/\b17\b/.test(restAgg.text), restAgg.status + " " + restAgg.text.slice(0, 200));
  const mrows = await mcp({ action: "list_rows", limit: 10 });
  check("member MCP tables list_rows withholds Qty", mrows.status === 200 && /Alpha|Bravo|Charlie/.test(mrows.text) && !QTY.test(mrows.text.replace(/\\"/g, '"')), mrows.status + " " + mrows.text.slice(0, 200));
  const magg = await mcp({ action: "aggregate", measure: "sum", column: "Qty" });
  check("member MCP tables aggregate sum(Qty) withheld", !/\b17\b/.test(magg.text), magg.status + " " + magg.text.slice(0, 200));

  // ADMIN — still reads it
  const apage = await a.client.listPage({ table_id: id, limit: 10, offset: 0, sort: [], search: null, filter: {}, view_id: null });
  const aQty = apage.ok ? apage.data.rows.map((r) => r.document?.qty ?? null).sort() : null;
  check("admin grid read shows Qty", JSON.stringify(aQty) === "[3,5,9]", JSON.stringify(aQty ?? apage.error));

  // MEMBER WITH A GRANT on the Qty column — reads it
  const g = await a.sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: qty.id, p_principal_kind: "person", p_principal_id: m.userId, p_level: GRANT });
  say("share Qty column with member at", GRANT, g.error ? "ERR " + g.error.message : "ok");
  await pause(2500);
  const gpage = await m.client.listPage({ table_id: id, limit: 10, offset: 0, sort: [], search: null, filter: {}, view_id: null });
  const gQty = gpage.ok ? gpage.data.rows.map((r) => r.document?.qty ?? null).sort() : null;
  check(`granted member (${GRANT} share on the column) reads Qty`, JSON.stringify(gQty) === "[3,5,9]", JSON.stringify(gQty ?? gpage.error));
} finally {
  try { const r = await a.client.tableArchive({ table_id: id }); say("archived", id, r.ok); } catch (e) { say("archive failed", e.message); }
}
say(failed ? `RED: ${failed} check(s) failed` : "GREEN: every check passed");
process.exitCode = failed ? 1 : 0;
