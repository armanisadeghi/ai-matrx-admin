#!/usr/bin/env node
// perf-probe — repeatable live page-speed probe (signed-out visitor). Median of 3 fresh loads per route:
// server first byte, first contentful paint, largest paint, load, CLS, fetches, script files/KB.
// Usage: node scripts/perf-probe.mjs [--base https://www.aimatrx.com] /chat/new / /notes
// Signed-in numbers come from real users: platform.page_vitals (dashboard › Latency › Page speed).
import { chromium } from "playwright";
const args = process.argv.slice(2);
const bi = args.indexOf("--base");
const BASE = bi >= 0 ? args.splice(bi, 2)[1] : "https://www.aimatrx.com";
const routes = args.length ? args : ["/", "/chat/new", "/notes"];
const browser = await chromium.launch();
for (const route of routes) {
  const rows = [];
  for (let run = 0; run < 3; run++) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__lcp = 0; window.__cls = 0;
      new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(BASE + route + (route.includes("?") ? "&" : "?") + "probe=" + Date.now(), { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(6000);
    const m = await page.evaluate(() => {
      const n = performance.getEntriesByType("navigation")[0];
      const fcp = performance.getEntriesByType("paint").find(p => p.name === "first-contentful-paint");
      const res = performance.getEntriesByType("resource");
      const js = res.filter(r => /\.js(\?|$)/.test(r.name));
      return { ttfb: Math.round(n.responseStart), fcp: Math.round(fcp?.startTime ?? -1), lcp: Math.round(window.__lcp), load: Math.round(n.loadEventEnd), cls: +window.__cls.toFixed(3), req: res.filter(r => r.initiatorType === "fetch" || r.initiatorType === "xmlhttprequest").length, js: js.length, jsKB: Math.round(js.reduce((a, r) => a + (r.decodedBodySize || 0), 0) / 1024) };
    });
    rows.push(m);
    await ctx.close();
  }
  const med = k => rows.map(r => r[k]).sort((a, b) => a - b)[1];
  console.log(route, JSON.stringify({ ttfb: med("ttfb"), fcp: med("fcp"), lcp: med("lcp"), load: med("load"), cls: med("cls"), req: med("req"), js: med("js"), jsKB: med("jsKB") }));
}
await browser.close();
