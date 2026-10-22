/**
 * CD-PAY-11 walk (headless, own preview host, LIVE database) as admin@admin.com:
 * Ridgeline Physical Therapy > Settings > Domains — connect HOST, wait for Live, map /docs to the
 * published Spaces page, screenshot. `remove` phase removes the domain through the same page.
 *   ORIGIN=http://close-pay.localhost:3001 OUT=<dir> node scripts/cdpay11-domain-space-walk.mjs connect|remove
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { signIn, until } from "./lib/seat-browser.mjs";

const ORIGIN = process.env.ORIGIN ?? "http://close-pay.localhost:3001";
const OUT = process.env.OUT ?? "/tmp/cdpay11";
const ORG = "0fec03d8-afe5-4ea0-bf14-d0ab18e4a536";
const HOST = process.env.HOST_NAME ?? "ridge-pages.kidsmatrx.com";
const PAGE_TITLE = "Knee Recovery Home Program";
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
const phase = process.argv[2] ?? "connect";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 1000 } })).newPage();
const errors = [];
page.on("response", (r) => { if (r.url().includes("/domains") || r.url().includes("/rpc/org_domain")) console.log("net", r.status(), r.url().split("?")[0].slice(-80)); if (r.status() >= 500) errors.push(`${r.status()} ${r.url()}`); });
try {
  await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
  for (let i = 0; i < 6; i += 1) {
    const res = await page.goto(`${ORIGIN}/organizations/${process.env.ORG_PATH ?? ORG}/settings/domains`, { waitUntil: "domcontentloaded", timeout: 240000 });
    if (res && res.status() < 500) break;
    console.log("page answered", res?.status(), "- the preview is busy; trying again");
    await page.waitForTimeout(15000);
  }
  await page.locator(`input[aria-label="Domain"], h2:text-is("${HOST}")`).first().waitFor({ timeout: 240000 });
  await page.screenshot({ path: `${OUT}/${phase}-01-open.png`, fullPage: true });
  if (phase === "connect" || phase === "route") {
    if (phase === "connect" && !(await page.locator(`text=${HOST}`).count())) {
      await page.fill('input[aria-label="Domain"]', HOST);
      await page.click('button:has-text("Connect domain")');
    }
    const live = await until("Live", async () => {
      if (await page.locator("text=Live").first().isVisible().catch(() => false)) return true;
      const b = page.locator('button:has-text("Check now")').first();
      if (await b.isVisible().catch(() => false)) await b.click().catch(() => undefined);
      return null;
    }, 240000);
    console.log("live:", !!live.v);
    await page.screenshot({ path: `${OUT}/${phase}-02-live.png`, fullPage: true });
    await page.fill('input[aria-label="Path"]', "/docs");
    const shows = page.locator('[aria-label="Shows"]').first();
    const tag = await shows.evaluate((e) => e.tagName);
    console.log("Shows control:", tag);
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await shows.click();
    await page.waitForTimeout(800);
    await page.getByText(PAGE_TITLE).last().click();
    await page.screenshot({ path: `${OUT}/${phase}-02b-picked.png`, fullPage: true });
    await page.click('button:has-text("Save")');
    const mapped = await until("route shown", async () => (await page.locator(`text=${HOST}/docs`).count()) ? true : null, 60000);
    console.log("route /docs shown:", !!mapped.v);
    await page.screenshot({ path: `${OUT}/${phase}-03-route.png`, fullPage: true });
  } else {
    await page.locator('section button:text-is("Remove")').last().click();
    await page.click('button:has-text("Remove — its pages stop working")');
    const gone = await until("gone", async () => (await page.locator(`h2:text-is("${HOST}")`).count()) && !(await page.locator("text=Removed").count()) ? null : true, 90000);
    console.log("removed:", !!gone.v);
    await page.screenshot({ path: `${OUT}/${phase}-02-removed.png`, fullPage: true });
  }
  console.log("5xx:", errors);
} finally {
  await browser.close();
}
