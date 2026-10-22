/**
 * CD-PAY-04 walk (headless) as the portal client test@test.com: open her invoice on the portal,
 * check the amount is shown but not editable, press Pay, and read where Checkout opened (the
 * session id is checked against Stripe by the caller). Never enters a card.
 *   ORIGIN=https://www.aimatrx.com OUT=<dir> SLUG=<portal slug> REC=<record id> node scripts/cdpay04-portal-price-walk.mjs
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { signIn } from "./lib/seat-browser.mjs";

const ORIGIN = process.env.ORIGIN ?? "https://www.aimatrx.com";
const OUT = process.env.OUT ?? "/tmp/cdpay04";
const SLUG = process.env.SLUG;
const REC = process.env.REC;
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
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const out = {};
try {
  await signIn(page, ORIGIN, env.AI_MEMBER_USERNAME, env.AI_MEMBER_PASSWORD, "member");
  await page.goto(`${ORIGIN}/portal/c/${SLUG}/r/${REC}`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.screenshot({ path: `${OUT}/portal-01-record.png`, fullPage: true });
  out.text = (await page.locator("body").innerText()).slice(0, 2000);
  out.inputs = await page.locator("input:not([type=hidden]), textarea, [contenteditable=true]").count();
  const pay = page.locator('button:has-text("Pay")').first();
  out.payLabel = (await pay.count()) ? await pay.innerText() : null;
  if (out.payLabel) {
    await Promise.all([page.waitForURL(/checkout\.stripe\.com/, { timeout: 120000 }).catch(() => undefined), pay.click()]);
    out.checkoutUrl = page.url().split("#")[0];
    out.session = (page.url().match(/cs_(test|live)_[A-Za-z0-9]+/) ?? [null])[0];
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/portal-02-checkout.png`, fullPage: true });
  }
} finally {
  writeFileSync(`${OUT}/portal-walk.json`, JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ ...out, text: out.text?.slice(0, 600) }, null, 1));
  await browser.close();
}
