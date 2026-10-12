// scripts/stream-end-blank-walk.mjs — a live assistant reply must NOT go blank when its stream ends.
// Headless, admin@admin.com, Content Writing Partner. Samples the page text every 500ms after sending
// and fails (exit 1) if the answer text was visible and then disappeared before a reload.
//   node scripts/stream-end-blank-walk.mjs "<prompt>" [outDir]
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
const PROMPT = process.argv[2] || "Say hello in two sentences.";
const OUT = process.argv[3] || mkdtempSync(join(tmpdir(), "se-blank-"));
console.log("screenshots:", OUT);
const login = execSync(`pnpm -s dev-login '/chat/new'`, { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname });
const url = login.match(/OPEN\s*:\s*(\S+)/)?.[1];
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
await page.goto(url, { timeout: 180000 });
if (page.url().includes("__dev-walk")) { await page.getByRole("button", { name: "Resume this preview" }).click(); await page.waitForURL(u=>!u.href.includes("__dev-walk"),{timeout:180000}); }
await page.waitForTimeout(6000);
await page.getByText("General Chat", {exact:false}).first().click();
await page.getByText("Content Writing Partner").click();
await page.waitForTimeout(1500);
await page.locator("textarea").first().fill(PROMPT);
await page.keyboard.press("Enter");
const samples = [];
const t0 = Date.now();
let maxLen = 0;
for (let i = 0; i < 160; i++) {
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => {
    const a = [...document.querySelectorAll('[data-message-group][aria-label="Assistant answer"]')];
    const txt = a.map(e => e.innerText).join("\n");
    return { n: a.length, len: txt.length, body: document.body.innerText.length };
  });
  samples.push({ t: Date.now()-t0, url: page.url().slice(-12), ...s });
  maxLen = Math.max(maxLen, s.len);
  if (i % 4 === 0) console.log(JSON.stringify(samples.at(-1)));
  if (maxLen > 40 && i > 40 && samples.slice(-20).every(x => x.len === samples.at(-1).len)) break;
}
await page.screenshot({ path: `${OUT}/final.png` });
if (process.env.PROBE) console.log(JSON.stringify(await page.evaluate(() => {
  let store; const walk = (f, d=0) => { if (!f || store || d>6000) return; if (f.memoizedProps?.store?.getState) { store = f.memoizedProps.store; return; } walk(f.child, d+1); walk(f.sibling, d+1); };
  const hostRoot = [document, document.documentElement, document.body].map(e => { const k = Object.keys(e).find(k=>k.startsWith("__reactContainer")); return k ? e[k] : null; }).find(Boolean);
  walk(hostRoot); if (!store) return "nostore";
  const s = store.getState(); const ar = Object.values(s.activeRequests?.byRequestId || {});
  const msgs = Object.values(s.messages?.byId || s.messages?.messages || {});
  return { ar: ar.map(r => ({ id: r.requestId, status: r.status, order: r.renderBlockOrder, timeline: JSON.stringify(r.timeline).slice(0,900), blocks: Object.values(r.renderBlocks).map(b=>({id:b.blockId,type:b.type,len:(b.content||"").length})) })),
    msgs: msgs.map(m => ({ id: m.id, role: m.role, req: m._streamRequestId, ss: m._streamSlotStart, se: m._streamSlotEnd, content: JSON.stringify(m.content).slice(0,300), status: m._status||m.status })) };
}), null, 1));
const last = samples.at(-1);
console.log("maxLen", maxLen, "last", JSON.stringify(last), "conv", page.url());
console.log(await page.evaluate(()=>[...document.querySelectorAll('[data-message-group][aria-label="Assistant answer"]')].map(e=>e.outerHTML.slice(0,2500)).join("\n----\n")));
await b.close();
process.exit(maxLen > 40 && last.len < maxLen / 2 ? 1 : 0);
