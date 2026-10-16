import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = process.env.ORIGIN;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await walkSignIn(page, ORIGIN);
await page.goto(ORIGIN + "/data/a8bb1ef6-45a8-4022-9872-4bc622c91dd7", { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(8000);
const row = page.getByText("All Green Electronics Recycling", { exact: false }).first();
console.log("rowcount", await page.getByText("All Green Electronics Recycling").count());
await row.click({ timeout: 15000 }).catch((e) => console.log("click fail", e.message.slice(0, 100)));
await page.waitForTimeout(6000);
console.log("url", page.url());
const sim = page.getByText("Similar", { exact: true }).first();
await sim.scrollIntoViewIfNeeded().catch((e) => console.log("noSimilar", e.message.slice(0, 80)));
await page.waitForTimeout(3000);
const m = await page.evaluate(() => {
  const label = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && e.textContent.trim() === "Similar");
  if (!label) return null;
  let node = label, res = null;
  for (let i = 0; i < 10 && node; i++, node = node.parentElement) {
    const t = node.querySelector("table");
    if (t) { const sc = t.closest("[data-matrx-table-scroll]") || t.parentElement; res = { containerClient: sc.clientWidth, containerScroll: sc.scrollWidth, tableWidth: t.getBoundingClientRect().width, tableScrollWidth: t.scrollWidth, headers: [...t.querySelectorAll("th")].map((h) => [h.textContent.trim().slice(0, 20), Math.round(h.getBoundingClientRect().width), Math.round(h.scrollWidth)]), recordCol: Math.round(node.getBoundingClientRect().width) }; break; }
  }
  return res;
});
console.log(JSON.stringify(m));
await page.screenshot({ path: process.env.SHOT, fullPage: false });
await browser.close();
