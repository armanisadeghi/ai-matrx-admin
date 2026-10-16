import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = process.env.ORIGIN;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
console.log("who", await walkSignIn(page, ORIGIN));
await page.goto(ORIGIN + "/spaces", { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(6000);
console.log(page.url());
await page.getByText("Import", { exact: true }).last().click();
await page.waitForTimeout(800);
const [fc] = await Promise.all([page.waitForEvent("filechooser"), page.getByText("Notion export (.zip)").click()]);
await fc.setFiles("/Users/armanisadeghi/code/aidream/aidream/services/notion_import/fixtures/juniper_vale_export.zip");
for (let i = 0; i < 18; i++) { await page.waitForTimeout(5000); const t = await page.locator("body").innerText(); if (/unmatched|matched|imported|failed|stopped/i.test(t) && i > 1) { } }
await page.screenshot({ path: process.env.OUT + "/import.png", fullPage: false });
console.log((await page.locator("body").innerText()).slice(0, 3000));
await browser.close();
