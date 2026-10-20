// AT-FIX-J2 item 4a (member check): can test@test.com open Import on the Orders table, and what does the menu say?
import { open, gotoTable, say } from "./at-fix-j2-lib.mjs";
const { browser, page, who, shot } = await open(true);
say("who", who);
await gotoTable(page, process.env.TABLE); await page.waitForTimeout(2000);
await page.getByText("Grid", { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1500);
say("header", await page.$$eval("header button, [data-table-toolbar] button", (e) => e.map((x) => (x.getAttribute("aria-label") || x.innerText).trim()).filter(Boolean).slice(0, 40)));
await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(800);
say("menu", await page.$$eval("[role=menuitem]", (e) => e.map((x) => x.innerText.trim().replace(/\n/g, " | ") + (x.getAttribute("aria-disabled") === "true" ? " (disabled)" : "")).slice(0, 40)));
await shot("mi1");
await page.getByRole("menuitem", { name: /^Import…/ }).first().click().catch((e) => say("no import item", e.message.slice(0, 60))); await page.waitForTimeout(2500); await shot("mi2");
say("after", (await page.evaluate(() => document.body.innerText)).split("\n").filter((l) => /Import|Choose a file|can't|cannot|not allowed|permission|edit access/i.test(l)).slice(0, 10));
await browser.close();
