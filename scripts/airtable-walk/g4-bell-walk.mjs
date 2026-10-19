// AT-FIX-G4: admin opens the bell, finds the follow notice for a record, opens it, and checks it landed in a NEW tab.
// Usage: ORIGIN=... MATCH="changed|commented" node g4-bell-walk.mjs <table> <row>
import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
import { ORIGIN } from "./lib.mjs";
const [TABLE, ROW] = process.argv.slice(2);
const MATCH = new RegExp(process.env.MATCH ?? "changed|commented", "i");
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
ctx.setDefaultNavigationTimeout(180000);
const page = await ctx.newPage();
console.log("who", await walkSignIn(page, ORIGIN, { member: false }));
await page.goto(`${ORIGIN}/data/${TABLE}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForSelector("[data-table-toolbar]", { timeout: 200000 }).catch(() => {});
const bell = page.getByRole("button", { name: /notification/i }).first();
console.log("bell buttons", await page.getByRole("button", { name: /notif/i }).count());
await bell.click();
await page.waitForTimeout(3000);
const items = await page.evaluate(() => [...document.querySelectorAll("[data-matrx-notice-surface] a, [data-matrx-notice-surface] [role=button], [data-matrx-notice-surface] li")].map((e) => (e.innerText || "").replace(/\s+/g, " ").slice(0, 120)));
console.log("notice items", JSON.stringify(items.slice(0, 12)));
await page.screenshot({ path: "/tmp/g4-bell.png" });
const before = ctx.pages().length;
const target = page.locator("[data-matrx-notice-surface]").getByText(MATCH).first();
const n = await target.count();
console.log("matching notices", n);
if (n) {
  const [popup] = await Promise.all([ctx.waitForEvent("page", { timeout: 20000 }).catch(() => null), target.click()]);
  await page.waitForTimeout(2500);
  console.log("same-tab url after click", page.url().replace(ORIGIN, ""));
  console.log("pages", before, "->", ctx.pages().length, "new tab url", popup ? popup.url().replace(ORIGIN, "") : null);
  if (popup) { await popup.waitForLoadState("domcontentloaded").catch(() => {}); await popup.waitForTimeout(6000); console.log("new tab url settled", popup.url().replace(ORIGIN, ""), "mentions row", (await popup.evaluate(() => document.body.innerText)).includes("Followed row")); await popup.screenshot({ path: "/tmp/g4-bell-newtab.png" }); }
}
await browser.close();
