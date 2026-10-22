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
const level = async () => {
  const r = await m.sb.schema("custom").rpc("my_level", { p_organization_id: ORG, p_id: id, p_type: "table" });
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
  await A.page.getByRole("option", { name: /^Viewer$/ }).first().click();
  await A.page.waitForTimeout(1500);
  const save = row.getByRole("button", { name: /^Save$/ });
  if (await save.count()) await save.first().click();
  await A.page.waitForTimeout(4000);
  await A.page.reload({ waitUntil: "domcontentloaded" });
  await A.page.getByText(LABEL).first().waitFor({ timeout: 240000 });
  await A.page.getByText(LABEL).first().scrollIntoViewIfNeeded();
  await A.page.waitForTimeout(2500);
  const after = (await rowOf(A.page).innerText()).replace(/\n/g, " | ");
  say("row after reload", after.slice(0, 300));
  await A.page.screenshot({ path: SHOT + "15-2-after.png" });
  check(/Viewer/.test(after), "the setting reads back Viewer after a reload", after.slice(0, 160));
  await new Promise((r) => setTimeout(r, 2000));
  const now = await level();
  check(now === "viewer", "a plain member now holds View on a table nobody shared with them", `${before} -> ${now}`);
} finally {
  // put it back: remove this organization's answer so it inherits the platform default again
  const r = await a.sb.schema("platform").rpc("knob_override_set", { p_feature: "custom", p_key: "member_default_level", p_scope_kind: "organization", p_scope_id: ORG, p_organization_id: ORG, p_value: null, p_note: "CLOSE-SHARE walk: back to inherit" }).catch((e) => ({ error: e }));
  say("override cleared", r?.error ? "ERR " + (r.error.message ?? r.error) : JSON.stringify(r.data));
  say("member level after clearing", await level());
  try { const t = await a.client.tableArchive({ table_id: id }); say("archived", id, t.ok); } catch (e) { say("archive failed", e.message); }
  await A?.browser.close().catch(() => {});
}
say(bad ? `RED: ${bad} failed` : "GREEN");
process.exit(bad ? 1 : 0);
