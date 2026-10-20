// CAPTURE-OFFLINE-SHELL walk: open the sheet online, go offline, RELOAD, add 2 answers, go online; rows land.
// Runs against a production build on a spare port (a service worker needs one). Sign-in: the dev-login nonce on the
// shared preview (plain localhost), whose cookie the spare port (same host name) reads.
import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const SIGN_IN_ORIGIN = process.env.SIGN_IN_ORIGIN ?? "http://localhost:3001";
const ORIGIN = process.env.ORIGIN;
const SHEET = process.argv[2];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
ctx.setDefaultNavigationTimeout(120000);
const page = await ctx.newPage();
const log = (...a) => console.log(...a);
page.on("pageerror", (e) => log("  [pageerror]", String(e).slice(0, 300)));
log("who", await walkSignIn(page, SIGN_IN_ORIGIN, { member: false }).catch((e) => "ERR " + e.message));
await page.goto(`${ORIGIN}/capture/${SHEET}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="capture-ask"]', { timeout: 120000 });
log("1 loaded online; ask =", await page.textContent('[data-testid="capture-ask"]'));
await page.waitForTimeout(9000); // worker registers + keeps the page (3 s after mount)
const kept = await page.evaluate(async () => {
  const names = await caches.keys();
  const out = {};
  for (const n of names) out[n] = (await (await caches.open(n)).keys()).length;
  return { controlled: !!navigator.serviceWorker.controller, caches: out };
});
log("1b worker:", JSON.stringify(kept));
await ctx.setOffline(true);
log("2 offline; reloading");
await page.reload({ waitUntil: "domcontentloaded" }).catch((e) => log("RELOAD ERR", e.message.slice(0, 200)));
const shown = await page.waitForSelector('[data-testid="capture-ask"]', { timeout: 60000 }).then(() => true).catch(() => false);
log("3 after offline reload: capture-ask shown =", shown, "| title/body:", (await page.innerText("body").catch(() => "")).slice(0, 120).replace(/\n/g, " | "));
if (shown) {
  for (let r = 1; r <= 2; r++) {
    await page.fill('[data-testid="capture-input-name"]', `Offline Shell ${r}`);
    await page.click('[data-testid="capture-nextq"]');
    await page.waitForSelector('[data-testid="capture-input-qty"]');
    await page.fill('[data-testid="capture-input-qty"]', String(r * 10));
    await page.click('[data-testid="capture-submit"]');
    await page.waitForTimeout(1500);
    log(`4 answer ${r}: waiting =`, await page.textContent('[data-testid="capture-waiting"]').catch(() => null));
    await page.click('[data-testid="capture-next"]').catch(() => {});
  }
}
await ctx.setOffline(false);
log("5 back online");
await page.waitForTimeout(20000);
log("6 after reconnect: waiting =", await page.textContent('[data-testid="capture-waiting"]').catch(() => null), "| synced =", await page.textContent('[data-testid="capture-last-synced"]').catch(() => null));
await browser.close();
