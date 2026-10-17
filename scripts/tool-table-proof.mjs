// scripts/tool-table-proof.mjs — L6b: run a row-shaped Tool as test@test.com, keep its rows in a table, run
// it again and add to the SAME table; counts of rows before/after prove the dedupe.
//   node scripts/tool-table-proof.mjs <toolId> <subject> <shotsDir> [--phase=first|again] [--table="name"]
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const [toolId, subject, shots] = args.filter((a) => !a.startsWith("--"));
const flag = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).split("=").slice(1).join("=");
const phase = flag("phase", "first");
mkdirSync(shots, { recursive: true });

const printed = execFileSync("pnpm", ["-s", "dev-login", "--member", "/dashboard"], { encoding: "utf8" });
const open = printed.match(/OPEN\s*:\s*(\S+)/)?.[1];
const origin = new URL(open).origin;
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 1000 } })).newPage();
const shot = (n) => page.screenshot({ path: `${shots}/${n}.png` });
const log = (...a) => console.log(...a);

await page.goto(open, { waitUntil: "commit", timeout: 180000 }).catch(() => {});
await page.waitForTimeout(4000);
for (let i = 0; i < 4; i++) {
  try { await page.goto(`${origin}/data/library?tool=${toolId}`, { waitUntil: "domcontentloaded", timeout: 180000 }); break; }
  catch (e) { if (i === 3) throw e; await page.waitForTimeout(5000); }
}
const box = page.locator('input[placeholder^="e.g."]').first();
await box.waitFor({ timeout: 170000 });
await box.fill(subject);
await box.press("Enter");
await page.waitForSelector('[data-tool-result="succeeded"]', { timeout: 170000 });
await page.waitForSelector("[data-tool-table-bar]", { timeout: 60000 });
await page.waitForTimeout(3000);
await shot(`${phase}-1-answer`);
log("bar:", (await page.locator("[data-tool-table-bar]").innerText()).replace(/\s+/g, " "));

if (phase === "first") {
  await page.locator("[data-tool-table-choose]").click();
  await page.waitForTimeout(8000);
  await shot("first-2-overlay");
  log("overlay buttons:", await page.locator('[role="dialog"] button:visible').allInnerTexts());
} else {
  await page.locator("[data-tool-table-add]").click();
  await page.waitForSelector("[data-tool-table-note]", { timeout: 90000 });
  await shot("again-2-added");
  log("note:", await page.locator("[data-tool-table-note]").innerText());
}
await browser.close();
