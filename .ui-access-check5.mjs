import { chromium } from "playwright";
import fs from "node:fs";
const S = process.argv[2];
const url = fs.readFileSync(`${S}/login_url`, "utf8").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 2400, height: 1000 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
async function resumeIfParked() {
  for (let n = 1; n <= 8; n++) {
    await sleep(1500);
    const parked = page.url().includes("__dev-walk") || (await page.getByRole("button", { name: /Resume/ }).count()) > 0;
    if (!parked) return;
    console.log(`[walk] parked (try ${n}) — resuming`);
    await page.getByRole("button", { name: /Resume/ }).first().click().catch(() => {});
    await sleep(4000 * n);
  }
}
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 240000 });
await resumeIfParked();
await page.waitForSelector('[data-records-restricted="hourly_rate"]', { timeout: 240000 }).catch(async () => { await resumeIfParked(); });
await page.waitForSelector('[data-records-restricted="hourly_rate"]', { timeout: 120000 });
async function openPanel() {
  const header = page.locator("th", { hasText: /hourly rate/i }).first();
  await sleep(1500);
  await header.locator('button[aria-label^="Sort or filter"]').first().click({ force: true });
  await sleep(800);
  await page.getByText(/Who can see and edit/).first().click();
  const dlg = page.getByRole("dialog", { name: /Who can see and edit/ });
  await dlg.waitFor({ timeout: 30000 });
  await sleep(2500);
  return dlg;
}
const seatRow = (dlg, label) => dlg.locator("div.flex.items-center.justify-between", { has: page.locator(`span:text-is("${label}")`) }).first();
let dlg = await openPanel();
await dlg.locator("input").first().fill("Pay");
await sleep(1500);
const ed = seatRow(dlg, "Editors");
console.log("editors row:", (await ed.innerHTML()).replace(/class="[^"]*"/g, "").replace(/\s+/g, " ").slice(0, 500));
for (const label of ["Editors", "Employee on that row"]) {
  const row = seatRow(dlg, label);
  const read = row.getByText("Read", { exact: true }).first();
  await read.click({ timeout: 10000 }).catch(async (e) => { console.log(`click Read in ${label} failed:`, String(e).split("\n")[0]); });
  await sleep(1200);
}
await sleep(2500);
console.log("footer:", (await dlg.innerText()).replace(/\s+/g, " ").slice(-120));
await page.screenshot({ path: `${S}/ui5_proposed.png` });
await dlg.getByRole("button", { name: "Save" }).click();
await sleep(3500);
console.log("toast:", (await page.locator("[data-sonner-toast]").allInnerTexts()).join(" | ").slice(0, 200));
dlg = await openPanel();
for (const label of ["Editors", "Employee on that row", "Viewers and commenters"]) {
  const row = seatRow(dlg, label);
  const sel = await row.locator('[aria-checked="true"], [data-state="on"], [aria-pressed="true"], [aria-selected="true"]').allInnerTexts();
  console.log(`after reopen ${label}:`, sel.join(","));
}
await page.screenshot({ path: `${S}/ui5_reopened.png` });
console.log("console errors:", errors.length, errors.slice(0, 4));
await browser.close();
