import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = "http://s96c6068c.localhost:3001";
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } }); ctx.setDefaultNavigationTimeout(240000);
const page = await ctx.newPage(); await walkSignIn(page, ORIGIN);
for (const id of process.argv.slice(2)) { await page.goto(ORIGIN + "/spaces/" + id, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(9000); console.log(id.slice(0,8), /in Trash/.test(await page.locator("body").innerText())); }
await b.close();
