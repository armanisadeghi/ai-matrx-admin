import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = process.env.ORIGIN;
const browser = await chromium.launch();
async function collect(member, pick) {
  const c = await browser.newContext(); const p = await c.newPage();
  await walkSignIn(p, ORIGIN, { member });
  await p.goto(ORIGIN + "/data", { waitUntil: "domcontentloaded", timeout: 180000 }); await p.waitForTimeout(6000);
  const hrefs = await p.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="/data/"]')].map((a) => a.getAttribute("href")).filter((h) => /^\/data\/[0-9a-f-]{36}$/.test(h.split("?")[0])))]);
  const st = await c.storageState(); st.origins = []; return { hrefs: pick(hrefs), st, all: hrefs };
}
async function cls(st, h, width) {
  const ctx = await browser.newContext({ storageState: st, viewport: { width, height: 900 } }); const page = await ctx.newPage();
  await page.addInitScript(() => { window.__cls = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls.push({ v: e.value, t: Math.round(e.startTime), s: e.sources.map((s) => (s.node?.nodeName || "?") + "." + String(s.node?.className || "").slice(0, 50)) }); }).observe({ type: "layout-shift", buffered: true }); });
  await page.goto(ORIGIN + h, { waitUntil: "domcontentloaded", timeout: 180000 }); await page.waitForTimeout(9000);
  const r = await page.evaluate(() => window.__cls); await ctx.close();
  return { total: r.reduce((a, b) => a + b.v, 0), r };
}
const adm = await collect(false, (h) => h.slice(0, 3));
for (const h of adm.hrefs) { const x = await cls(adm.st, h, 390); console.log("admin390", h.slice(6, 14), x.total.toFixed(4), JSON.stringify(x.r).slice(0, 300)); }
const mem = await collect(true, (h) => h.filter((x) => /\/data\/(b79ba573|02f00d65)/.test(x)));
console.log("member tables visible", mem.hrefs, "all", mem.all.length);
for (const h of mem.hrefs) for (const w of [1440, 390]) { const x = await cls(mem.st, h, w); console.log("member", w, h.slice(6, 14), x.total.toFixed(4), JSON.stringify(x.r).slice(0, 300)); }
await browser.close();
