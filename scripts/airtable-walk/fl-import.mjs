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
const snap = async (n) => { await page.screenshot({ path: `${process.env.OUT}/import-${n}.png`, timeout: 120000 }).catch(() => {}); };
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(6000);
  const t = await page.evaluate(() => document.body.innerText, null).catch(() => "(busy)");
  const hit = t.split("\n").filter((l) => /unmatched|matched|imported|failed|stopped|Admin|report|rows|pages/i.test(l) && l.length < 200);
  console.log(i, page.url().slice(-40), hit.slice(0, 12).join(" | "));
  if (i % 4 === 3) await snap(i);
}
await snap("final");
await browser.close();
