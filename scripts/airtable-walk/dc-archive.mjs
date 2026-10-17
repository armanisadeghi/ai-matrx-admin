import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = "http://s96c6068c.localhost:3001"; const D = process.argv[2];
const MINE = new Set(["Request a task", "Projects", "Tasks", "Team", "Interactions", "Log an investor interaction", "Rounds", "Updates", "Cap table", "Investors"]);
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } }); ctx.setDefaultNavigationTimeout(240000);
const page = await ctx.newPage(); await walkSignIn(page, ORIGIN);
await page.goto(ORIGIN + "/data", { waitUntil: "domcontentloaded" }); await page.waitForTimeout(12000);
let done = 0;
for (let round = 0; round < 14; round++) {
  const cards = page.locator("div").filter({ has: page.locator('button[aria-label], button:has(svg)') });
  const target = await page.evaluate((mine) => {
    const hits = [...document.querySelectorAll("*")].filter(e => /Cedar Ridge Physical Therapy · Table/.test(e.innerText || "") && /^\d+m ago/m.test(e.innerText || "") && (e.innerText || "").length < 160 && e.querySelector('button'));
    hits.reverse();
    for (const e of hits) { const name = e.innerText.split("\n")[0].trim(); const m = +(e.innerText.match(/(\d+)m ago/)?.[1] ?? 999); if (mine.includes(name) && m >= 30 && m <= 90) { e.setAttribute("data-dc-target", "1"); return name + " | " + m; } }
    return null;
  }, [...MINE]);
  if (!target) break;
  console.log("target", target);
  const card = page.locator("[data-dc-target]").first();
  await card.hover();
  await card.locator("button").last().click(); await page.waitForTimeout(2500);
  await page.screenshot({ path: D + "/arch-menu.png" });
  const item = page.getByText(/^Archive$|^Archive /).first();
  
  if (!(await item.isVisible().catch(() => false))) { console.log("no archive item"); break; }
  await item.click(); await page.waitForTimeout(1500);
  const ok = page.getByRole("button", { name: /^Archive/ }).last();
  if (await ok.isVisible().catch(() => false)) await ok.click();
  await page.waitForTimeout(3500); done++;
  await page.evaluate(() => document.querySelectorAll("[data-dc-target]").forEach(e => e.removeAttribute("data-dc-target")));
}
console.log("archived", done);
await page.screenshot({ path: D + "/arch-after.png" });
await b.close();
