import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { setupFlashRun } from "./lib/flash-test-setup.mjs";
const login = execSync(`pnpm -s dev-login '/chat/new'`, { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname });
const url = login.match(/OPEN\s*:\s*(\S+)/)?.[1];
const b = await chromium.launch({ headless: true });
const page = await (await b.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
await page.goto(url, { timeout: 180000 });
if (page.url().includes("__dev-walk")) { await page.getByRole("button", { name: "Resume this preview" }).click(); await page.waitForURL(u=>!u.href.includes("__dev-walk"),{timeout:180000}); }
await page.waitForTimeout(8000);
console.log("OK?", await setupFlashRun(page, "Content Writing Partner"));
await page.screenshot({ path: process.argv[2]+"/f.png" });
await b.close();
