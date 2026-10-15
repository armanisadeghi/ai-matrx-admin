// RECORD-PROVE: the persona outsider opens the shared referral row and the shared client row. node rp-outsider-walk.mjs '<json from rp-setup>' [shotDir]
import { chromium } from "playwright";
import { fixtureSessionCookies, testTarget } from "../lib/persona.mjs";
const s = JSON.parse(process.argv[2]); const dir = process.argv[3] ?? "/tmp/rp-shots";
const ORIGIN = process.env.ORIGIN ?? "http://s96c6068c.localhost:3001";
const cookies = await fixtureSessionCookies(testTarget(), { id: s.outsider, email: s.email }, { host: new URL(ORIGIN).hostname });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
await ctx.addCookies(cookies);
const page = await ctx.newPage();
for (const [name, path] of [["referral", `/data/${s.referrals}/r/${s.refRows[0]}`], ["client", `/data/${s.clients}/r/${s.harbor}`]]) {
  await page.goto(ORIGIN + path, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForTimeout(9000);
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 600);
  console.log(name, page.url().replace(ORIGIN, ""), "\n  ", text);
  await page.screenshot({ path: `${dir}/outsider-${name}.png` });
}
await browser.close();
