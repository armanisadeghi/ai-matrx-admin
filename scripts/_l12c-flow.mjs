// scratch (not committed): interactive L12c flow, one browser, screenshots per step
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
const S = process.argv[2];
const steps = JSON.parse(process.argv[3]);
const printed = execFileSync("pnpm", ["-s", "dev-login", "--member", "/dashboard"], { encoding: "utf8" });
const open = printed.match(/OPEN\s*:\s*(\S+)/)?.[1];
const origin = new URL(open).origin;
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 1500 } });
const page = await ctx.newPage();
const calls = [];
page.on("response", async (r) => { if (/\/tools\/calls/.test(r.url()) && r.request().method() === "POST") { try { const j = await r.json(); calls.push(`${j.display_name} ${j.status} pts=${j.points_charged} cache=${j.cache} id=${j.call_id}`); } catch {} } });
await page.goto(open, { waitUntil: "commit", timeout: 180000 }).catch(() => {});
await page.waitForTimeout(4000);
await page.goto(`${origin}/marketing/837ba910-a3f8-4cf0-b096-10a9e24be8ce/socials/research`, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.getByRole("tab", { name: "Account & posts", exact: true }).waitFor({ timeout: 170000 });
await page.waitForTimeout(2500);
for (const st of steps) {
  if (st.mode) { await page.getByRole("tab", { name: st.mode, exact: true }).click(); await page.waitForTimeout(2000); }
  if (st.chip) { await page.getByRole("button", { name: st.chip, exact: true }).first().click(); await page.waitForTimeout(2000); }
  if (st.pick) { await page.getByRole("button", { name: st.pick, exact: true }).first().click(); await page.waitForTimeout(1500); }
  if (st.type) {
    const box = page.locator('input[placeholder^="e.g."], input[placeholder^="Search"]').first();
    await box.waitFor({ timeout: 60000 });
    await box.fill(st.type);
    await page.keyboard.press("Enter");
    await page.getByText(/This look-up cost|No charge|didn.t work|Nothing found/).first().waitFor({ timeout: 150000 }).catch(() => console.log("no cost line"));
    await page.waitForTimeout(5000);
  }
  for (const c of st.click ?? []) { await page.getByText(c, { exact: false }).first().click(); await page.waitForTimeout(2500); }
  if (st.shot) await page.screenshot({ path: `${S}/${st.shot}.png` });
}
console.log(JSON.stringify({ url: page.url(), calls }, null, 1));
await browser.close();
