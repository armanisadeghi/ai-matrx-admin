// scratch walker for lane L12c (not committed): node scripts/_l12c-walk.mjs <out.png> [--mode="Ads"] [--chip="Pinterest"] [--type="text"] [--wait=30000] [--width=1360] [--height=1500] [--path=...] [--clicks="a|b"]
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith("--"));
const flag = (n, d = "") => (args.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).split("=").slice(1).join("=");
const base = flag("path", "/marketing/837ba910-a3f8-4cf0-b096-10a9e24be8ce/socials/research");
const printed = execFileSync("pnpm", ["-s", "dev-login", "--member", "/dashboard"], { encoding: "utf8" });
const open = printed.match(/OPEN\s*:\s*(\S+)/)?.[1];
const origin = new URL(open).origin;
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: Number(flag("width", 1360)), height: Number(flag("height", 1500)) }, colorScheme: args.includes("--dark") ? "dark" : "light" });
const page = await context.newPage();
const net = [];
page.on("response", (r) => { if (/\/tools\/calls/.test(r.url())) net.push(`${r.request().method()} ${r.status()} ${r.url().split("/tools/")[1]}`); });
await page.goto(open, { waitUntil: "commit", timeout: 180000 }).catch(() => {});
await page.waitForTimeout(4000);
for (let i = 0; i < 80; i++) {
  await page.goto(`${origin}${base}`, { waitUntil: "domcontentloaded", timeout: 180000 }).catch(() => {});
  const capped = await page.getByText("walk cap", { exact: false }).count().catch(() => 0);
  if (!capped && (await page.getByRole("tab", { name: "Account & posts", exact: true }).count().catch(() => 0))) break;
  if (!capped) { await page.waitForTimeout(8000); if (await page.getByRole("tab", { name: "Account & posts", exact: true }).count().catch(() => 0)) break; }
  await page.waitForTimeout(20000);
}
await page.getByRole("tab", { name: "Account & posts", exact: true }).waitFor({ timeout: 170000 });
await page.waitForTimeout(3000);
const mode = flag("mode");
if (mode) { await page.getByRole("tab", { name: mode, exact: true }).click(); await page.waitForTimeout(2500); }
const chip = flag("chip");
if (chip) { await page.getByRole("button", { name: chip, exact: true }).first().click(); await page.waitForTimeout(2500); }
for (const c of flag("clicks").split("|").filter(Boolean)) { await page.getByText(c, { exact: false }).first().click(); await page.waitForTimeout(1500); }
const typed = flag("type");
if (typed) {
  const box = page.locator('input[placeholder^="e.g."], input[placeholder^="Search"], textarea').first();
  await box.waitFor({ timeout: 60000 });
  await box.fill(typed);
  await page.keyboard.press("Enter");
  await page.getByText(/This look-up cost|No charge/).first().waitFor({ timeout: Number(flag("wait", 90000)) }).catch(() => console.log("no cost line within wait"));
  await page.waitForTimeout(6000);
}
await page.screenshot({ path: out, fullPage: false });
console.log(JSON.stringify({ out, url: page.url(), calls: net }));
await browser.close();
