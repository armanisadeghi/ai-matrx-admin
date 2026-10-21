// Lane BUILD-A (BA-) live walks on https://www.aimatrx.com: headless Playwright signed in through /login with the
// .env.local credentials (never printed), store clients from at-fix-j-lib, and the table/automation openers.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { env } from "./lib.mjs";
export { admin, member, must, ORG } from "./at-fix-j-lib.mjs";
export const LIVE = process.env.ORIGIN ?? "https://www.aimatrx.com";
export const SHOTS = process.env.HOME + "/lane-resume/ba-shots/";
mkdirSync(SHOTS, { recursive: true });
export const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))));
export async function live(asMember = false) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
  ctx.setDefaultNavigationTimeout(180000);
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
  await page.goto(`${LIVE}/login`, { timeout: 120000 });
  await page.waitForSelector('input[type="email"]', { timeout: 60000 });
  await page.fill('input[type="email"]', asMember ? env.AI_MEMBER_USERNAME : env.AI_ADMIN_USERNAME);
  await page.fill('input[type="password"]', asMember ? env.AI_MEMBER_PASSWORD : env.AI_ADMIN_PASSWORD);
  await page.evaluate(() => document.querySelector("form")?.requestSubmit());
  await page.waitForFunction(() => !document.querySelector('input[type="email"]'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const who = await page.evaluate(async () => (await (await fetch("/api/whoami")).json().catch(() => null))?.email ?? null).catch(() => null);
  return { browser, ctx, page, who, errs, shot: (n) => page.screenshot({ path: SHOTS + n + ".png" }).catch(() => {}) };
}
export async function gotoTable(page, id) {
  await page.goto(`${LIVE}/data/${id}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 });
  await page.getByRole("button", { name: "Table menu" }).first().waitFor({ timeout: 240000 });
  await page.waitForTimeout(2500);
}
export async function openAutomations(page) {
  await page.getByRole("button", { name: "Table menu" }).first().click();
  await page.waitForTimeout(500);
  await page.getByText("Built on it").first().click().catch(() => {});
  await page.waitForTimeout(400);
  await page.getByRole("menuitem", { name: /Automations/ }).first().click();
  await page.waitForFunction(() => (document.querySelector("[role=dialog]")?.innerText ?? "").replace(/Automations|Close/g, "").trim().length > 10, null, { timeout: 150000 }).catch(() => {});
  await page.waitForTimeout(1500);
}
