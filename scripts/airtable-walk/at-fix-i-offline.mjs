// AT-FIX-I offline capture: load online, go offline, answer 2 questions, Capture; report what the page shows; then back online.
import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = process.env.ORIGIN ?? "http://s96c6068c.localhost:3001";
const SHEET = process.argv[2];
const ROUNDS = Number(process.argv[3] ?? 1);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
ctx.setDefaultNavigationTimeout(240000);
const page = await ctx.newPage();
const log = (...a) => console.log(...a);
page.on("console", (m) => ["error", "warning"].includes(m.type()) && !/Failed to load resource|WebSocket|ssr-timing|realtime|CORS|config-attestation/.test(m.text()) && log("  [console]", m.type(), m.text().slice(0, 700)));
page.on("pageerror", (e) => log("  [pageerror]", String(e).slice(0, 500)));

log("who", await walkSignIn(page, ORIGIN, { member: false }).catch((e) => "ERR " + e.message));
await page.goto(`${ORIGIN}/capture/${SHEET}`, { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="capture-ask"]', { timeout: 240000 });
log("loaded online; ask =", await page.textContent('[data-testid="capture-ask"]'));
await page.waitForTimeout(2500);
await ctx.setOffline(true);
log("offline");
for (let r = 1; r <= ROUNDS; r++) {
  await page.fill('[data-testid="capture-input-name"]', `Offline Echo ${r}`);
  await page.click('[data-testid="capture-nextq"]');
  await page.waitForTimeout(2500);
  const ask = await page.textContent('[data-testid="capture-ask"]').catch(() => null);
  log(`round ${r} after Next: ask =`, ask, "| h1 =", await page.textContent("h1").catch(() => null));
  if (!ask) break;
  await page.fill('[data-testid="capture-input-qty"]', String(r * 10), { timeout: 8000 }).catch(async (e) => { log('FILL FAILED; body:', (await page.innerText('body')).slice(0, 400).replace(/\n/g, ' | ')); await page.screenshot({ path: '/tmp/atfi-fail.png' }); throw e; });
  await page.click('[data-testid="capture-submit"]');
  await page.waitForTimeout(2000);
  log(`round ${r} thank-you:`, await page.textContent('[data-testid="capture-thankyou"]').catch(() => "none"), "| waiting:", await page.textContent('[data-testid="capture-waiting"]').catch(() => null));
  await page.click('[data-testid="capture-next"]').catch(() => {});
}
await page.screenshot({ path: `/tmp/atfi-offline-${Date.now()}.png` });
await ctx.setOffline(false);
log("online");
await page.waitForTimeout(15000);
log("after reconnect waiting:", await page.textContent('[data-testid="capture-waiting"]').catch(() => null), "| synced:", await page.textContent('[data-testid="capture-last-synced"]').catch(() => null));
await browser.close();
