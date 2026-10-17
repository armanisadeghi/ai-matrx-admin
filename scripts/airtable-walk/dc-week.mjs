import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = "http://s96c6068c.localhost:3001"; const [,, D, path, tag] = process.argv;
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } }); ctx.setDefaultNavigationTimeout(240000);
const page = await ctx.newPage();
await walkSignIn(page, ORIGIN);
for (const w of [375, 768, 1600]) {
  await page.setViewportSize({ width: w, height: w === 375 ? 812 : 1000 });
  await page.goto(ORIGIN + path, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(12000);
  const cal = page.locator("button, [role=tab]").filter({ hasText: /^Calendar/ }).first();
  await cal.scrollIntoViewIfNeeded(); await cal.click({ force: true }); await page.waitForTimeout(3000); await page.keyboard.press("Escape");
  const wk = page.getByRole("button", { name: "Week", exact: true }).last();
  await wk.scrollIntoViewIfNeeded(); await wk.click(); await page.waitForTimeout(4000);
  const m = await page.evaluate(() => { const hs = [...document.querySelectorAll("[role=columnheader]")].map(e => { const r = e.getBoundingClientRect(); return [e.textContent.trim().slice(0,9), Math.round(r.left), Math.round(r.right)]; }); return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, heads: hs, loading: (document.body.innerText.match(/Loading…/g) || []).length }; });
  console.log(tag, w, JSON.stringify(m));
  await page.screenshot({ path: `${D}/${tag}-week-${w}.png` });
}
await b.close();
