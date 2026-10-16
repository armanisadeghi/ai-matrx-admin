/**
 * MKT-184 — one Smart Add Create with the Error Inspector open through the whole click, as admin@admin.com on
 * this session's preview (LIVE database). Records every HTTP 409 and every 23505 the page receives from the
 * moment the inspector opens until the validate page loads, and screenshots the inspector after the click.
 *
 *   ORIGIN=http://<session>.localhost:3001 SUBJECT="Name|https://site" node scripts/smart-add-create-409-walk.mjs
 *
 * Writes: one brand (and its found items) created by admin@admin.com from the subject typed — what Create does.
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { signIn, sleep } from "./lib/seat-browser.mjs";

const ORIGIN = process.env.ORIGIN;
const OUT = process.env.OUT ?? "/tmp/matrx-evidence/mkt-184";
const [, SITE] = (process.env.SUBJECT ?? "").split("|");
if (!ORIGIN || !SITE) throw new Error("ORIGIN and SUBJECT=name|site are required");
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
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
let watching = false;
const conflicts = [];
page.on("response", async (r) => {
  if (!watching || r.status() !== 409) return;
  let body = "";
  try { body = (await r.text()).slice(0, 300); } catch { /* streamed */ }
  conflicts.push(`${r.status()} ${r.request().method()} ${r.url().split("?")[0]} ${body}`);
});
page.on("console", (m) => { if (watching && /23505|duplicate key/i.test(m.text())) conflicts.push(`console: ${m.text().slice(0, 300)}`); });
try {
  const who = await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD, "admin");
  console.log(`INFO signed in as ${who === env.AI_ADMIN_USERNAME ? "admin@admin.com" : who}`);
  await page.goto(`${ORIGIN}/marketing/brands/smart-add/company`, { waitUntil: "domcontentloaded", timeout: 240000 });
  const resume = page.getByText("Resume this preview");
  if (await resume.isVisible({ timeout: 5000 }).catch(() => false)) await resume.click();
  const website = page.getByLabel("Website");
  await website.waitFor({ timeout: 240000 });
  await website.fill(SITE);
  await website.press("Enter");
  const create = page.getByRole("button", { name: "Create and validate" });
  await create.waitFor({ timeout: 120000 });
  for (let i = 0; i < 90 && !(await create.isEnabled()); i++) await sleep(2000);
  await sleep(60000); // let the round's findings land before Create
  await page.screenshot({ path: `${OUT}/1-before-create.png` });
  // Open the Error Inspector from the avatar menu (Admin group) and keep it open through the click.
  const avatar = page.locator("header button").last();
  await avatar.click();
  const adminGroup = page.locator("[data-menu-row]").filter({ hasText: /^Admin$/ }).first();
  if (await adminGroup.isVisible({ timeout: 3000 }).catch(() => false)) await adminGroup.click();
  await page.getByText("Error Inspector", { exact: true }).first().click({ timeout: 10000 });
  await sleep(1500);
  await page.keyboard.press("Escape").catch(() => undefined);
  const inspectorOpen = await page.getByText(/Error Inspector/).first().isVisible().catch(() => false);
  console.log(`INFO inspector open before click: ${inspectorOpen}`);
  await page.screenshot({ path: `${OUT}/2-inspector-open.png` });
  watching = true;
  await create.click();
  await page.waitForURL(/\/validate|\/brands\/[^/]+/, { timeout: 240000 }).catch(() => undefined);
  await sleep(8000);
  watching = false;
  console.log(`INFO landed on ${new URL(page.url()).pathname}`);
  await page.screenshot({ path: `${OUT}/3-after-create.png`, fullPage: false });
  const inspectorText = await page.locator("body").innerText();
  const redLines = inspectorText.split("\n").filter((l) => /23505|duplicate key|discovered_item/i.test(l));
  console.log(`INFO inspector lines naming 23505/duplicate/discovered_item: ${redLines.length}`);
  for (const l of redLines.slice(0, 5)) console.log(`  ${l.slice(0, 200)}`);
  console.log(`${conflicts.length === 0 ? "PASS" : "FAIL"} no 409 / 23505 during Create (${conflicts.length})`);
  for (const c of conflicts) console.log(`  ${c}`);
} finally {
  await browser.close();
}
