import { open, gotoTable, say } from "./at-fix-j2-lib.mjs";
const { browser, page, who, shot } = await open(false);
say("who", who);
await gotoTable(page, process.env.TABLE);
await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(1200);
await shot("im1-menu");
say("items", await page.evaluate(() => [...document.querySelectorAll("[role=menuitem]")].map((e) => e.innerText.trim().replace(/\n/g, " | "))));
await browser.close();
