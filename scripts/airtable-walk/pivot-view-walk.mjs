// PIVOT-VIEW walk: the pivot view and the four new chart shapes over the seeded Pivot Proof Deals, on the shared preview, as admin.
// usage: node scripts/airtable-walk/pivot-view-walk.mjs <seed-json-file> <outDir> [--archive]
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { store } from "./store.mjs";
import { ORIGIN, out } from "./lib.mjs";
import { walkSignIn } from "./walk-signin.mjs";

const [SEED, DIR, flag] = process.argv.slice(2);
const seed = JSON.parse(readFileSync(SEED, "utf8"));
const { client } = await store();
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
if (flag === "--archive") {
  for (let i = 0; i < 40; i += 1) { const a = await client.tableArchive({ table_id: seed.table, chunk: 20, includeTable: true }); if (!a.ok || a.data.done) { out("archive", JSON.stringify(a).slice(0, 160)); break; } }
  process.exit(0);
}
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
ctx.setDefaultNavigationTimeout(180000);
await ctx.addInitScript(() => {
  window.__cls = 0;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
});
const page = await ctx.newPage();
const errs = []; page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
out("signed in as", await walkSignIn(page, ORIGIN));
const shot = (n) => page.screenshot({ path: `${DIR}/${n}.png` });
const go = async (view, sel) => {
  await page.goto(`${ORIGIN}/data/${seed.table}?view=${view}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(sel, { timeout: 240000 });
  await page.waitForTimeout(2500);
};
const cls = () => page.evaluate(() => Math.round(window.__cls * 1000) / 1000);

// ── PIVOT ──
await go(seed.views.pivot, "[data-records-pivot]");
out("pivot sum: rows", await page.locator("[data-records-pivot-row]").count(), "cells", await page.locator("[data-records-pivot-cell]").count(), "grand", await page.locator("[data-records-pivot-grand]").innerText(), "cls", await cls());
const boxA = await page.locator("[data-records-pivot-scroll]").boundingBox();
await shot("pivot-desktop");
// the grand total is the store's sum over every record
const rows = must(await client.list({ table_id: seed.table, limit: 200 }), "list").rows;
const sum = rows.reduce((a, r) => a + (r.document.amount ?? 0), 0);
out("sum of amount over the records", sum, "rows", rows.length);
// a cell opens exactly the records it counted
await page.goto(`${ORIGIN}/data/${seed.table}?view=${seed.views.pivotCount}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-records-pivot]", { timeout: 240000 }); await page.waitForTimeout(2000);
const first = page.locator("[data-records-pivot-row]").first().locator("[data-records-pivot-open]").first();
const label = await first.getAttribute("aria-label");
out("cell clicked", label);
await shot("pivot-count");
await first.click(); await page.waitForTimeout(6000);
out("after cell click url", decodeURIComponent(page.url()).slice(ORIGIN.length));
await shot("pivot-cell-opens-records");
await go(seed.views.pivotAvg, "[data-records-pivot]");
await shot("pivot-average");
// ── CHART SHAPES ──
for (const k of ["area", "pie", "stacked", "scatter"]) {
  await go(seed.views[k], "[data-records-chart-layout]");
  await page.waitForTimeout(1500);
  out(k, "labels", await page.locator("[data-records-chart-label]").count(), "svg", await page.locator("[data-records-chart-layout] svg").count(), "cls", await cls());
  await shot(`chart-${k}-desktop`);
}
// ── PHONE ──
await page.setViewportSize({ width: 375, height: 812 });
for (const [name, v, sel] of [["pivot", seed.views.pivot, "[data-records-pivot]"], ["stacked", seed.views.stacked, "[data-records-chart-layout]"], ["scatter", seed.views.scatter, "[data-records-chart-layout]"], ["pie", seed.views.pie, "[data-records-chart-layout]"]]) {
  await go(v, sel);
  out(`phone ${name} overflow-x`, await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
  if (name === "pivot") out("phone pivot scrolls inside its own box", await page.evaluate(() => { const b = document.querySelector("[data-records-pivot-scroll]"); return b.scrollWidth > b.clientWidth ? "yes" : "no (fits)"; }));
  await shot(`${name}-phone`);
}
out("pivot box before/after reload same height", JSON.stringify(boxA));
out("console errors", JSON.stringify(errs.slice(0, 5)));
await browser.close();
