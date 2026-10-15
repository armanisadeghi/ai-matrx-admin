import { chromium } from "playwright";
import { execSync } from "node:child_process";
const TB = "85c830ae-98aa-4e2a-a864-8115e53a1a5d";
const ORIGIN = "http://s96c6068c.localhost:3001";
const out = console.log;
const nonceUrl = () => execSync(`cd ../.. && pnpm dev-login /data/${TB}`, { encoding: "utf8" }).match(/OPEN\s*:\s*(\S+)/)[1];
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
await page.goto(nonceUrl(), { waitUntil: "domcontentloaded", timeout: 240000 });
const ready = async () => { await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 }); await page.waitForTimeout(4000); };
await ready();
await page.goto(`${ORIGIN}/data/${TB}`, { waitUntil: "domcontentloaded", timeout: 240000 }); await ready();
// 3. help text
const head = page.locator('button[aria-description]').filter({ hasText: /weekly/i }).first();
await head.hover(); await page.waitForTimeout(1200);
out("D3 tooltip:", JSON.stringify(await page.locator("[role=tooltip]").allInnerTexts()));
// 2. chip padding click
await page.reload({ waitUntil: "domcontentloaded" }); await ready();
const chip = page.locator("[data-records-file-chip]").first();
const box = await chip.boundingBox();
await page.mouse.click(box.x + 3, box.y + box.height / 2);
await page.waitForTimeout(1200);
out("D2 viewer after ONE click on chip padding:", await page.locator("[data-records-attachment-viewer]").count());
out("D2 focus inside viewer:", await page.evaluate(() => !!document.activeElement?.closest("[data-records-attachment-viewer]")));
await page.keyboard.press("Escape"); await page.waitForTimeout(800);
out("D2 viewer after Esc:", await page.locator("[data-records-attachment-viewer]").count(), "focus on chip button:", await page.evaluate(() => document.activeElement?.hasAttribute("data-records-file-preview")));
await page.screenshot({ path: "/tmp/airtable-walk/u-d2.png" });
// 1. copy settings
const rows = () => page.locator("[data-matrx-cell-col='account']").count();
out("D1 rows before:", await rows());
await page.locator("[data-view-picker]").click(); await page.waitForTimeout(800);
const names = await page.locator("[data-view-picker-content] [data-view-id], [data-view-picker-content] button").allInnerTexts();
out("D1 picker:", JSON.stringify(names).slice(0, 300));
await page.screenshot({ path: "/tmp/airtable-walk/u-d1a.png" });
await browser.close();
