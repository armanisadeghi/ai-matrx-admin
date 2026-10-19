// AT-WALK-H shared bits: a signed-in headless browser per identity, with the session cached in a state file (sign-in on a cold preview
// costs minutes), a step logger and a screenshot helper. WHO=admin|member.
import { chromium } from "playwright";
import { existsSync, statSync, mkdirSync } from "node:fs";
import { walkSignIn } from "./walk-signin.mjs";
import { ORIGIN } from "./lib.mjs";
export { ORIGIN };
export const SHOTS = process.env.HOME + "/lane-resume/atwh-shots/";
mkdirSync(SHOTS, { recursive: true });
export const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))));
export async function open(member = false) {
  const state = `/tmp/atwh-state-${member ? "member" : "admin"}.json`;
  const fresh = existsSync(state) && Date.now() - statSync(state).mtimeMs < 25 * 60_000;
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, ...(fresh ? { storageState: state } : {}) });
  ctx.setDefaultNavigationTimeout(180000);
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
  let who = null;
  if (fresh) who = await page.goto(ORIGIN + "/dashboard", { waitUntil: "domcontentloaded" }).then(() => page.evaluate(async () => (await (await fetch("/api/whoami")).json())?.email ?? null)).catch(() => null);
  if (!who) { who = await walkSignIn(page, ORIGIN, { member }); await ctx.storageState({ path: state }); }
  return { browser, ctx, page, who, errs, shot: (n) => page.screenshot({ path: SHOTS + n + ".png" }).catch(() => {}) };
}
export const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
export async function gotoTable(page, id) {
  await page.goto(`${ORIGIN}/data/${id}`, { waitUntil: "domcontentloaded", timeout: 240000 });
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
  await page.waitForFunction(() => (document.querySelector('[role=dialog]')?.innerText ?? '').replace(/Automations|Close/g, '').trim().length > 10, null, { timeout: 150000 }).catch(() => {});
  await page.waitForTimeout(1500);
}
