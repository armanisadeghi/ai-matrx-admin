// AT-WALK-H shared bits: a signed-in headless browser per identity, with the session cached in a state file (sign-in on a cold preview
// costs minutes), a step logger and a screenshot helper. WHO=admin|member.
import { chromium } from "playwright";
import { existsSync, statSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { walkSignIn } from "./walk-signin.mjs";
import { ORIGIN } from "./lib.mjs";
export { ORIGIN };
export const SHOTS = process.env.HOME + "/lane-resume/atfj2-shots/";
mkdirSync(SHOTS, { recursive: true });
export const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))));
export async function open(member = false) {
  const state = `/tmp/atfj2-state-${member ? "member" : "admin"}.json`;
  const fresh = existsSync(state) && Date.now() - statSync(state).mtimeMs < 25 * 60_000;
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, ...(fresh ? { storageState: state } : {}) });
  ctx.setDefaultNavigationTimeout(180000);
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
  let who = null;
  if (fresh) who = await page.goto(ORIGIN + "/dashboard", { waitUntil: "domcontentloaded" }).then(() => page.evaluate(async () => (await (await fetch("/api/whoami")).json())?.email ?? null)).catch(() => null);
  if (!who && member) {
    // The member's nonce lands on /welcome, a heavy page whose domcontentloaded can take minutes on a cold server: wait for the redirect to commit, then ask whoami.
    for (let i = 0; i < 6 && !who; i++) {
      const out = execFileSync("bash", ["scripts/dev-login.sh", "--member", "/dashboard"], { cwd: new URL("../..", import.meta.url).pathname, encoding: "utf8" });
      const url = out.match(/OPEN\s*:\s*(\S+)/)[1].replace(/^http:\/\/[^/]+/, ORIGIN);
      await page.goto(url, { waitUntil: "commit", timeout: 120000 }).catch(() => {});
      await page.waitForTimeout(10000);
      who = await page.evaluate(async () => (await (await fetch("/api/whoami")).json())?.email ?? null).catch(() => null);
    }
    await ctx.storageState({ path: state });
  }
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

// Settings > Language & Region as the signed-in person: save `zone` (IANA, e.g. Asia/Tokyo) or, with null, switch back to the device's zone.
export const makeSetZone = (page, say) => async (zone) => {
  await page.goto(`${ORIGIN}/dashboard`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(5000);
  await page.locator('[aria-label*="ettings" i]').first().click(); await page.waitForTimeout(2000);
  await page.getByText("Preferences", { exact: true }).first().click(); await page.waitForTimeout(2500);
  await page.getByText("Language & Region").first().click(); await page.waitForTimeout(2000);
  const sw = page.getByRole("switch", { name: /device's time zone/i }).first();
  if (zone) {
    if ((await sw.getAttribute("aria-checked")) === "true") { await sw.click(); await page.waitForTimeout(800); }
    await page.getByRole("combobox").filter({ hasText: /\// }).first().click().catch(async () => { await page.getByText("Where today starts for you.").locator("xpath=following::button[1]").click(); });
    await page.waitForTimeout(500); await page.keyboard.type(zone.split("/")[1], { delay: 60 }); await page.waitForTimeout(800);
    await page.getByRole("option", { name: new RegExp(zone.split("/")[1], "i") }).first().click(); await page.waitForTimeout(3000);
  } else if ((await sw.getAttribute("aria-checked")) !== "true") { await sw.click(); await page.waitForTimeout(3000); }
  say("switch", await sw.getAttribute("aria-checked"));
};
