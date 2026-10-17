import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = "http://s96c6068c.localhost:3001"; const [,, D, path] = process.argv;
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } }); ctx.setDefaultNavigationTimeout(240000);
const page = await ctx.newPage();
await walkSignIn(page, ORIGIN);
for (const w of [375, 768, 1600]) {
  await page.setViewportSize({ width: w, height: w === 375 ? 812 : 1000 });
  await page.goto(ORIGIN + path, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(12000);
  const o = page.getByLabel("Open as full page"); const n = await o.count();
  await o.nth(n - 1).scrollIntoViewIfNeeded(); await o.nth(n - 1).click({ force: true }); await page.waitForTimeout(8000);
  for (const mode of ["Month", "Week"]) {
    await page.getByRole("dialog").getByRole("button", { name: mode, exact: true }).click(); await page.waitForTimeout(3000);
    const m = await page.evaluate(() => { const d = document.querySelector("[role=dialog]"); const dr = d.getBoundingClientRect(); const hs = [...d.querySelectorAll("[role=columnheader]")].map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0,9), Math.round(r.left), Math.round(r.right)]; }); return { dialog: [Math.round(dr.left), Math.round(dr.right)], sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, heads: hs }; });
    console.log("tbl", w, mode, JSON.stringify(m));
    await page.screenshot({ path: `${D}/tbl-${mode}-${w}.png` });
  }
}
await b.close();
