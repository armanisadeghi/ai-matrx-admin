import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = process.env.ORIGIN, href = process.env.HREF;
const browser = await chromium.launch();
const seed = await browser.newContext(); const sp = await seed.newPage();
await walkSignIn(sp, ORIGIN, { member: true });
const state = await seed.storageState(); state.origins = [];
const ctx = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
const w = await ctx.newPage(); await w.goto(ORIGIN + href, { waitUntil: "domcontentloaded", timeout: 180000 }); await w.waitForTimeout(9000); await w.close();
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__snap = [];
  const t0 = performance.now();
  const tick = () => {
    const ths = [...document.querySelectorAll("thead th")];
    const s = ths.length ? ths.map((t) => (t.textContent||"").trim().slice(0,10) + ":" + Math.round(t.getBoundingClientRect().width) + (t.querySelectorAll("svg").length ? "s" + t.querySelectorAll("svg").length : "")).join(" ") + " tbodyRows=" + document.querySelectorAll("tbody tr").length : "";
    if (s !== window.__last) { window.__last = s; window.__snap.push([Math.round(performance.now() - t0), s]); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await page.goto(ORIGIN + href, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(20000);
console.log(JSON.stringify(await page.evaluate(() => window.__snap), null, 1));
await browser.close();
