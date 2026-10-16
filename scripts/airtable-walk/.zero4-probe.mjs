import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = process.env.ORIGIN, PREFIX = process.env.PREFIX, WIDTH = +(process.env.WIDTH || 390), MEMBER = !!process.env.MEMBER;
const browser = await chromium.launch();
const seed = await browser.newContext();
const sp = await seed.newPage();
await walkSignIn(sp, ORIGIN, { member: MEMBER });
const state = await seed.storageState(); state.origins = [];
let href = process.env.HREF;
if (!href) {
  await sp.goto(ORIGIN + "/data", { waitUntil: "domcontentloaded", timeout: 180000 }); await sp.waitForTimeout(6000);
  href = await sp.evaluate((p) => [...document.querySelectorAll('a[href^="/data/"]')].map((a) => a.getAttribute("href")).find((h) => h.startsWith("/data/" + p)), PREFIX);
}
console.log("href", href);
const ctx = await browser.newContext({ storageState: state, viewport: { width: WIDTH, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__cls = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls.push({ v: e.value, t: Math.round(e.startTime), s: e.sources.map((s) => { const n = s.node; const path=[]; let x=n; for(let i=0;i<4&&x;i++){path.push((x.nodeName||"?")+"."+String(x.className?.baseVal ?? x.className ?? "").slice(0,50)+(x.getAttribute?.("data-testid")?"#"+x.getAttribute("data-testid"):""));x=x.parentElement;} return path.join(" < ") + " :: " + JSON.stringify(s.previousRect) + ">" + JSON.stringify(s.currentRect) + " txt=" + (n?.textContent||"").slice(0,40); }) }); }).observe({ type: "layout-shift", buffered: true });
});
await page.goto(ORIGIN + href, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(9000);
const r = await page.evaluate(() => window.__cls);
console.log(WIDTH, "CLS", r.reduce((a, b) => a + b.v, 0).toFixed(4)); console.log(JSON.stringify(r, null, 1));
await browser.close();
