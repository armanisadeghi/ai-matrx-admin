// ACCEPT-FIX 3: layout shift of /data/<table> pages (cold localStorage each time) at 1440 and 390.
//   ORIGIN=http://<session>.localhost:3001 node scripts/airtable-walk/accept-fix-cls.mjs
import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = process.env.ORIGIN;
const browser = await chromium.launch();
const seed = await browser.newContext();
const sp = await seed.newPage();
await walkSignIn(sp, ORIGIN);
await sp.goto(ORIGIN + "/data", { waitUntil: "domcontentloaded", timeout: 180000 });
await sp.waitForTimeout(6000);
const hrefs = await sp.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="/data/"]')].map((a) => a.getAttribute("href")).filter((h) => /^\/data\/[0-9a-f-]{36}/.test(h) && !h.includes("/r/")))].slice(0, 3));
const state = await seed.storageState();
state.origins = [];
console.log("tables", hrefs, sp.url(), await sp.evaluate(() => [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => h.startsWith("/data")).slice(0, 8)));
let worst = 0;
for (const width of [1440, 390]) {
  for (const h of hrefs) {
    const ctx = await browser.newContext({ storageState: state, viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__cls = []; 
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls.push({ v: e.value, t: Math.round(e.startTime), s: e.sources.map((s) => (s.node?.nodeName || "?") + "." + String(s.node?.className || "").slice(0, 60) + ":" + JSON.stringify(s.previousRect) + ">" + JSON.stringify(s.currentRect)) }); }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(ORIGIN + h, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.waitForTimeout(9000);
    const r = await page.evaluate(() => window.__cls);
    const total = r.reduce((a, b) => a + b.v, 0);
    worst = Math.max(worst, total);
    console.log(width, h.slice(-8), "CLS", total.toFixed(4), process.env.V ? JSON.stringify(r, null, 1) : "");
    await ctx.close();
  }
}
console.log(worst === 0 ? "ALL ZERO" : "WORST " + worst);
await browser.close();
