// AT-FIX-H 3: Gmail trigger panel: does the "Checked" line move after "Check now"? args: tableId
import { open, gotoTable, openAutomations, say } from "./at-walk-h-lib.mjs";
const [, , T] = process.argv;
const { browser, page, who, shot } = await open(false);
say("WHO", who);
const reqs = [];
page.on("response", (r) => { const u = r.url(); if (/app-triggers|automations/.test(u) || /rpc\/automations/.test(u)) reqs.push(r.request().method() + " " + u.split("?")[0].slice(-60) + " " + r.status()); });
await gotoTable(page, T);
await openAutomations(page);
const d = page.getByRole("dialog");
const row = d.locator("[data-testid=spaces-automation-row]").filter({ hasText: "ATFIXH gmail check" });
const line = () => row.locator("[data-testid=spaces-automation-app-check] span").first().innerText().catch(() => "n/a");
await row.first().waitFor({ timeout: 150000 }).catch(async () => { say("NO ROW", (await d.innerText().catch(() => "no dialog")).replace(/\n+/g, " | ").slice(0, 400)); await shot("fixh-gmail-norow"); });
say("BEFORE", await line());
const sw = row.getByRole("switch", { name: "Automation on" });
if ((await sw.getAttribute("aria-checked")) !== "true") { await sw.click(); await page.waitForTimeout(8000); }
say("AFTER SWITCH", await line());
for (let i = 1; i <= 3; i++) {
  await row.getByRole("button", { name: /Check now/ }).click();
  await page.waitForTimeout(15000);
  say("CHECK " + i, await line(), "| panel said:", (await d.locator("p.text-destructive").allInnerTexts()).join(" / "));
}
say("REQS", reqs.slice(-14));
await shot("fixh-gmail");
await browser.close();
