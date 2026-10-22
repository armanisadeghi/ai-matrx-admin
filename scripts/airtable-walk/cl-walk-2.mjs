// CLOSE-LINK walk 2 (browser): open a link cell's picker, search by part of a title (CD-LINK-02), read the field editor's link settings
// (03/05/08/09), and the several-target column (04). WHO=admin|member. Host: ORIGIN. Shots: ~/lane-resume/closelink/r4/shots/.
import { open, say, gotoTable, ORIGIN } from "./at-fix-j2-lib.mjs";
const S = process.env.HOME + "/lane-resume/closelink/r4/shots/";
const BOOKINGS = process.env.TABLE ?? "7dad23dc-ac4a-46a4-876c-499cdf9b8793";
const { browser, page, who, errs } = await open(process.env.WHO === "member");
say("who", who, "origin", ORIGIN);
const shot = (n) => page.screenshot({ path: S + n + ".png" }).catch(() => {});
const text = async (sel = "body") => (await page.locator(sel).first().innerText()).replace(/\n+/g, " | ");
try {
  await gotoTable(page, BOOKINGS);
  await shot("w2-grid");
  // find the Client cell of "Summer order"
  const row = page.locator('[role=row]').filter({ hasText: "Summer order" }).first();
  const cells = row.locator('[role=gridcell]');
  say("cells", await cells.count(), (await row.innerText()).replace(/\n+/g, " | "));
  const clientCell = cells.nth(Number(process.env.COL ?? 2));
  await clientCell.dblclick();
  await page.waitForTimeout(2500);
  await shot("w2-picker-open");
  const dlg = page.locator('[data-relation-candidate]');
  say("candidates", await dlg.count(), await dlg.allInnerTexts());
  await page.keyboard.type(process.env.Q ?? "Harb", { delay: 60 });
  await page.waitForTimeout(1500);
  say("after search", await dlg.count(), await dlg.allInnerTexts());
  await shot("w2-picker-search");
  await page.keyboard.press("Escape");
} catch (e) { say("ERR", String(e).slice(0, 400)); await shot("w2-err"); }
say("console errors", errs.slice(0, 5));
await browser.close();
