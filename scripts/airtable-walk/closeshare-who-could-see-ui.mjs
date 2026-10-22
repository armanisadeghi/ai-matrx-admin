// CLOSE-SHARE CD-SHARE-14 walk (headless, own preview host): "Who could see this on…" in a record's Share window.
// Seeds a disposable table as admin@admin.com in WALK_ORG_ID (an organization test@test.com is NOT in, so a record share is
// the only way she sees anything), shares the Alpha record with her at View, waits, notes the moment, revokes the share,
// then opens Alpha's Share window in the browser, asks about the noted moment and expects her name marked "No access now".
// Archives its table in every case.
// WALK_ORG_ID=2643e470-b275-47f3-95f3-ae275ad3ca47 MATRX_PREVIEW_SESSION=close-share ORIGIN=http://close-share.localhost:3001 \
//   node scripts/airtable-walk/closeshare-who-could-see-ui.mjs
import { admin, member, seedTable, say, must, ORG } from "./at-fix-j-lib.mjs";
import { open as openBrowser, gotoTable } from "./at-fix-j2-lib.mjs";

const SHOT = process.env.HOME + "/lane-resume/closeshare/shots/";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
const check = (ok, what, detail) => { if (!ok) bad++; say(ok ? "PASS" : "FAIL", what, detail ?? ""); };

const a = await admin(); const m = await member();
const id = await seedTable(a.client, "who-could-see");
say("org", ORG, "table", id);
let A;
try {
  const rows = must(await a.client.listPage({ table_id: id, limit: 10, offset: 0, sort: [], search: null, filter: {}, view_id: null }), "page").rows;
  const alpha = rows.find((r) => r.document?.name === "Alpha");
  const g = await a.sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: alpha.id, p_principal_kind: "person", p_principal_id: m.userId, p_level: "viewer" });
  check(!g.error, "admin shares Alpha with the member at View", g.error?.message);
  // The field names a minute (yyyy-mm-ddTHH:mm), so the share is held across the next whole minute and that minute is asked.
  const moment = new Date(Math.ceil((Date.now() + 1000) / 60000) * 60000);
  await pause(moment.getTime() - Date.now() + 5000);
  const rv = await a.sb.schema("custom").rpc("share_revoke", { p_organization_id: ORG, p_subject_id: alpha.id, p_principal_kind: "person", p_principal_id: m.userId });
  check(!rv.error, "admin revokes the share", rv.error?.message);
  say("moment in between", moment.toISOString());

  A = await openBrowser(false);
  check(A.who === "admin@admin.com", "admin browser signed in", A.who);
  await gotoTable(A.page, id);
  await A.page.getByText("Alpha", { exact: true }).first().dblclick();
  // The record opens beside the grid with its own Share; wait for it, or the table's Share (the only one) would be pressed.
  await A.page.waitForFunction(() => [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Share").length >= 2, null, { timeout: 120000 });
  await A.page.waitForTimeout(1500);
  await A.page.screenshot({ path: SHOT + "14-0-record-open.png" });
  say("share buttons", await A.page.getByRole("button", { name: /Share/ }).evaluateAll((els) => els.map((e) => ({ text: e.textContent.trim(), label: e.getAttribute("aria-label"), inDialog: !!e.closest("[role=dialog]") }))));
  await A.page.getByRole("button", { name: "Share", exact: true }).last().click();
  // "Who could see this on…" sits in the Share window's Access tab, under who has access today.
  await A.page.getByRole("tab", { name: /Access/ }).last().click({ timeout: 60000 }).catch(async (e) => { await A.page.screenshot({ path: SHOT + "14-0-no-access-tab.png" }); throw e; });
  const section = A.page.locator("[data-who-could-see-on]").first();
  await section.waitFor({ timeout: 120000 }).catch(async (e) => { await A.page.screenshot({ path: SHOT + "14-0-no-section.png" }); throw e; });
  await section.scrollIntoViewIfNeeded();
  // The moment field is the design system's DateTimeField: a datetime-local value in the browser's own zone.
  const local = await A.page.evaluate((iso) => { const d = new Date(iso); const p = (n) => String(n).padStart(2, "0"); return [`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, `${p(d.getHours())}:${p(d.getMinutes())}`]; }, moment.toISOString());
  const inputs = section.locator("input");
  say("moment field inputs", await inputs.count(), "values to enter", local);
  await inputs.nth(0).click(); await inputs.nth(0).fill(local[0]); await A.page.keyboard.press("Tab");
  if ((await inputs.count()) > 1) { await inputs.nth(1).click(); await inputs.nth(1).fill(local[1]); await A.page.keyboard.press("Tab"); }
  await A.page.waitForTimeout(800);
  const asked = [];
  A.page.on("request", (r) => { if (r.url().includes("who_could_see_on")) asked.push(r.postData()); });
  say("moment field shows", await inputs.evaluateAll((els) => els.map((e) => e.value)));
  await section.locator("[data-who-could-see-ask]").click();
  await A.page.waitForTimeout(6000);
  const answer = await section.evaluate((s) => ({
    people: [...s.querySelectorAll("[data-who-could-see-person]")].map((li) => ({ id: li.getAttribute("data-who-could-see-person"), text: li.textContent, lost: !!li.querySelector("[data-who-could-see-lost]") })),
    error: s.querySelector("[data-who-could-see-error]")?.textContent ?? null,
  }));
  say("asked", asked);
  say("answer", answer);
  await A.page.screenshot({ path: SHOT + "14-1-who-could-see.png" });
  const her = answer.people.find((p) => p.id === m.userId);
  check(!answer.error, "the question is answered, not refused", answer.error);
  check(!!her, "the member is listed for the moment she held the share", her?.text);
  check(her?.lost === true, "she is marked No access now", her?.text);
} finally {
  try { const t = await a.client.tableArchive({ table_id: id }); say("archived", id, t.ok); } catch (e) { say("archive failed", e.message); }
  await A?.browser.close().catch(() => {});
}
say(bad ? `RED: ${bad} failed` : "GREEN");
process.exit(bad ? 1 : 0);
