// CLOSE-SHARE CD-SHARE-07: a view link with a password and "Stop copying". Admin makes the link in the view menu, sets a
// password and turns copying off; a signed-out browser opens /v/<token>, is asked the password, reads the rows, and a
// copy on a cell is refused. The link is turned off at the end. ORIGIN=http://close-share.localhost:3001 TABLE=<id>
import { chromium } from "playwright";
import { open, gotoTable, say, ORIGIN } from "./at-fix-j2-lib.mjs";
const SHOT = process.env.HOME + "/lane-resume/closeshare/shots/";
const PW = "intake-walk-" + Date.now().toString(36).slice(-4);
const { browser, page, who } = await open(false);
say("who", who);
await gotoTable(page, process.env.TABLE);
await page.getByRole("button", { name: /^View: / }).first().click(); await page.waitForTimeout(1200);
await page.getByText("Share view link…").first().click(); await page.waitForTimeout(3000);
await page.getByRole("button", { name: /^(Create link|Add another link)$/ }).first().click(); await page.waitForTimeout(5000);
const card = page.locator("[data-view-link]").first();
const token = (await card.locator("[data-view-link-url]").inputValue()).match(/\/v\/([0-9a-f]{64})/)[1];
say("link made", token.slice(0, 8));
await card.locator("[data-view-link-options]").click(); await page.waitForTimeout(500);
await card.locator("[data-view-link-password]").fill(PW);
await card.locator("[data-view-link-password-set]").click(); await page.waitForTimeout(3000);
const copyBtn = page.locator("[data-view-link]").first().locator("[data-view-link-restrict-copy]");
say("copy switch before", await copyBtn.getAttribute("data-view-link-restrict-copy"), await copyBtn.innerText());
await copyBtn.click(); await page.waitForTimeout(3000);
say("copy switch after", await page.locator("[data-view-link]").first().locator("[data-view-link-restrict-copy]").getAttribute("data-view-link-restrict-copy"));
await page.screenshot({ path: SHOT + "1-admin-panel.png" });

const b2 = await chromium.launch({ headless: true }); const ctx2 = await b2.newContext({ viewport: { width: 1300, height: 900 } }); const p2 = await ctx2.newPage();
const r = await p2.goto(`${ORIGIN}/v/${token}`, { waitUntil: "domcontentloaded", timeout: 180000 });
say("signed-out status", r.status(), "asks password", await p2.locator("[data-view-link-unlock]").count());
await p2.screenshot({ path: SHOT + "2-outsider-locked.png" });
await p2.locator("[data-view-link-unlock] input[type=password]").fill(PW);
await p2.locator("[data-view-link-unlock] button[type=submit], [data-view-link-unlock] button").first().click();
await p2.waitForLoadState("domcontentloaded"); await p2.waitForTimeout(4000);
const probe = await p2.evaluate(() => {
  const region = document.querySelector("[data-public-view-no-copy]");
  const cell = region?.querySelector("td, article, span");
  const ev = new ClipboardEvent("copy", { bubbles: true, cancelable: true });
  cell?.dispatchEvent(ev);
  return { region: !!region, rows: document.querySelectorAll("tbody tr, article").length, cellText: cell?.textContent?.slice(0, 40) ?? null,
           userSelect: region ? getComputedStyle(region).userSelect : null, copyRefused: ev.defaultPrevented,
           footer: document.querySelector("[data-public-view-copy-off]")?.textContent ?? null };
});
say("outsider page", probe);
await p2.screenshot({ path: SHOT + "3-outsider-open.png", fullPage: true });
await b2.close();

await page.locator("[data-view-link]").first().locator("[data-view-link-off]").click(); await page.waitForTimeout(500);
await page.locator("[data-view-link]").first().locator("[data-view-link-off-confirm]").click(); await page.waitForTimeout(3000);
say("link turned off");
await browser.close();
const pass = probe.region && probe.rows > 0 && probe.userSelect === "none" && probe.copyRefused && !!probe.footer && r.status() === 200;
say(pass ? "PASS" : "FAIL");
