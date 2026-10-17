// scripts/shape-shot.mjs — screenshot one app route in headless Chromium, signed in through the
// single-use dev-login nonce (the in-app browser pane blocks the sealed kind frame; this does not).
//   node scripts/shape-shot.mjs <path> <out.png> [--member] [--dark] [--width=1200] [--height=900] [--wait=12000] [--type="text then Enter in the first input"] [--click="text"]
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const [path, out] = args.filter((a) => !a.startsWith("--"));
const flag = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).split("=").slice(1).join("=");
const member = args.includes("--member");
const dark = args.includes("--dark");
if (!path || !out) throw new Error("usage: shape-shot.mjs <path> <out.png> [--member] [--dark]");

const printed = execFileSync("pnpm", ["-s", "dev-login", ...(member ? ["--member"] : []), "/dashboard"], { encoding: "utf8" });
const open = printed.match(/OPEN\s*:\s*(\S+)/)?.[1];
if (!open) throw new Error(`no dev-login URL in: ${printed}`);
const origin = new URL(open).origin;

mkdirSync(dirname(out), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: Number(flag("width", 1200)), height: Number(flag("height", 900)) },
  colorScheme: dark ? "dark" : "light",
});
const page = await context.newPage();
const bad = [];
page.on("console", (m) => m.type() === "error" && bad.push(m.text().slice(0, 200)));
await page.goto(open, { waitUntil: "commit", timeout: 180000 }).catch(() => {});
await page.waitForTimeout(4000);
for (let attempt = 0; attempt < 4; attempt++) {
  try {
    await page.goto(`${origin}${path}`, { waitUntil: "domcontentloaded", timeout: 180000 });
    break;
  } catch (e) {
    if (attempt === 3 || !String(e).includes("ERR_ABORTED")) throw e;
    await page.waitForTimeout(5000);
  }
}
await page.waitForTimeout(Number(flag("wait", 12000)));
const typed = flag("type", "");
if (typed) {
  const box = page.locator('input[placeholder^="e.g."], textarea[placeholder^="e.g."]').first();
  await box.waitFor({ timeout: 150000 });
  await box.fill(typed);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(Number(flag("wait", 12000)));
}
const click = flag("click", "");
if (click) {
  await page.getByText(click, { exact: false }).first().click();
  await page.waitForTimeout(Number(flag("wait", 12000)));
}
await page.screenshot({ path: out, fullPage: false });
console.log(JSON.stringify({ out, url: page.url(), consoleErrors: bad.slice(0, 5) }));
await browser.close();
