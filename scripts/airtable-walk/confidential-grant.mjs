// CONFIDENTIAL-GRANT TEST (live, lane confidential-grant, 2026-10-21). R23: "confidential -> hidden below admin unless
// granted; grants override". An explicit share of ONE column lets that person VIEW it at any share level; editing it
// needs a share that allows editing (viewer views only, editor views and edits).
// Seeds a disposable table as admin@admin.com, marks Qty Confidential, then walks test@test.com (a plain member) through
// four states and asks the grid read, the CSV export, REST v1 rows and the AI Dream "tables" MCP tool each time:
//   1. no share            -> Qty withheld at every door, an edit of Qty refused
//   2. viewer share        -> Qty read at every door, an edit of Qty refused
//   3. editor share        -> Qty read at every door, an edit of Qty lands
//   4. share revoked       -> Qty withheld at every door again
// It also checks that each share write moves the organization's access version (kept masks refresh).
// RED before migration confgrant_a_a_a_column_share_opens_it_at_any_level (a viewer or editor share did not open a
// Confidential column, which needs admin); GREEN after. Exits 1 on any failed check. Archives its table in every case.
// Usage: node scripts/airtable-walk/confidential-grant.mjs
import { admin, member, seedTable, say, must, ORG } from "./at-fix-j-lib.mjs";
const SERVER = process.env.SERVER ?? "https://server.app.matrxserver.com";
const QTY = /"q(?:ty)?"\s*:\s*(?:3|9|5|42)\b/i; // seeded Qty values 3, 9, 5; the editor's edit writes 42
let failed = 0;
const check = (name, ok, detail) => { if (!ok) failed++; say(ok ? "PASS" : "FAIL", name, detail ?? ""); };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const a = await admin(); const m = await member();
say("admin", a.email, "member", m.email, "org", ORG);
const id = await seedTable(a.client, "conf-grant");
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
  const page = (c) => c.listPage({ table_id: id, limit: 10, offset: 0, sort: [], search: null, filter: {}, view_id: null });
  const adminQty = async () => { const p = await page(a.client); return p.ok ? p.data.rows.map((r) => r.document?.qty ?? null).sort((x, y) => x - y) : null; };
  const firstRow = must(await page(a.client), "admin page").rows.find((r) => r.document?.name === "Alpha");
  const versions = async () => { const v = await a.sb.schema("custom").rpc("_access_versions", { p_organization_id: ORG }); return v.error ? null : JSON.stringify(v.data); };

  // every read door, as the member: expect Qty seen (true) or withheld (false)
  async function doors(state, seen) {
    const p = await page(m.client);
    const pq = p.ok ? p.data.rows.map((r) => r.document?.qty ?? null) : null;
    const pageSees = !!pq && pq.some((v) => v !== null);
    check(`${state}: grid read ${seen ? "shows" : "withholds"} Qty`, p.ok && p.data.rows.length === 3 && pageSees === seen, JSON.stringify(pq ?? p.error));
    const csv = await m.sb.schema("custom").rpc("io_export_csv", { p_organization_id: ORG, p_table_id: id });
    const csvText = (typeof csv.data === "string" ? csv.data : JSON.stringify(csv.data ?? "")).replace(/\d{4}-\d\d-\d\d[^,\n]*/g, "");
    const csvSees = /(^|,)(3|9|5|42)(,|\n|\r|$)/m.test(csvText);
    check(`${state}: CSV export ${seen ? "shows" : "withholds"} Qty`, !csv.error && csvSees === seen, csv.error?.message ?? csvText.slice(0, 160).replace(/\n/g, "\\n"));
    const rows = await http(`/v1/tables/${id}/rows?limit=10`);
    check(`${state}: REST rows ${seen ? "show" : "withhold"} Qty`, rows.status === 200 && QTY.test(rows.text) === seen, rows.status + " " + rows.text.slice(0, 160));
    const mrows = await mcp({ action: "list_rows", limit: 10 });
    const mtext = mrows.text.replace(/\\"/g, '"');
    check(`${state}: MCP tables list_rows ${seen ? "shows" : "withholds"} Qty`, mrows.status === 200 && /Alpha|Bravo|Charlie/.test(mtext) && QTY.test(mtext) === seen, mrows.status + " " + mrows.text.slice(0, 160));
  }
  // an edit of Qty on the Alpha row, as the member: expect it to land (true) or be refused (false)
  async function edit(state, lands, value) {
    const before = await adminQty();
    const r = await m.client.recordUpdate({ record_id: firstRow.id, patch: { qty: value } });
    const after = await adminQty();
    const landed = r.ok && JSON.stringify(after) !== JSON.stringify(before) && after.includes(value);
    check(`${state}: member edit of Qty ${lands ? "lands" : "is refused"}`, landed === lands, `${r.ok ? "ok" : "refused: " + (r.error?.message ?? JSON.stringify(r.error)).slice(0, 120)} admin sees ${JSON.stringify(after)}`);
  }
  async function share(level) {
    const v0 = await versions();
    const g = level
      ? await a.sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: qty.id, p_principal_kind: "person", p_principal_id: m.userId, p_level: level })
      : await a.sb.schema("custom").rpc("share_revoke", { p_organization_id: ORG, p_subject_id: qty.id, p_principal_kind: "person", p_principal_id: m.userId });
    const v1 = await versions();
    say(level ? `share Qty column with member at ${level}` : "revoke the member's Qty share", g.error ? "ERR " + g.error.message : "ok");
    if (g.error) failed++;
    if (v0 !== null) check(`${level ?? "revoke"}: the share write moves the access version`, v0 !== v1, `${v0} -> ${v1}`);
    else say("access version not readable as admin from the client; checked from the database instead");
    await pause(2500);
  }

  check("admin grid read shows Qty", JSON.stringify(await adminQty()) === "[3,5,9]");
  await doors("no share", false);
  await edit("no share", false, 41);
  await share("viewer");
  await doors("viewer share", true);
  await edit("viewer share", false, 41);
  await share("editor");
  await doors("editor share", true);
  await edit("editor share", true, 42);
  await share(null);
  await doors("revoked", false);
} finally {
  try { const r = await a.client.tableArchive({ table_id: id }); say("archived", id, r.ok); } catch (e) { say("archive failed", e.message); }
}
say(failed ? `RED: ${failed} check(s) failed` : "GREEN: every check passed");
process.exitCode = failed ? 1 : 0;
