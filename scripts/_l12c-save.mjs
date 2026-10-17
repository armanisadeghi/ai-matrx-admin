import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
const out = process.argv[2];
const calls = process.argv[3];
const printed = execFileSync("pnpm", ["-s", "dev-login", "--member", "/dashboard"], { encoding: "utf8" });
const open = printed.match(/OPEN\s*:\s*(\S+)/)?.[1];
const origin = new URL(open).origin;
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1360, height: 1000 } })).newPage();
await page.goto(open, { waitUntil: "commit", timeout: 180000 }).catch(() => {});
await page.waitForTimeout(4000);
for (let i = 0; i < 80; i++) {
  await page.goto(`${origin}/marketing/837ba910-a3f8-4cf0-b096-10a9e24be8ce/socials/research?mode=account&source=instagram&calls=${calls}`, { waitUntil: "domcontentloaded", timeout: 180000 }).catch(() => {});
  if (await page.getByText("Save to a table").count().catch(() => 0)) break;
  await page.waitForTimeout(15000);
}
await page.waitForTimeout(8000);
await page.getByRole("button", { name: "Save to a table" }).last().click();
await page.waitForTimeout(6000);
if (process.argv[4] === "make") {
  await page.getByRole("button", { name: /Make the table with/ }).click();
  await page.waitForTimeout(50000);
}
await page.screenshot({ path: out });
console.log(JSON.stringify({ out, buttons: await page.getByRole("button").allInnerTexts().then((t) => t.filter(Boolean).slice(-25)) }));
await browser.close();
