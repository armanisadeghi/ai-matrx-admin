// RECORD-FIXES item 4: the grid's ⤢ opens the record. node rf-open-button.mjs <table> [menuOpen]
import { start, open, out, ORIGIN } from "./lib.mjs";
const [TB, withMenu] = process.argv.slice(2);
const { browser, page, who } = await start(false);
out("who", who);
await open(page, TB);
const btn = page.locator("[data-records-open-record]").first();
out("buttons", await page.locator("[data-records-open-record]").count());
if (withMenu) { await page.keyboard.press("Escape"); await page.locator("[data-matrx-cell-content]").first().click({ button: "right" }); await page.waitForTimeout(500); out("menu open", await page.locator("[role=menu]").count()); }
const before = page.url();
await btn.click({ timeout: 10000 }).catch((e) => out("click error", e.message.slice(0, 200)));
await page.waitForTimeout(6000);
out("url before", before.replace(ORIGIN, ""), "after", page.url().replace(ORIGIN, ""));
await page.screenshot({ path: `/tmp/airtable-walk/rf-open-button${withMenu ? "-menu" : ""}.png` });
await browser.close();
