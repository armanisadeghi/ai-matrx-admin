import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = "http://s96c6068c.localhost:3001"; const D = process.argv[2]; const path = process.argv[3]; const tag = process.argv[4];
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } }); ctx.setDefaultNavigationTimeout(240000);
const page = await ctx.newPage();
await page.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch {} });
console.log(await walkSignIn(page, ORIGIN));
for (const w of [1600, 768, 375]) {
  await page.setViewportSize({ width: w, height: w === 375 ? 812 : 1000 });
  await page.goto(ORIGIN + path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(15000);
  const m = await page.evaluate(() => ({ cls: window.__cls, loading: (document.body.innerText.match(/Loading…/g) || []).length, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(tag, w, JSON.stringify(m));
  // full-scroll screenshots of the main scroller
  const h = await page.evaluate(() => { const s = [...document.querySelectorAll("*")].filter(e => e.scrollHeight > e.clientHeight + 200 && /auto|scroll/.test(getComputedStyle(e).overflowY)).sort((a,b)=>b.scrollHeight-a.scrollHeight)[0]; if (s) s.setAttribute("data-dcs","1"); return s ? s.scrollHeight : 0; });
  const vh = w === 375 ? 812 : 1000; let i = 0;
  for (let y = 0; y < Math.min(h, 6000); y += vh - 150) {
    await page.evaluate(y => document.querySelector("[data-dcs]")?.scrollTo(0, y), y);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${D}/${tag}-${w}-${i++}.png` });
  }
}
await b.close();
