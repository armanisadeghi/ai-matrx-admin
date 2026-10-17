import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = "http://s96c6068c.localhost:3001"; const [,, D, path] = process.argv;
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } }); ctx.setDefaultNavigationTimeout(240000);
const page = await ctx.newPage();
await walkSignIn(page, ORIGIN);
for (const w of [1600, 375]) {
  await page.setViewportSize({ width: w, height: w === 375 ? 812 : 1000 });
  await page.goto(ORIGIN + path, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(12000);
  const r = await page.evaluate(() => { const ul = document.querySelector(".spaces-chart-legend"); ul.scrollIntoView(); for (let i = 0; i < 30; i++) { const li = ul.firstElementChild.cloneNode(true); li.querySelector("b").textContent = "Extra slice " + i; ul.appendChild(li); } return { scroll: ul.scrollHeight, client: ul.clientHeight, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
  console.log("many", w, JSON.stringify(r));
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${D}/many-${w}.png` });
}
await b.close();
