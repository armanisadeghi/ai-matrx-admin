// CLOSE-SHARE CD-SHARE-06 check (live, no browser): a share of ONE record, then its revoke, closes every read door at once.
// Seeds a disposable table as admin@admin.com in WALK_ORG_ID (an organization test@test.com is NOT in, so a share is the
// only way in), shares the "Alpha" record with test@test.com at View, and asks the member through the grid read
// (records client listPage), a single-record read, REST v1 rows, REST v1 one row and the AI Dream "tables" MCP tool:
//   shared  -> Alpha is read at every door (positive control: a door that never opens proves nothing)
//   revoked -> every door refuses Alpha or returns nothing, and Bravo (never shared) is refused the same way throughout
// Archives its table in every case. Exits 1 on any failed check.
// WALK_ORG_ID=2643e470-b275-47f3-95f3-ae275ad3ca47 node scripts/airtable-walk/closeshare-record-revoke.mjs
import { admin, member, seedTable, say, must, ORG } from "./at-fix-j-lib.mjs";

const SERVER = process.env.SERVER ?? "https://server.app.matrxserver.com";
let failed = 0;
const check = (name, ok, detail) => { if (!ok) failed++; say(ok ? "PASS" : "FAIL", name, detail ?? ""); };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const a = await admin(); const m = await member();
say("admin", a.email, "member", m.email, "org", ORG);
const inOrg = await m.sb.schema("iam").from("memberships").select("user_id").eq("organization_id", ORG).eq("user_id", m.userId).eq("container_type", "organization").is("deleted_at", null);
if ((inOrg.data ?? []).length) { say("COULD NOT RUN: the member belongs to", ORG, "- pick an organization she is not in"); process.exit(2); }
// The agent's connection files its work in one of the member's OWN organizations (a call naming an organization she is not
// in is held by the MCP edge, by design); the tool still finds the Table in its own organization by id.
const mine = ((await m.sb.schema("iam").from("organization_member").select("organization_id").eq("user_id", m.userId)).data ?? []).map((r) => r.organization_id);
const live = mine.length ? ((await m.sb.schema("iam").from("organizations").select("id").in("id", mine.slice(0, 200)).is("archived_at", null).limit(1)).data ?? []) : [];
const MY_ORG = process.env.MEMBER_OWN_ORG ?? live[0]?.id;
say("the member's agent files its work in", MY_ORG);
if (!MY_ORG) { say("COULD NOT RUN: the member has no organization of her own"); process.exit(2); }
const id = await seedTable(a.client, "rec-revoke");
say("table", id);
try {
  const page = (c) => c.listPage({ table_id: id, limit: 10, offset: 0, sort: [], search: null, filter: {}, view_id: null });
  const rows = must(await page(a.client), "admin page").rows;
  const alpha = rows.find((r) => r.document?.name === "Alpha"); const bravo = rows.find((r) => r.document?.name === "Bravo");
  const token = (await m.sb.auth.getSession()).data.session.access_token;
  const http = async (path, init) => {
    const r = await fetch(SERVER + path, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json, text/event-stream", ...(init?.headers ?? {}) } });
    return { status: r.status, text: await r.text() };
  };
  const mcp = (args) => http("/matrx-mcp", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "tables", arguments: { organization_id: MY_ORG, table: id, ...args } } }) });

  async function doors(state, alphaSeen) {
    const p = await page(m.client);
    const names = p.ok ? p.data.rows.map((r) => r.document?.name) : [];
    check(`${state}: grid read ${alphaSeen ? "lists" : "does not list"} Alpha, never Bravo`, names.includes("Alpha") === alphaSeen && !names.includes("Bravo"), JSON.stringify(p.ok ? names : p.error));
    for (const [rec, seen] of [[alpha, alphaSeen], [bravo, false]]) {
      const one = await m.client.recordRead({ record_id: rec.id }).catch((e) => ({ ok: false, error: e.message }));
      const oneSees = !!(one.ok && one.data && JSON.stringify(one.data).includes(rec.document.name));
      check(`${state}: single-record read of ${rec.document.name} ${seen ? "opens" : "refuses"}`, oneSees === seen, one.ok ? "ok" : JSON.stringify(one.error).slice(0, 140));
      const r1 = await http(`/v1/tables/${id}/rows/${rec.id}`);
      check(`${state}: REST one row ${rec.document.name} ${seen ? "opens" : "refuses"}`, (r1.status === 200 && r1.text.includes(rec.document.name)) === seen, r1.status + " " + r1.text.slice(0, 140));
    }
    const rl = await http(`/v1/tables/${id}/rows?limit=10`);
    check(`${state}: REST rows ${alphaSeen ? "list" : "do not list"} Alpha, never Bravo`, rl.text.includes("Alpha") === alphaSeen && !rl.text.includes("Bravo"), rl.status + " " + rl.text.slice(0, 160));
    const mr = await mcp({ action: "list_rows", limit: 10 });
    check(`${state}: MCP tables list_rows ${alphaSeen ? "lists" : "does not list"} Alpha, never Bravo`, mr.status === 200 && mr.text.includes("Alpha") === alphaSeen && !mr.text.includes("Bravo"), mr.status + " " + mr.text.slice(0, 160));
  }

  await doors("before any share", false);
  const g = await a.sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: alpha.id, p_principal_kind: "person", p_principal_id: m.userId, p_level: "viewer" });
  check("admin shares the Alpha record with the member at View", !g.error, g.error?.message);
  await pause(2500);
  await doors("record shared", true);
  const rv = await a.sb.schema("custom").rpc("share_revoke", { p_organization_id: ORG, p_subject_id: alpha.id, p_principal_kind: "person", p_principal_id: m.userId });
  check("admin revokes the record share", !rv.error, rv.error?.message);
  await pause(2500);
  await doors("revoked", false);
} finally {
  try { const r = await a.client.tableArchive({ table_id: id }); say("archived", id, r.ok); } catch (e) { say("archive failed", e.message); }
}
say(failed ? `RED: ${failed} check(s) failed` : "GREEN: every check passed");
process.exitCode = failed ? 1 : 0;
