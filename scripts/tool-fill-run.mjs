// scripts/tool-fill-run.mjs — L6b: run a multi-field Tool as test@test.com. Fills the primary box, opens "Tools"
// (advanced inputs) and fills the other text inputs in order, submits, waits for the answer, screenshots.
//   node scripts/tool-fill-run.mjs <toolId> <out.png> <primary> [extra1] [extra2] ...
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const [toolId, out, primary, ...extras] = process.argv.slice(2);
const printed = execFileSync("pnpm", ["-s", "dev-login", "--member", "/dashboard"], { encoding: "utf8" });
const open = printed.match(/OPEN\s*:\s*(\S+)/)?.[1];
const origin = new URL(open).origin;
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 1100 } })).newPage();
await page.goto(open, { waitUntil: "commit", timeout: 180000 }).catch(() => {});
await page.waitForTimeout(4000);
for (let i = 0; i < 4; i++) {
  try { await page.goto(`${origin}/data/library?tool=${toolId}`, { waitUntil: "domcontentloaded", timeout: 180000 }); break; }
  catch (e) { if (i === 3) throw e; await page.waitForTimeout(5000); }
}
const box = page.locator('input[placeholder^="e.g."]').first();
await box.waitFor({ timeout: 300000 });
await page.waitForTimeout(6000);
await box.fill(primary);
if (extras.length) {
  await page.getByText("Tools", { exact: true }).first().click();
  await page.waitForTimeout(2000);
  const texts = page.locator('input[placeholder^="e.g."]:visible');
  const n = await texts.count();
  const placeholders = [];
  for (let i = 0; i < n; i++) placeholders.push(await texts.nth(i).getAttribute("placeholder"));
  console.log("inputs:", JSON.stringify(placeholders));
  for (let k = 0; k < extras.length && k + 1 < n; k++) await texts.nth(k + 1).fill(extras[k]);
}
await box.press("Enter");
await page.waitForSelector('[data-tool-result="succeeded"], [data-tool-result="empty"], [data-tool-result="failed"], [data-tool-result="refused"]', { timeout: 300000 });
await page.waitForTimeout(8000);
await page.screenshot({ path: out });
console.log("result:", await page.locator("[data-tool-result]").first().getAttribute("data-tool-result"), page.url());
await browser.close();
