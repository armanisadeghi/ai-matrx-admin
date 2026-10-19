// Board zoom ladder walk: screenshots of a mixed board at each level of detail (light + dark), the
// transitions between them, and pan/zoom frame times on that board and on the 100-stream demo.
//   MATRX_PREVIEW_SESSION=lod43 node scripts/board-lod-walk.mjs --board <id> --shots <dir>
// HEADLESS. Signs in through dev-login (a single-use nonce); never prints credentials.
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const flag = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const shots = flag("--shots", ".");
const boardId = flag("--board", null);
const skipDemo = args.includes("--no-demo");
const session = process.env.MATRX_PREVIEW_SESSION || "lod43";

const out = execSync(`MATRX_PREVIEW_SESSION=${session} bash scripts/dev-login.sh /board/${boardId}`, { encoding: "utf8" });
const open = out.match(/OPEN\s*:\s*(\S+)/)[1];
const origin = new URL(open).origin;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text().slice(0, 300)));
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 300)}`));
await page.goto(open, { waitUntil: "domcontentloaded" });
await page.waitForURL(/\/board/, { timeout: 180000 });

async function resume() {
  const parked = page.getByRole("button", { name: /resume/i });
  if (await parked.count()) await parked.first().click().catch(() => {});
}
async function gotoBoard(url) {
  here = url;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await resume();
  if (!page.url().includes(new URL(url).pathname)) await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator("[data-board-zoom-hud]").waitFor({ timeout: 180000 });
  await page.waitForTimeout(3000);
}
const hud = () => page.locator("[data-board-zoom-hud] button");
/** Press a zoom HUD button in the page (an error badge may sit over the HUD; this is the button's own click). */
let here = null;
const hudPress = (i) => page.evaluate((n) => document.querySelectorAll("[data-board-zoom-hud] button")[n]?.click(), i).catch(() => {});
async function zoomTo(steps, tries = 3) {
  // A dev reload or the walk cap can move the page mid-run: come back and start the step over.
  if (here && (!page.url().includes(new URL(here).pathname) || !(await page.locator("[data-board-zoom-hud]").count()))) await gotoBoard(here);
  // Fit, then 100% about the view center, then k steps of 1/1.25.
  await hudPress(3);
  await page.waitForTimeout(500);
  await hudPress(1);
  await page.waitForTimeout(500);
  for (let i = 0; i < steps; i++) {
    await hudPress(0);
    await page.waitForTimeout(280);
  }
  await page.waitForTimeout(900);
  if (tries > 0 && here && !page.url().includes(new URL(here).pathname)) return zoomTo(steps, tries - 1);
}
const levels = () =>
  page.evaluate(() => {
    const c = { full: 0, structure: 0, card: 0, label: 0 };
    for (const t of document.querySelectorAll("[data-board-tile]")) {
      const l = t.querySelector("[data-lod-level]")?.getAttribute("data-lod-level") ?? "full";
      c[l] += 1;
    }
    return c;
  });
async function theme(dark) {
  await page.evaluate((d) => {
    document.documentElement.classList.toggle("dark", d);
    document.documentElement.style.colorScheme = d ? "dark" : "light";
  }, dark);
  await page.waitForTimeout(300);
}
/** rAF frame times while `drive` runs. */
async function frames(drive) {
  await page.evaluate(() => {
    window.__ft = [];
    let last = performance.now();
    window.__ftOn = true;
    const tick = (t) => {
      window.__ft.push(t - last);
      last = t;
      if (window.__ftOn) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await drive();
  const ft = await page.evaluate(() => {
    window.__ftOn = false;
    return window.__ft.slice(2);
  });
  ft.sort((a, b) => a - b);
  const q = (p) => ft[Math.min(ft.length - 1, Math.floor(ft.length * p))];
  return { n: ft.length, median: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1) };
}
async function panZoom() {
  await page.mouse.move(800, 500);
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(i < 20 ? 60 : -60, i % 2 ? 30 : -30);
    await page.waitForTimeout(16);
  }
  await page.keyboard.down("Control");
  for (let i = 0; i < 30; i++) {
    await page.mouse.wheel(0, i < 15 ? 40 : -40);
    await page.waitForTimeout(16);
  }
  await page.keyboard.up("Control");
}

const report = {};
await gotoBoard(`${origin}/board/${boardId}`);
const LADDER = [
  ["L0-full", 1],
  ["L1-structure", 4],
  ["L2-card", 7],
  ["L3-label", 11],
];
for (const dark of [false, true]) {
  await theme(dark);
  for (const [name, steps] of LADDER) {
    await zoomTo(steps);
    report[`${name}-${dark ? "dark" : "light"}`] = { zoom: await page.locator("[data-board-zoom-hud] button").nth(1).innerText(), ...(await levels()) };
    await page.screenshot({ path: `${shots}/${name}-${dark ? "dark" : "light"}.png` });
  }
}
// Transitions: mid-fade captures while crossing L1 -> L2 and L0 -> L1.
await theme(false);
await zoomTo(3);
await hudPress(0);
await page.waitForTimeout(60);
await page.screenshot({ path: `${shots}/transition-L0-to-L1-60ms.png` });
await zoomTo(6);
await hudPress(0);
await page.waitForTimeout(120);
await page.screenshot({ path: `${shots}/transition-L1-to-L2-120ms.png` });
// Detail crops: one of each face at a readable size.
await zoomTo(4);
await page.screenshot({ path: `${shots}/detail-L1-zoom.png`, clip: { x: 300, y: 150, width: 1000, height: 700 } });

// Frame times on this board at each level.
for (const [name, steps] of LADDER) {
  await zoomTo(steps);
  report[`frames-${name}`] = await frames(panZoom);
}

if (!skipDemo) {
  await gotoBoard(`${origin}/demos/board`);
  await page.getByRole("button", { name: /^Board/ }).first().click();
  await page.getByRole("menuitem", { name: /Add 100 live streams/ }).click();
  await page.waitForTimeout(4000);
  await zoomTo(Number(flag("--demo-steps", "9")));
  await page.waitForTimeout(1500);
  report["demo-zoom"] = await page.locator("[data-board-zoom-hud] button").nth(1).innerText();
  report["demo-100-standing"] = await frames(() => page.waitForTimeout(3000));
  report["demo-100-panzoom"] = await frames(panZoom);
  report["demo-levels"] = await levels();
  report["demo-faces"] = await page.evaluate(() => ({ lod: document.querySelectorAll("[data-lod-level]").length, overview: document.querySelectorAll("[data-board-overview]").length, tiles: document.querySelectorAll("[data-board-tile]").length, newCard: document.querySelectorAll(".board-face-icon").length, labels: document.querySelectorAll("[data-board-label]").length }));
  await page.screenshot({ path: `${shots}/demo-100-streams.png` });
}
report.consoleErrors = [...new Set(consoleErrors)].slice(0, 15);
console.log(JSON.stringify(report, null, 1));
await browser.close();
