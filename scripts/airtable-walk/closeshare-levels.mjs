// CLOSE-SHARE CD-SHARE-01 walk (headless, own preview host): the share level picker offers exactly View, Comment, Edit and
// Full access — on a table, on one of its records, and on a page (a Space). Admin opens Share > Invite on each and reads the
// picker's options. Seeds a disposable table (archived at the end); the Space is passed in (SPACE=<content.document id>).
// MATRX_PREVIEW_SESSION=close-share ORIGIN=http://close-share.localhost:3001 SPACE=<id> node scripts/airtable-walk/closeshare-levels.mjs
import { admin, seedTable, say } from "./at-fix-j-lib.mjs";
import { open as openBrowser, gotoTable, ORIGIN } from "./at-fix-j2-lib.mjs";

const SHOT = process.env.HOME + "/lane-resume/closeshare/shots/";
const WANT = ["Full access", "Edit", "Comment", "View"];
let bad = 0;
const check = (ok, what, detail) => { if (!ok) bad++; say(ok ? "PASS" : "FAIL", what, detail ?? ""); };

async function readLevels(page, name) {
  await page.getByRole("button", { name: /Invite/ }).first().click({ timeout: 60000 }).catch(() => {});
  const dlg = page.getByRole("dialog").last();
  const trigger = dlg.locator("#user-permission");
  await trigger.waitFor({ timeout: 120000 });
  await trigger.click();
  await page.waitForTimeout(1000);
  // the picker's own list (aria-controls of its trigger); the record's History list also uses role=option
  const listId = await trigger.getAttribute("aria-controls");
  const options = await page.evaluate((lid) => [...(lid && document.getElementById(lid) ? document.getElementById(lid).querySelectorAll("[role=option]") : document.querySelectorAll("[data-radix-popper-content-wrapper] [role=option]"))].map((o) => o.textContent.trim()), listId);
  await page.screenshot({ path: SHOT + `01-${name}-levels.png` });
  await page.keyboard.press("Escape");
  // The order is the host's wording choice (Notion-style hosts list Full access first); the set is the rule.
  check(JSON.stringify([...options].sort()) === JSON.stringify([...WANT].sort()), `${name}: the level picker offers exactly ${WANT.join(", ")}`, options);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  if (await page.getByRole("dialog").count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(800); }
}

const a = await admin();
const id = await seedTable(a.client, "levels");
say("table", id);
let A;
try {
  A = await openBrowser(false);
  check(A.who === "admin@admin.com", "admin browser signed in", A.who);
  await gotoTable(A.page, id);
  await A.page.getByRole("button", { name: "Share", exact: true }).first().click();
  await A.page.waitForTimeout(2500);
  await readLevels(A.page, "table");
  await A.page.getByText("Alpha", { exact: true }).first().dblclick();
  // The record opens beside the grid with its own Share; wait for it, or the table's Share would be pressed again.
  await A.page.waitForFunction(() => [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Share").length >= 2, null, { timeout: 120000 });
  await A.page.waitForTimeout(1500);
  // the record's own Share: the last enabled one outside any dialog (an Invite window left open has a disabled Share)
  await A.page.locator("button:not([disabled])").filter({ hasText: /^Share$/ }).filter({ hasNot: A.page.locator("[role=dialog]") }).last().click();
  await A.page.waitForTimeout(2500);
  await readLevels(A.page, "record");
  if (process.env.SPACE) {
    await A.page.goto(`${ORIGIN}/spaces/${process.env.SPACE}`, { waitUntil: "domcontentloaded", timeout: 240000 });
    await A.page.getByRole("button", { name: "Share", exact: true }).first().waitFor({ timeout: 240000 });
    await A.page.waitForTimeout(2000);
    await A.page.getByRole("button", { name: "Share", exact: true }).first().click();
    await A.page.waitForTimeout(2500);
    await readLevels(A.page, "page");
  }
} finally {
  try { const t = await a.client.tableArchive({ table_id: id }); say("archived", id, t.ok); } catch (e) { say("archive failed", e.message); }
  await A?.browser.close().catch(() => {});
}
say(bad ? `RED: ${bad} failed` : "GREEN");
process.exit(bad ? 1 : 0);
