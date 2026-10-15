// RECORD-PROVE item 2 (admin): kept-aside person named, image thumbnail via the app's attachment cell (record + grid), grid open-record without reload.
// node rp-final.mjs <table> <row>   (run from scripts/airtable-walk so ./lib.mjs and ./store.mjs resolve)
import { store } from "../airtable-walk/store.mjs";
import { open, out, ORIGIN } from "../airtable-walk/lib.mjs";
import { chromium } from "playwright";
import { execSync } from "node:child_process";
const [TB, ROW] = process.argv.slice(2);
const SH = "/tmp/rp-shots";
const { client } = await store();
if (!process.env.SKIP_SEED) {
  const w = await client.recordWrite({ record_id: ROW, table_id: TB, data: { referred_by: "4060701e-706a-4c76-b3ca-0bbc69fa5a14" } });
  out("write person", w.ok ? "ok" : JSON.stringify(w.error).slice(0, 200));
  const f = (await client.fields({ table_id: TB })).data.find((x) => x.key === "referred_by");
  const r = await client.migrateRetype({ field_id: f.id, to: "text" });
  out("retype person->text", r.ok ? "ok" : JSON.stringify(r.error).slice(0, 200));
}
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
const nonce = execSync(`cd ../.. && pnpm dev-login /data/${TB}`, { encoding: "utf8" }).match(/OPEN\s*:\s*(\S+)/)[1];
await page.goto(nonce, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 });
out("signed in; at", page.url().replace(ORIGIN, ""));
await page.goto(`${ORIGIN}/data/${TB}/r/${ROW}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForSelector("[data-records-retired], [data-records-attachment-editor], input[type=file]", { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(4000);
out("kept panel:", (await page.locator("[data-records-retired]").innerText().catch(() => "NO KEPT PANEL")).replace(/\n+/g, " | ").slice(0, 300));
const input = page.locator("input[type=file]").first();
out("file inputs", await page.locator("input[type=file]").count());
if (await input.count()) { await input.setInputFiles(`${SH}/referral-scan.png`); await page.waitForTimeout(9000); }
out("record thumb count", await page.locator("[data-records-file-thumb]").count());
await page.screenshot({ path: `${SH}/admin-record.png`, fullPage: true });
const thumb = page.locator("[data-records-file-preview]").first();
if (await thumb.count()) { await thumb.click(); await page.waitForTimeout(1500); out("viewer open on record click:", await page.locator("[data-records-attachment-viewer]").count()); await page.screenshot({ path: `${SH}/admin-viewer.png` }); await page.keyboard.press("Escape"); }
await open(page, TB);
out("grid thumb count", await page.locator("[data-records-file-thumb]").count());
await page.screenshot({ path: `${SH}/admin-grid.png` });
const gthumb = page.locator("[data-records-file-preview]").first();
if (await gthumb.count()) { await gthumb.click(); await page.waitForTimeout(1500); out("viewer open on grid click:", await page.locator("[data-records-attachment-viewer]").count()); await page.keyboard.press("Escape"); await page.waitForTimeout(500); }
await page.evaluate(() => (window.__rpMarker = "same-document"));
const reqs = []; page.on("request", (r) => r.resourceType() === "document" && reqs.push(r.url()));
const t0 = Date.now();
await page.locator("[data-records-open-record]").first().click({ timeout: 8000 });
await page.waitForURL(/\/r\//, { timeout: 15000 });
out("open-record ms", Date.now() - t0, "| same document (marker kept):", await page.evaluate(() => window.__rpMarker === "same-document"), "| document requests:", reqs.length);
await browser.close();
