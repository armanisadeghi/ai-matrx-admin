// Shared headless sign-in for the Airtable walks: `pnpm dev-login` nonce URL (no typed credentials),
// plus the walk-cap parked page handling (utils/supabase/walkCap.ts: the parked page at /__dev-walk
// has a "Resume this preview" form; a full cap answers 503, so we wait in a bounded loop).
import { execFileSync } from "node:child_process";
import { markBrowserAgentTraffic } from "../lib/agent-traffic.mjs";
const REPO = new URL("../..", import.meta.url).pathname;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const MAX_WAIT_MS = 60 * 60_000;

const parked = (page) => page.url().includes("/__dev-walk");

/** If the page is the parked page, press Resume; if the cap is full, wait and retry (bounded). */
export async function resumeIfParked(page, label = "walk") {
  const start = Date.now();
  while (Date.now() - start < MAX_WAIT_MS) {
    if (!parked(page)) {
      const body = await page.locator("body").innerText({ timeout: 5000 }).catch(() => "");
      if (!/preview was paused|walk cap|slots? (is|are) (busy|full)/i.test(body.slice(0, 600))) return true;
    }
    const btn = page.locator('button:has-text("Resume this preview")');
    if (await btn.count()) {
      console.log(`[walk-signin] ${label}: parked — pressing Resume`);
      await Promise.all([page.waitForLoadState("domcontentloaded").catch(() => {}), btn.first().click()]);
    } else {
      console.log(`[walk-signin] ${label}: cap full or paused with no Resume form — waiting 20s`);
      await sleep(20_000);
      await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    }
    await sleep(1500);
  }
  throw new Error(`${label}: not admitted within 30 minutes`);
}

/** Mint a dev-login nonce for this host and sign `page` in (admin, or test@test.com with member). Returns the signed-in email. */
export async function walkSignIn(page, origin, { member = false, who = member ? "member" : "admin" } = {}) {
  // The released site (https://www.aimatrx.com) has no dev-login: the test seat signs in with its .env.local password.
  if (!/^http:\/\/([a-z0-9-]+\.)?localhost(:\d+)?$/i.test(origin.replace(/\/$/, ""))) {
    const { readFileSync } = await import("node:fs");
    const { signIn } = await import("../lib/seat-browser.mjs");
    const env = Object.fromEntries(readFileSync(`${REPO}/.env.local`, "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, "")]));
    const [user, pass] = member ? [env.AI_MEMBER_USERNAME, env.AI_MEMBER_PASSWORD] : [env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD];
    return signIn(page, origin.replace(/\/$/, ""), user, pass, who);
  }
  await markBrowserAgentTraffic(page.context(), "airtable-walk", origin);
  const deadline = Date.now() + MAX_WAIT_MS;
  for (let attempt = 1; Date.now() < deadline; attempt += 1) {
    const out = execFileSync("bash", ["scripts/dev-login.sh", ...(member ? ["--member"] : []), "/dashboard"], { cwd: REPO, encoding: "utf8" });
    const url = out.match(/OPEN\s*:\s*(\S+)/)?.[1];
    if (!url) throw new Error("dev-login printed no OPEN url: " + out.slice(0, 200));
    await page.goto(url.replace(/^http:\/\/[^/]+/, origin), { waitUntil: "domcontentloaded", timeout: 180000 }).catch(() => {});
    if (parked(page) || /preview was paused/i.test(await page.locator("body").innerText({ timeout: 5000 }).catch(() => ""))) {
      await resumeIfParked(page, who);
    }
    // the nonce page redirects after domcontentloaded; a slow server destroys the context mid-evaluate — settle, then retry
    let email = null;
    for (let t = 0; t < 6 && !email; t += 1) {
      await page.waitForLoadState("load", { timeout: 60000 }).catch(() => {});
      email = await page.evaluate(async () => { try { return (await (await fetch("/api/whoami")).json())?.email ?? null; } catch { return null; } }).catch(() => null);
      if (!email) await sleep(3000);
    }
    if (email) return email;
    console.log(`[walk-signin] ${who}: attempt ${attempt} not signed in yet (url ${page.url().slice(0, 80)}) — retrying`);
    await sleep(10_000);
  }
  throw new Error(`${who} never signed in within 30 minutes`);
}
