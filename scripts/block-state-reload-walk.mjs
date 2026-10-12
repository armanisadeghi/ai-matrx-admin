// scripts/block-state-reload-walk.mjs — QUESTIONNAIRE ANSWERS + "N answers" CHIP SURVIVE A RELOAD (live).
//
// Defect (2026-10-12): answer a questionnaire in a chat reply, Submit, reload —
// the answers and the chip were gone. Cause: the server materializes the
// questionnaire into a canvas item and the persisted reply carries that id, so
// on reload the block re-homed from `message` to `canvas_item` and read an empty
// row (features/block-state/hostEntity.ts decides the holder now).
//
// Headless, as admin@admin.com, against the shared dev server (:3001): asks
// Content Writing Partner for a questionnaire (one real AI call), lets the reply
// settle, reloads, answers + Submits, waits, reloads, and signs in a SECOND
// browser context. Records every block_state_* request/response body. Exit 1
// unless the answers and the chip are back after the reload AND in context 2.
//
//   node scripts/block-state-reload-walk.mjs [outDir]
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
const OUT = process.argv[2] || mkdtempSync(join(tmpdir(), "bs-reload-"));
console.log("screenshots:", OUT);
const log = [];
const t0 = Date.now();
function hook(page, tag) {
  page.on("response", async (res) => {
    const u = res.url();
    if (!/block_state_/.test(u)) return;
    let resp = ""; try { resp = (await res.text()).slice(0, 700); } catch {}
    log.push({ tag, s: Math.round((Date.now()-t0)/1000), rpc: u.split("/rpc/")[1], status: res.status(), req: (res.request().postData() || "").slice(0, 700), resp });
  });
}
async function signIn(ctx, route) {
  const login = execSync(`pnpm -s dev-login '${route}'`, { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname });
  const url = login.match(/OPEN\s*:\s*(\S+)/)?.[1];
  const page = await ctx.newPage();
  await page.goto(url, { timeout: 180000 });
  if (page.url().includes("__dev-walk")) { await page.getByRole("button", { name: "Resume this preview" }).click(); await page.waitForURL(u=>!u.href.includes("__dev-walk"),{timeout:180000}); }
  return page;
}
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await signIn(ctx, "/chat/new"); hook(page, "A");
await page.waitForTimeout(6000);
await page.getByText("General Chat", {exact:false}).first().click();
await page.getByText("Content Writing Partner").click();
await page.waitForTimeout(1500);
await page.locator("textarea").first().fill("Ask me a few questions to scope my launch.");
await page.keyboard.press("Enter");
await page.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 60000 });
const convUrl = page.url(); console.log("conv", convUrl);
const submit = page.getByRole("button", { name: "Submit", exact: true });
await submit.waitFor({ timeout: 120000 }).catch(()=>console.log("no Submit button in live view"));
const MODE="settled"; if (MODE==="settled") { await page.waitForTimeout(40000); await page.goto(convUrl); await page.waitForTimeout(12000); await submit.waitFor({timeout:60000}); } else await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/2-live.png` });
console.log("textareas", await page.locator("textarea").count(), "checkboxes", await page.getByRole("checkbox").count());
const tas = page.locator("textarea");
let n = await tas.count();
for (let i = 0; i < n; i++) { const t = tas.nth(i); if ((await t.getAttribute("placeholder")) === "Reply") continue; await t.fill(`answer-${i}`); }
for (const role of ["radio","checkbox"]) { const els = page.getByRole(role); const c = await els.count(); console.log(role, c); if (c) await els.first().click().catch(e=>console.log("click fail", role)); }
await page.waitForTimeout(2500);
console.log("submit enabled", await submit.isEnabled()); await submit.click({timeout:15000});
await page.waitForTimeout(10000);
await page.screenshot({ path: `${OUT}/3-after-submit.png` });
console.log("chip text live:", await page.evaluate(()=>[...document.body.innerText.matchAll(/\d+ answers?/g)].map(m=>m[0])));
// reload
await page.goto(convUrl); await page.waitForTimeout(14000);
await page.screenshot({ path: `${OUT}/4-reloaded.png` });
const tas2 = page.locator("textarea");
const reloadValues = await tas2.evaluateAll(els=>els.map(e=>e.value)); console.log("reload: textarea values", reloadValues);
const reloadChips = await page.evaluate(()=>[...document.body.innerText.matchAll(/\d+ answers?/g)].map(m=>m[0])); console.log("reload chips:", reloadChips);
// second context
const ctx2 = await b.newContext({ viewport: { width: 1400, height: 1000 } });
const p2 = await signIn(ctx2, new URL(convUrl).pathname); hook(p2, "B");
await p2.waitForTimeout(14000);
await p2.screenshot({ path: `${OUT}/5-second-context.png` });
const ctx2Values = await p2.locator("textarea").evaluateAll(els=>els.map(e=>e.value)); console.log("ctx2 textarea values", ctx2Values);
const ctx2Chips = await p2.evaluate(()=>[...document.body.innerText.matchAll(/\d+ answers?/g)].map(m=>m[0])); console.log("ctx2 chips:", ctx2Chips);
console.log(JSON.stringify(log.map(l=>({tag:l.tag,s:l.s,rpc:l.rpc,status:l.status,req:l.req.slice(0,420),resp:l.resp.slice(0,420)})),null,1));
await b.close();
const fails = [];
const answered = (vals) => vals.filter((v) => /^answer-/.test(v)).length >= 2;
if (!answered(reloadValues)) fails.push(`after reload the answers are gone: ${JSON.stringify(reloadValues)}`);
if (reloadChips.length === 0) fails.push('after reload the "N answers" chip is gone');
if (!answered(ctx2Values)) fails.push(`second context shows no answers: ${JSON.stringify(ctx2Values)}`);
if (ctx2Chips.length === 0) fails.push('second context shows no "N answers" chip');
if (log.some((l) => l.status >= 400)) fails.push("a block_state_* call was refused: " + JSON.stringify(log.filter((l) => l.status >= 400).map((l) => [l.rpc, l.status])));
if (fails.length) { console.error("FAIL\n- " + fails.join("\n- ")); process.exit(1); }
console.log("PASS: answers and chip survive a reload and show in a second browser context");
