// Lane CLOSE-AGENT probe: sign in on this lane's host, open a table, list what is on screen.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { ORIGIN, OUT, signIn, useOrganization, shot } from "../builders-walk/walk.mjs";
const target = JSON.parse(process.env.TARGET);
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: process.env.STATE && (await import("node:fs")).existsSync(process.env.STATE) ? process.env.STATE : undefined });
const page = await ctx.newPage();
try {
  if (!process.env.STATE || !(await import("node:fs")).existsSync(process.env.STATE)) await signIn(page, `/data/${target.table}`);
  await useOrganization(page, target);
  await page.waitForTimeout(3000);
  await shot(page, "probe-table");
  const buttons = await page.evaluate(() => Array.from(document.querySelectorAll("button,[role=tab],a")).filter((b) => b.offsetParent).map((b) => (b.getAttribute("aria-label") || b.textContent || "").trim().slice(0, 40)).filter(Boolean));
  console.log("BUTTONS", JSON.stringify([...new Set(buttons)]));
  if (process.env.STATE) await ctx.storageState({ path: process.env.STATE });
} catch (e) { console.log("ERR", e.message); await shot(page, "probe-err"); }
await browser.close();
