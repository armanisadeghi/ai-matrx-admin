// Menus fix round 2 walk: Insert row above / Sort in the workbook editor, document editor load.
// Usage: node scripts/menus-fix2-walk.mjs <outDir> <workbookId> [docId]
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { signIn, until, sleep } from "./lib/seat-browser.mjs";
const ROOT = resolve(new URL(".", import.meta.url).pathname, "..");
const env = Object.fromEntries(readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]));
const ORIGIN = process.env.WALK_ORIGIN ?? "http://s8799b8a2.localhost:3001";
const OUT = process.argv[2] ?? "/tmp"; mkdirSync(OUT, { recursive: true });
const WB = process.argv[3];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("[console.error]", m.text().slice(0, 300)); });
console.log("signed in as", await signIn(page, ORIGIN, env.AI_ADMIN_USERNAME, env.AI_ADMIN_PASSWORD));
if (!WB) { await page.goto(`${ORIGIN}/workbooks`, { waitUntil: "domcontentloaded" }); await sleep(8000); console.log(await page.evaluate(() => [...document.querySelectorAll("a[href*='/workbooks/']")].slice(0, 15).map((a) => a.href + " | " + a.textContent.trim().slice(0, 40)).join("\n"))); await page.screenshot({ path: `${OUT}/home.png` }); await browser.close(); process.exit(0); }
await page.goto(`${ORIGIN}/workbooks/${WB}`, { waitUntil: "domcontentloaded" });
await sleep(15000);
const cell = (r, c = 0) => ({ x: 134 + c * 88, y: 165 + r * 24 });
async function fbar() { return page.evaluate(() => document.elementFromPoint(300, 117)?.textContent ?? null); }
async function val(r) { const p = cell(r); await page.mouse.click(p.x, p.y); await sleep(300); return fbar(); }
await page.mouse.click(cell(0).x, cell(0).y);
if (!process.env.NOTYPE) for (const t of ["b3", "a1", "c2"]) { await page.keyboard.type(t); await page.keyboard.press("Enter"); }
await sleep(500);
console.log("before", [await val(0), await val(1), await val(2), await val(3)]);
if (process.env.DRAG) { await page.mouse.move(cell(0).x, cell(0).y); await page.mouse.down(); await page.mouse.move(cell(3).x, cell(3).y, { steps: 5 }); await page.mouse.up(); } else await page.mouse.click(cell(1).x, cell(1).y);
async function menu(top, ...path) { await page.getByText(top, { exact: true }).locator("visible=true").first().click(); await sleep(400); for (const p of path) { const it = page.getByRole("menuitem", { name: p }).first(); try { await it.click({ timeout: 5000 }); } catch { console.log("MENU ITEMS:", await page.getByRole("menuitem").allInnerTexts()); throw new Error("no item " + p); } await sleep(400);} }
await menu(process.env.MENU ?? "Insert", ...(process.env.ITEM ?? "Row,Insert 1 row above").split(","));
await sleep(800);
await page.screenshot({ path: `${OUT}/after.png` });
console.log("after", [await val(0), await val(1), await val(2), await val(3)]);
await browser.close();
