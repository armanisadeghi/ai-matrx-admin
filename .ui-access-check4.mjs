import { chromium } from "playwright";
import fs from "node:fs";
const S = process.argv[2];
const url = fs.readFileSync(`${S}/login_url`, "utf8").trim();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 2400, height: 1000 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForSelector('[data-records-restricted="hourly_rate"]', { timeout: 120000 });
async function openPanel() {
  const header = page.locator("th", { hasText: /hourly rate/i }).first();
  await page.waitForTimeout(1500);
  await header.locator('button[aria-label^="Sort or filter"]').first().click({ force: true });
  await page.waitForTimeout(800);
  await page.getByText(/Who can see and edit/).first().click();
  const dlg = page.getByRole("dialog", { name: /Who can see and edit/ });
  await dlg.waitFor({ timeout: 30000 });
  await page.waitForTimeout(2500);
  return dlg;
}
let dlg = await openPanel();
await dlg.locator("input").first().fill("Pay");
await page.waitForTimeout(1500);
const row = dlg.locator("div.flex.items-center.justify-between", { hasText: "Editors" }).first();
console.log("editors row html:", (await row.innerHTML()).replace(/class="[^"]*"/g, "").slice(0, 700));
console.log("console errors:", errors.length, errors.slice(0, 4));
await browser.close();
