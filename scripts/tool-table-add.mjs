// scripts/tool-table-add.mjs — L6b: open an existing Tool call as test@test.com and press "Add to <table>" on its
// answer; prints the note the bar shows (counts or the refusal). No new paid call.
//   node scripts/tool-table-add.mjs <toolId> <callId> <out.png>
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const [toolId, callId, out] = process.argv.slice(2);
const printed = execFileSync("pnpm", ["-s", "dev-login", "--member", "/dashboard"], { encoding: "utf8" });
const open = printed.match(/OPEN\s*:\s*(\S+)/)?.[1];
const origin = new URL(open).origin;
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 1000 } })).newPage();
await page.goto(open, { waitUntil: "commit", timeout: 180000 }).catch(() => {});
await page.waitForTimeout(4000);
for (let i = 0; i < 4; i++) {
  try { await page.goto(`${origin}/data/library?tool=${toolId}&call=${callId}`, { waitUntil: "domcontentloaded", timeout: 180000 }); break; }
  catch (e) { if (i === 3) throw e; await page.waitForTimeout(5000); }
}
const add = page.locator("[data-tool-table-add]");
await add.waitFor({ timeout: 400000 });
await page.waitForTimeout(3000);
await add.click();
await page.waitForSelector("[data-tool-table-note]", { timeout: 120000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: out });
console.log("note:", (await page.locator("[data-tool-table-note]").innerText()).replace(/\s+/g, " "));
await browser.close();
