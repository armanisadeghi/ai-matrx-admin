// AT-FIX-F item 2 probe: board table tile -> Show as card -> click a row -> detail inside the card.
import { start, out, ORIGIN } from "./lib.mjs";
const B = process.argv[2], TBL = process.argv[3];
const { browser, page, who } = await start();
out("who", who);
await page.goto(`${ORIGIN}/board/${B}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForTimeout(10000);
await page.getByRole("button", { name: "Add", exact: true }).first().click();
await page.waitForTimeout(1500);
await page.locator("[role=menuitem],[role=option]", { hasText: "Section from a table" }).first().click();
await page.waitForTimeout(3000);
await page.screenshot({ path: "/tmp/atff/b2.png" });
out("pick", JSON.stringify(await page.evaluate(() => document.body.innerText.slice(0, 0))));
const opt = page.getByText("ATFF main", { exact: false }).first();
await opt.waitFor({ timeout: 30000 }).catch(() => out("no option"));
await opt.click().catch((e) => out("click err", e.message.slice(0, 80)));
await page.waitForTimeout(8000);
await page.screenshot({ path: "/tmp/atff/b3.png" });
await browser.close();
