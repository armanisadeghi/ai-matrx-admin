import { boot, ORIGIN, D } from "./at-walk-a-lib.mjs";
const { browser, page, who, errs } = await boot();
console.log("who", who);
await page.goto(ORIGIN + process.argv[2], { waitUntil: "domcontentloaded", timeout: 240000 });
for (let i = 0; i < 8; i++) { await page.waitForTimeout(10000); console.log(i, (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 300)); }
await page.screenshot({ path: `${D}/peek.png` });
console.log("errs", JSON.stringify(errs));
await browser.close();
