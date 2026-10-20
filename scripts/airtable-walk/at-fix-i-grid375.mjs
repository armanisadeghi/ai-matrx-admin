// AT-FIX-I: the data grid at 375 wide: no horizontal page scroll; the grid scrolls inside itself.
import { start, open, out } from "./lib.mjs";
const { browser, ctx, page, who } = await start(false);
out("who", who);
await page.setViewportSize({ width: 375, height: 812 });
await open(page, process.argv[2]);
await page.waitForFunction(() => document.body.innerText.includes("Alpha"), null, { timeout: 120000 }).catch(() => out("rows never showed Alpha"));
await page.waitForTimeout(1500);
const m = await page.evaluate(() => {
  const doc = document.scrollingElement;
  const scrollers = [...document.querySelectorAll("*")].filter((e) => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 100; }).map((e) => `${e.tagName}.${String(e.className).slice(0, 40)} ${e.scrollWidth}>${e.clientWidth}`);
  return { innerWidth, pageScrollWidth: doc.scrollWidth, pageClientWidth: doc.clientWidth, rows: document.querySelectorAll("[role=row]").length, scrollers: scrollers.slice(0, 4) };
});
out(JSON.stringify(m));
await page.screenshot({ path: "/tmp/atfi-grid375.png" });
await browser.close();
