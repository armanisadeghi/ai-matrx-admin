// CLOSE-SHARE CD-SHARE-08 walk (headless, own preview host): a View holder asks for edit access and the owner says yes in
// the message the ask sent them. Seeds a disposable table as admin in WALK_ORG_ID (an organization test@test.com is not in),
// shares it with the member at View, then:
//   member: /data/<id> > Request edit access > Ask      -> "Asked. You will hear back here."
//   admin:  /messages > the member's message > Let them edit
//   member: holds Edit now (custom.my_level) and an edit of a cell saves; the Request edit access control is gone.
// Archives the table and revokes the share at the end. Exits 1 on a failed check.
// WALK_ORG_ID=2643e470-b275-47f3-95f3-ae275ad3ca47 MATRX_PREVIEW_SESSION=close-share ORIGIN=http://close-share.localhost:3001 \
//   node scripts/airtable-walk/closeshare-request-edit.mjs
import { admin, member, seedTable, say, must, ORG } from "./at-fix-j-lib.mjs";
import { open as openBrowser, ORIGIN } from "./at-fix-j2-lib.mjs";

const SHOT = process.env.HOME + "/lane-resume/closeshare/shots/";
let bad = 0;
const check = (ok, what, detail) => { if (!ok) bad++; say(ok ? "PASS" : "FAIL", what, detail ?? ""); };

const a = await admin();
const m = await member();
const id = await seedTable(a.client, "req-edit");
say("org", ORG, "table", id);
const level = async () => {
  const r = await m.sb.schema("custom").rpc("my_level", { p_organization_id: ORG, p_id: id, p_type: "table" });
  return r.error ? "ERR " + r.error.message : r.data;
};
let A, M;
try {
  const g = await a.sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: id, p_principal_kind: "person", p_principal_id: m.userId, p_level: "viewer" });
  check(!g.error, "admin shares the table with the member at View", g.error?.message);
  const l0 = await level();
  check(l0 === "viewer", "member holds View before asking", l0);

  M = await openBrowser(true);
  check(M.who === "test@test.com", "member browser signed in", M.who);
  await M.page.goto(`${ORIGIN}/data/${id}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await M.page.waitForSelector("[data-request-edit-access]", { timeout: 240000 });
  await M.page.locator("[data-request-edit-access]").first().click();
  await M.page.getByRole("button", { name: /^Ask/ }).last().click();
  await M.page.waitForSelector("[data-request-edit-access-said]", { timeout: 60000 }).catch(() => {});
  const said = await M.page.locator("[data-request-edit-access-said]").first().textContent().catch(() => null);
  check(/Asked/.test(said ?? ""), "member asked for edit access", said);
  await M.page.screenshot({ path: SHOT + "08-1-asked.png" });

  A = await openBrowser(false);
  check(A.who === "admin@admin.com", "admin browser signed in", A.who);
  await A.page.goto(`${ORIGIN}/messages`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await A.page.waitForTimeout(8000);
  // The newest conversation carries the ask; open the one with the member.
  const conv = A.page.getByText(/^test$/).first();
  if (await conv.count()) await conv.click().catch(() => {});
  const yes = A.page.getByRole("button", { name: /Let them edit/ }).locator("visible=true").last();
  await yes.waitFor({ timeout: 120000 });
  await A.page.screenshot({ path: SHOT + "08-2-owner-message.png" });
  await yes.click();
  await A.page.getByText(/Access granted/).locator("visible=true").first().waitFor({ timeout: 30000 }).catch(() => {});
  const answered = await A.page.getByText(/Access granted/).locator("visible=true").count();
  say("admin console errors", A.errs.slice(-5));
  check(answered > 0, "owner's message says Access granted", answered);
  await A.page.screenshot({ path: SHOT + "08-3-granted.png" });

  const l1 = await level();
  check(l1 === "editor", "member holds Edit after the yes", l1);
  const rows = must(await m.client.listPage({ table_id: id, limit: 10, offset: 0, sort: [], search: null, filter: {}, view_id: null }), "member rows");
  const row = rows.rows[0];
  const w = await m.client.recordUpdate({ record_id: row.id, patch: { qty: 77 } });
  check(w.ok, "member's edit of a cell saves", w.ok ? "ok" : JSON.stringify(w.error));
  await M.page.reload({ waitUntil: "domcontentloaded" });
  await M.page.waitForSelector("[data-table-toolbar]", { timeout: 240000 });
  await M.page.waitForTimeout(4000);
  const still = await M.page.locator("[data-request-edit-access]").count();
  check(still === 0, "Request edit access is gone for the member", still);
  await M.page.screenshot({ path: SHOT + "08-4-member-after.png" });
} finally {
  try { await a.sb.schema("custom").rpc("share_revoke", { p_organization_id: ORG, p_subject_id: id, p_principal_kind: "person", p_principal_id: m.userId }); } catch { /* the archive below puts the table away either way */ }
  try { const r = await a.client.tableArchive({ table_id: id }); say("archived", id, r.ok); } catch (e) { say("archive failed", e.message); }
  await A?.browser.close().catch(() => {});
  await M?.browser.close().catch(() => {});
}
say(bad ? `RED: ${bad} failed` : "GREEN");
process.exit(bad ? 1 : 0);
