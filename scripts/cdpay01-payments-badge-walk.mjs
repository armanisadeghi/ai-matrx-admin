/**
 * CD-PAY-01 walk (headless) as admin@admin.com: Ashford Labs > Settings > Payments.
 * Records every badge text the page ever showed (MutationObserver from first paint), so a flash of
 * "Taking payments" / "Not connected" before the real state is caught, and screenshots the page.
 *   ORIGIN=https://www.aimatrx.com OUT=<dir> node scripts/cdpay01-payments-badge-walk.mjs
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { signIn } from "./lib/seat-browser.mjs";

const ORIGIN = process.env.ORIGIN ?? "https://www.aimatrx.com";
const OUT = process.env.OUT ?? "/tmp/cdpay01";
const ORG = process.env.ORG ?? "c19a81b7-f65f-4c01-b04c-00f97f8b7e4d";
const WORDS = ["Taking payments", "Test account", "Not connected", "Connected", "Connect live Stripe", "Connect Stripe"];
mkdirSync(OUT, { recursive: true });
const env = {};
for (const file of [".env", ".env.local"]) {
  const path = new URL(`../${file}`, import.meta.url);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on("response", (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url().split("?")[0]}`); });
try {
  await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
  await context.addInitScript((words) => {
    window.__seen = [];
    const scan = () => {
      const main = document.querySelector("main") ?? document.body;
      if (!main) return;
      const text = main.innerText || "";
      const hit = words.filter((w) => text.includes(w)).join(" | ");
      const last = window.__seen[window.__seen.length - 1];
      if (hit !== (last?.hit ?? null)) window.__seen.push({ t: Math.round(performance.now()), hit, path: location.pathname, sample: text.slice(0, 160) });
    };
    new MutationObserver(scan).observe(document, { childList: true, subtree: true, characterData: true });
    document.addEventListener("DOMContentLoaded", scan);
  }, WORDS);
  const res = await page.goto(`${ORIGIN}/organizations/${ORG}/settings/payments`, { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: `${OUT}/payments-badge.png`, fullPage: true });
  const seen = await page.evaluate(() => window.__seen);
  const text = await page.evaluate(() => (document.querySelector("main") ?? document.body).innerText.slice(0, 1500));
  const result = { status: res?.status(), url: page.url(), seen, text, errors };
  writeFileSync(`${OUT}/payments-badge.json`, JSON.stringify(result, null, 1));
  console.log(JSON.stringify(result, null, 1));
} finally {
  await browser.close();
}
