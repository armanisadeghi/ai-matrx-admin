import { chromium } from "playwright";
import { execSync } from "node:child_process";
const S = process.argv[2], w = Number(process.argv[3] || 1440);
const login = execSync(`pnpm -s dev-login '/education/practice-oral?mode=oral_exam'`, { encoding: "utf8" });
const url = login.match(/OPEN\s*:\s*(\S+)/)[1];
console.log((login.match(/test run: (\S+)/)||[])[1]);
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: w, height: w < 500 ? 812 : 900 } });
const page = await ctx.newPage();
page.on("pageerror", e => console.log("PAGEERROR", e.message.slice(0,200)));
await page.goto(url, { timeout: 240000 });
if (page.url().includes("__dev-walk")) { await page.getByRole("button", { name: "Resume this preview" }).click(); await page.waitForURL(u => !u.href.includes("__dev-walk"), { timeout: 240000 }); }
try { await page.waitForSelector("text=What should the session come from?", { timeout: 150000 }); } catch (e) { await page.screenshot({ path: `${S}/oral-${w}-fail.png` }); console.log("URL", page.url(), (await page.locator("body").innerText()).slice(0,800)); process.exit(1); }
await page.waitForTimeout(3000);
await page.screenshot({ path: `${S}/oral-${w}-a.png`, fullPage: true });
console.log("TEXT", (await page.locator("main, body").first().innerText()).slice(0, 1500));
await b.close();
