// CLOSE-SHARE CD-SHARE-05 walk: a grant on ONE record lifts a column restriction for that record only.
// Seeds a disposable table as admin@admin.com, sets Qty to "Administrators only" (sensitivity=restricted), shares the Alpha
// record with test@test.com (a plain member) at Full access, then reads as the member through the store's grid read, REST v1
// rows, the AI Dream "tables" MCP tool and the grid in a headless browser: Alpha shows its Qty (3); Bravo and Charlie say
// withheld. Revokes the share and archives the table in every case. Exits 1 on a failed check.
// ORIGIN=https://www.aimatrx.com node scripts/airtable-walk/closeshare-record-lifts-column.mjs
import { admin, member, seedTable, say, must, ORG } from "./at-fix-j-lib.mjs";
import { open as openBrowser, ORIGIN } from "./at-fix-j2-lib.mjs";

const SERVER = process.env.SERVER ?? "https://server.app.matrxserver.com";
const SHOT = process.env.HOME + "/lane-resume/closeshare/shots/";
let bad = 0;
const check = (ok, what, detail) => { if (!ok) bad++; say(ok ? "PASS" : "FAIL", what, detail ?? ""); };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const a = await admin(); const m = await member();
const id = await seedTable(a.client, "record-lifts");
say("org", ORG, "table", id);
let alpha, M;
try {
  const qty = must(await a.client.fields({ table_id: id }), "fields").find((f) => f.key === "qty");
  must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: "restricted" } }), "set restricted");
  const page = (c) => c.listPage({ table_id: id, limit: 10, offset: 0, sort: [], search: null, filter: {}, view_id: null });
  alpha = must(await page(a.client), "admin page").rows.find((r) => r.document?.name === "Alpha");
  const g = await a.sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: alpha.id, p_principal_kind: "person", p_principal_id: m.userId, p_level: "admin" });
  check(!g.error, "admin shares the Alpha record with the member at Full access", g.error?.message ?? g.data?.message);
  await pause(2500);

  const byName = (rows, get) => Object.fromEntries(rows.map((r) => [get(r).name, get(r).qty]));
  const want = (seen) => seen.Alpha === 3 && seen.Bravo == null && seen.Charlie == null;
  const p = await page(m.client);
  const pq = p.ok ? byName(p.data.rows, (r) => ({ name: r.document?.name, qty: r.document?.qty ?? null })) : p.error;
  check(p.ok && want(pq), "grid read: Alpha shows Qty, Bravo and Charlie withhold it", pq);

  const token = (await m.sb.auth.getSession()).data.session.access_token;
  const http = async (path, init) => {
    const r = await fetch(SERVER + path, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json, text/event-stream", ...(init?.headers ?? {}) } });
    return { status: r.status, text: await r.text() };
  };
  const rest = await http(`/v1/tables/${id}/rows?limit=10`);
  let rq = null;
  try { rq = byName(JSON.parse(rest.text).rows, (r) => ({ name: r.values?.Name, qty: r.values?.Qty ?? null })); } catch { rq = rest.text.slice(0, 200); }
  check(rest.status === 200 && rq && want(rq), "REST rows: Alpha shows Qty, Bravo and Charlie withhold it", `${rest.status} ${JSON.stringify(rq)}`);

  const mcp = await http("/matrx-mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "tables", arguments: { organization_id: ORG, table: id, action: "list_rows", limit: 10 } } }) });
  let mq = null;
  try { const body = JSON.parse(mcp.text.replace(/^[\s\S]*?(\{"jsonrpc")/, "$1").split("\n")[0]); mq = byName(body.result.structuredContent.rows, (r) => ({ name: r.values?.Name, qty: r.values?.Qty ?? null })); } catch { mq = mcp.text.slice(0, 200); }
  check(mcp.status === 200 && mq && want(mq), "MCP tables list_rows: Alpha shows Qty, Bravo and Charlie withhold it", `${mcp.status} ${JSON.stringify(mq)}`);

  M = await openBrowser(true);
  check(M.who === "test@test.com", "member browser signed in", M.who);
  await M.page.goto(`${ORIGIN}/data/${id}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await M.page.waitForSelector("[data-table-toolbar]", { timeout: 240000 });
  await M.page.getByText("Charlie", { exact: true }).first().waitFor({ timeout: 120000 });
  await M.page.waitForTimeout(3000);
  const lines = await M.page.evaluate(() => [...document.querySelectorAll("[role=row], tr")].map((r) => r.innerText.replace(/\s+/g, " ").trim()).filter((t) => /^(Alpha|Bravo|Charlie)\b/.test(t)));
  say("member grid rows", lines);
  await M.page.screenshot({ path: SHOT + "05-member-grid.png" });
  const row = (n) => lines.find((l) => l.startsWith(n)) ?? "";
  check(/^Alpha 3\b/.test(row("Alpha")) && !/Withheld/i.test(row("Alpha")), "member grid: Alpha shows Qty 3", row("Alpha"));
  check(/Withheld/i.test(row("Bravo")) && /Withheld/i.test(row("Charlie")) && !/\b9\b/.test(row("Bravo")) && !/\b5\b/.test(row("Charlie")), "member grid: Bravo and Charlie say Withheld", [row("Bravo"), row("Charlie")]);
} finally {
  if (alpha) { const r = await a.sb.schema("custom").rpc("share_revoke", { p_organization_id: ORG, p_subject_id: alpha.id, p_principal_kind: "person", p_principal_id: m.userId }); say("share revoked", r.error?.message ?? "ok"); }
  try { const t = await a.client.tableArchive({ table_id: id }); say("archived", id, t.ok); } catch (e) { say("archive failed", e.message); }
  await M?.browser.close().catch(() => {});
}
say(bad ? `RED: ${bad} failed` : "GREEN");
process.exit(bad ? 1 : 0);
