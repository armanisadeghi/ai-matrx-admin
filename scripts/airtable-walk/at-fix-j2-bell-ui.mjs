// AT-FIX-J2 item 4c: open the bell as admin and look for the hourly summary.
import { open, gotoTable, say } from "./at-fix-j2-lib.mjs";
const { browser, page, who, shot } = await open(false);
say("who", who);
await gotoTable(page, process.env.TABLE); await page.waitForTimeout(2000);
await page.getByRole("button", { name: /^Notifications/ }).first().click(); await page.waitForTimeout(4000); await shot("bell1");
const t = await page.evaluate(() => document.body.innerText);
say("bell mentions ATFJ2", t.split("\n").filter((l) => /ATFJ2|summary|Webcam|arrived/i.test(l)).slice(0, 12));
await page.getByRole("button", { name: "Updates" }).first().click().catch(async () => { await page.getByText("Updates", { exact: true }).first().click(); }); await page.waitForTimeout(4000); await shot("bell3-updates");
say("updates tab", (await page.evaluate(() => document.body.innerText)).split("\n").filter((l) => /ATFJ2|summary|1 new|Hourly/i.test(l)).slice(0, 12));
await browser.close();
