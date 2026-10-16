import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = process.env.ORIGIN;
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await walkSignIn(page, ORIGIN);
await page.goto(ORIGIN + "/spaces", { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(8000);
for (let n = 0; n < 4; n++) {
  const row = page.getByText("Juniper & Vale HQ", { exact: true }).first();
  if (!(await row.count())) break;
  await row.hover(); const bx = await row.boundingBox(); await page.mouse.click(234, bx.y + bx.height/2); await page.waitForTimeout(800); await page.screenshot({path: process.env.OUT+"/menu.png"});
  await page.getByText("Move to Trash").first().click();
  await page.waitForTimeout(3000);
  console.log("trashed", n);
}
console.log("left", await page.getByText("Juniper & Vale HQ", { exact: true }).count());
await browser.close();
