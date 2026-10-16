import { start, ORIGIN, out } from "./lib.mjs";
const { browser, page } = await start(false);
await page.goto(`${ORIGIN}/data`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForTimeout(8000);
const a = await page.evaluate(() => [...document.querySelectorAll("a[href^='/data/']")].filter((x) => /LinkedIn company/i.test(x.textContent)).map((x) => x.getAttribute("href") + " " + x.textContent.slice(0, 60)));
out(JSON.stringify(a));
await page.goto(`${ORIGIN}/data/search?q=All%20Green`, { waitUntil: "domcontentloaded" }).catch(() => {});
out(page.url(), (await page.locator("body").innerText()).slice(0, 300));
await browser.close();
