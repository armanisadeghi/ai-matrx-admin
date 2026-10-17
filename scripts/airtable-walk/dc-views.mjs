import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = "http://s96c6068c.localhost:3001"; const [,, D, path, tag, ...tabs] = process.argv;
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } }); ctx.setDefaultNavigationTimeout(240000);
const page = await ctx.newPage();
await page.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch {} });
await walkSignIn(page, ORIGIN);
for (const w of [1600, 768, 375]) {
  await page.setViewportSize({ width: w, height: w === 375 ? 812 : 1000 });
  await page.goto(ORIGIN + path, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(12000);
  for (const t of tabs) {
    const loc = page.getByRole("button", { name: new RegExp("^" + t) }).or(page.getByText(t, { exact: true }));
    const el = loc.first(); await el.scrollIntoViewIfNeeded(); await el.click(); await page.waitForTimeout(5000);
    const m = await page.evaluate(() => {
      const cal = document.querySelector('[data-view-kind="calendar"], [class*="calendar" i]');
      const heads = [...document.querySelectorAll("[role=columnheader]")].map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0,9), Math.round(r.left), Math.round(r.right)]; });
      return { cls: window.__cls, loading: (document.body.innerText.match(/Loading…/g) || []).length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, heads: heads.slice(0, 8), bodyScroll: [...document.querySelectorAll("*")].filter(e => e.scrollWidth > e.clientWidth + 2 && /auto|scroll/.test(getComputedStyle(e).overflowX)).length };
    });
    console.log(tag, w, t, JSON.stringify(m));
    await page.screenshot({ path: `${D}/${tag}-${t.replace(/\W/g,"")}-${w}.png` });
  }
}
await b.close();
