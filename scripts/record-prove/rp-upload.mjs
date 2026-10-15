// RECORD-PROVE: upload a real image through the record page's Scan cell, then check thumbnails (record, grid) and the viewer.
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { ORIGIN } from "../airtable-walk/lib.mjs";
const [TB, ROW] = process.argv.slice(2); const SH = "/tmp/rp-shots";
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
const nonce = execSync(`cd ../.. && pnpm dev-login /data/${TB}/r/${ROW}`, { encoding: "utf8" }).match(/OPEN\s*:\s*(\S+)/)[1];
await page.goto(nonce, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForTimeout(10000);
const row = page.getByText("Scan", { exact: true }).first();
console.log("scan label", await row.count());
const box = await row.boundingBox();
await page.mouse.click(box.x + 260, box.y + box.height / 2);
await page.waitForTimeout(2000);
console.log("file inputs after click", await page.locator("input[type=file]").count(), "buttons:", JSON.stringify((await page.locator("button").allInnerTexts()).filter((t) => /add|upload|attach|file|browse/i.test(t))));
await page.screenshot({ path: `${SH}/admin-scan-click.png` });
const [chooser] = await Promise.all([page.waitForEvent("filechooser", { timeout: 15000 }), page.getByText("Upload File", { exact: true }).first().click()]);
await chooser.setFiles(`${SH}/referral-scan.png`);
await page.waitForTimeout(8000);
await page.screenshot({ path: `${SH}/admin-after-chooser.png` });
const attach = page.getByRole("button", { name: /^Attach/ }).first();
if (await attach.count() && await attach.isEnabled().catch(() => false)) { await attach.click(); await page.waitForTimeout(6000); }
await page.keyboard.press("Escape"); await page.waitForTimeout(1500);
console.log("record thumbs", await page.locator("[data-records-file-thumb]").count());
await page.screenshot({ path: `${SH}/admin-record-after-upload.png`, fullPage: true });
const prev = page.locator("[data-records-file-preview]").first();
if (await prev.count()) { await prev.click(); await page.waitForTimeout(1500); console.log("viewer after record click", await page.locator("[data-records-attachment-viewer]").count()); await page.screenshot({ path: `${SH}/admin-viewer.png` }); await page.keyboard.press("Escape"); }
await browser.close();
