// CLOSE-SHARE CD-SHARE-15 walk (headless, own preview host): the organization's "What membership alone confers" setting
// (knob custom / member_default_level) is changed on the organization's Configuration page, read back after a reload, and
// applied: the member's level on a fresh table follows it. The setting is put back to inherit at the end.
// WALK_ORG_ID=<an org admin owns where test@test.com is a plain member> MATRX_PREVIEW_SESSION=close-share \
//   ORIGIN=http://close-share.localhost:3001 node scripts/airtable-walk/closeshare-member-default.mjs
import { admin, member, seedTable, say, ORG } from "./at-fix-j-lib.mjs";
import { open as openBrowser, ORIGIN } from "./at-fix-j2-lib.mjs";

const SHOT = process.env.HOME + "/lane-resume/closeshare/shots/";
const LABEL = "What membership alone confers";
let bad = 0;
const check = (ok, what, detail) => { if (!ok) bad++; say(ok ? "PASS" : "FAIL", what, detail ?? ""); };

const a = await admin();
const m = await member();
const id = await seedTable(a.client, "member-default");
say("org", ORG, "table", id);
// The setting reaches a Table's ROWS; a Table itself is structure, which membership never lifts above View
// (iam._member_default_level_now, Arman 2026-10-05), so the member's level is read on one of its rows.
let rowId = null;
const level = async () => {
  if (!rowId) rowId = (await a.client.listPage({ table_id: id, limit: 1, offset: 0, sort: [], search: null, filter: {}, view_id: null })).data.rows[0].id;
  const r = await m.sb.schema("custom").rpc("my_level", { p_organization_id: ORG, p_id: rowId, p_type: "record" });
  return r.error ? "ERR " + r.error.message : r.data;
};
const rowOf = (page) => page.locator("div, li, section").filter({ hasText: LABEL }).filter({ has: page.getByRole("combobox") }).last();
let A;
try {
  const before = await level();
  say("member level before", before);
  A = await openBrowser(false);
  check(A.who === "admin@admin.com", "admin browser signed in", A.who);
  const url = `${ORIGIN}/organizations/${ORG}/settings/configuration`;
  await A.page.goto(url, { waitUntil: "domcontentloaded", timeout: 240000 });
  await A.page.getByText(LABEL).first().waitFor({ timeout: 240000 });
  await A.page.getByText(LABEL).first().scrollIntoViewIfNeeded();
  await A.page.waitForTimeout(1500);
  const row = rowOf(A.page);
  say("row before", (await row.innerText()).slice(0, 300).replace(/\n/g, " | "));
  await A.page.screenshot({ path: SHOT + "15-1-before.png" });
  await row.getByRole("combobox").first().click();
  await A.page.getByRole("option", { name: /^Commenter$/ }).first().click();
  await A.page.waitForTimeout(1500);
  const save = row.getByRole("button", { name: /^Save$/ });
  if (await save.count()) await save.first().click();
  await A.page.waitForTimeout(4000);
  await A.page.reload({ waitUntil: "domcontentloaded" });
  await A.page.getByText(LABEL).first().waitFor({ timeout: 240000 });
  await A.page.getByText(LABEL).first().scrollIntoViewIfNeeded();
  await A.page.waitForTimeout(2500);
  const after = (await rowOf(A.page).innerText()).replace(/\n/g, " | ");
  const shown = (await rowOf(A.page).getByRole("combobox").first().innerText()).trim();
  say("picker shows after reload", shown);
  say("row after reload", after.slice(0, 300));
  await A.page.screenshot({ path: SHOT + "15-2-after.png" });
  check(/Commenter/.test(shown), "the setting reads back Commenter after a reload", shown);
  await new Promise((r) => setTimeout(r, 2000));
  const now = await level();
  check(before !== "commenter" && now === "commenter", "a plain member now holds Comment on a row nobody shared with them", `${before} -> ${now}`);
} finally {
  // put it back: remove this organization's answer so it inherits the platform default again
  const r = await a.sb.schema("platform").rpc("knob_override_set", { p_feature: "custom", p_key: "member_default_level", p_scope_kind: "organization", p_scope_id: ORG, p_organization_id: ORG, p_value: null, p_note: "CLOSE-SHARE walk: back to inherit" }).then((x) => x, (e) => ({ error: e }));
  say("override cleared", r?.error ? "ERR " + (r.error.message ?? r.error) : JSON.stringify(r.data));
  say("member level after clearing", await level());
  try { const t = await a.client.tableArchive({ table_id: id }); say("archived", id, t.ok); } catch (e) { say("archive failed", e.message); }
  await A?.browser.close().catch(() => {});
}
say(bad ? `RED: ${bad} failed` : "GREEN");
process.exit(bad ? 1 : 0);
