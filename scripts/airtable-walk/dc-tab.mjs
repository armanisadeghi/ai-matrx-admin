import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = "http://s96c6068c.localhost:3001"; const [,, D, path, tab, tag] = process.argv;
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } }); ctx.setDefaultNavigationTimeout(240000);
const page = await ctx.newPage();
await page.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch {} });
await walkSignIn(page, ORIGIN);
for (const w of [1600, 768, 375]) {
  await page.setViewportSize({ width: w, height: w === 375 ? 812 : 1000 });
  await page.goto(ORIGIN + path, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(12000);
  await page.getByText(tab, { exact: true }).first().click(); await page.waitForTimeout(6000);
  const m = await page.evaluate(() => ({ cls: window.__cls, loading: (document.body.innerText.match(/Loading…/g) || []).length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(tag, w, JSON.stringify(m));
  await page.screenshot({ path: `${D}/${tag}-${w}.png` });
}
await b.close();
