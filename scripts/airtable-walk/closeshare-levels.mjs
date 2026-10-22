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
  const options = await page.evaluate(() => [...document.querySelectorAll("[role=option]")].map((o) => o.textContent.trim()));
  await page.screenshot({ path: SHOT + `01-${name}-levels.png` });
  await page.keyboard.press("Escape");
  check(JSON.stringify(options) === JSON.stringify(WANT), `${name}: the level picker offers exactly ${WANT.join(", ")}`, options);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
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
  await A.page.waitForTimeout(3000);
  await A.page.getByRole("button", { name: "Share", exact: true }).last().click();
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
