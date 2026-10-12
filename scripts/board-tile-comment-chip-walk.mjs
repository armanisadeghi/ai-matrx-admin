// scripts/board-tile-comment-chip-walk.mjs — a board TILE comment sent "With next message" shows a chip in the board chat (live, headless).
//   node scripts/board-tile-comment-chip-walk.mjs [outDir]
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
const OUT = process.argv[2] || mkdtempSync(join(tmpdir(), "board-chip-"));
const ROUTE = "/board/c8eeb34c-f8d0-4fe2-958b-5b49ea20bbf9";
const login = execSync(`pnpm -s dev-login '${ROUTE}'`, { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname });
const url = login.match(/OPEN\s*:\s*(\S+)/)?.[1];
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (/remark|chip/i.test(m.text())) console.log("console:", m.text().slice(0,200)); });
await page.goto(url, { timeout: 180000 });
if (page.url().includes("__dev-walk")) { await page.getByRole("button", { name: "Resume this preview" }).click(); await page.waitForURL(u=>!u.href.includes("__dev-walk"),{timeout:180000}); }
await page.waitForTimeout(15000);
await page.screenshot({ path: `${OUT}/1-board.png` });
const which = process.env.WHICH || "tile";
if (which === "tile") {
  // Fit the board, then zoom in on the Task tile ("Ship pricing page") so its header is clickable.
  await page.mouse.click(643, 965); await page.waitForTimeout(2500);
  await page.mouse.move(977, 515);
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -300); await page.keyboard.down("Control"); await page.mouse.wheel(0, -300); await page.keyboard.up("Control"); await page.waitForTimeout(150); }
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/1b-zoomed.png` });
  await page.mouse.click(1175, 182);
} else await page.mouse.click(1318, 22);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/2-popover.png` });
const sw = page.getByLabel("With next message");
console.log("switch present", await sw.count(), "checked", await sw.count() ? await sw.first().isChecked() : null);
const text = `chip-probe-${which}-${Date.now()}`;
const box = page.locator("textarea, [contenteditable=true]").last();
await box.click(); await page.keyboard.type(text);
await page.screenshot({ path: `${OUT}/3-typed.png` });
await page.getByRole("button", { name: "Comment", exact: true }).last().click();
await page.waitForTimeout(6000);
await page.screenshot({ path: `${OUT}/4-posted.png` });
console.log("body has comment text:", (await page.evaluate(()=>document.body.innerText)).includes(text));
const chip = () => page.locator("aside[aria-label=Chat], [data-side-panel=canvas-chat]").getByText(/chip-probe-/).count();
const live = await chip(); console.log("chip in board chat (live):", live);
await page.goto(url.replace(/.*next=/, "http://s6d47a96f.localhost:3001")).catch(()=>{});
await page.waitForTimeout(14000);
await page.screenshot({ path: `${OUT}/5-reload.png` });
const reloaded = await chip(); console.log("chip in board chat (after reload):", reloaded);
await b.close();
process.exit(live > 0 && reloaded > 0 ? 0 : 1);
