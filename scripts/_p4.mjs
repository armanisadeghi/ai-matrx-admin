import { start, open, T, OUT } from "./at-walk2-lib.mjs";
const { browser, page } = await start();
await open(page, T.events);
const th = page.locator("thead th", { hasText: "STATUS" }).first();
console.log((await th.innerHTML()).replace(/class="[^"]*"/g,"").slice(0,900));
await th.hover(); await page.waitForTimeout(400);
const btns = th.locator("button");
console.log("btns", await btns.count(), await btns.evaluateAll(b=>b.map(x=>x.getAttribute("aria-label"))));
await browser.close();
