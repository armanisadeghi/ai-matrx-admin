// scripts/group-chat-policy-walk.mjs — Group Chat inspector policy save sticks (live, headless).
//   node scripts/group-chat-policy-walk.mjs [outDir]
// Sends no AI message (policy edits only), so no model setup is needed; any walk that does send one uses lib/flash-test-setup.mjs (Gemini 3.8 Flash).
// Captures every /group-chat request (method, full headers, body) + response + OPTIONS preflights.
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execSync } from "node:child_process";
const OUT = process.argv[2] || mkdtempSync(join(tmpdir(), "gc-policy-"));
const ROUTE = "/masterwork/vision-interview/b4e3d737-8d44-4609-aa6c-8c27ca2f1173";
const log = [];
process.on("uncaughtException", (e) => { console.log("ERR", e.message.slice(0,200)); console.log(JSON.stringify(log, null, 1)); process.exit(1); });
const login = execSync(`pnpm -s dev-login '${ROUTE}'`, { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname });
const url = login.match(/OPEN\s*:\s*(\S+)/)?.[1];
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1500, height: 1000 } });
const page = await ctx.newPage();
page.on("requestfinished", async (req) => {
  if (!/group-chat/.test(req.url())) return;
  const res = await req.response(); let body = ""; try { body = (await res.text()).slice(0, 300); } catch {}
  const h = await req.allHeaders();
  log.push({ m: req.method(), u: req.url().slice(-60), reqbody: (req.postData()||"").slice(0,200), reqHeaders: req.method()==="PUT"? h : undefined, auth: h.authorization ? "Bearer…" + h.authorization.slice(-6) : "MISSING", fp: h["x-fingerprint-id"] || null, status: res.status(), body, acao: (await res.allHeaders())["access-control-allow-methods"] });
});
page.on("requestfailed", (req) => { if (/group-chat/.test(req.url())) log.push({ m: req.method(), u: req.url().slice(-60), reqbody: (req.postData()||"").slice(0,200), reqHeaders: req.method()==="PUT"? h : undefined, FAILED: req.failure()?.errorText }); });
page.on("framenavigated", (f) => { if (f === page.mainFrame()) log.push({ nav: f.url() }); });
await page.goto(url, { timeout: 180000 });
if (page.url().includes("__dev-walk")) { await page.getByRole("button", { name: "Resume this preview" }).click(); await page.waitForURL(u=>!u.href.includes("__dev-walk"),{timeout:180000}); }
await page.waitForTimeout(15000);
await page.screenshot({ path: `${OUT}/1-loaded.png` });
await page.getByRole("button", { name: "Group Chat inspector" }).click();
await page.waitForTimeout(8000);
await page.screenshot({ path: `${OUT}/2-inspector.png` });
const trig = page.locator('[data-participant] [aria-label="Sees"]').first();
console.log("triggers", await page.locator('[aria-label="Sees"]').count());
async function setSees(label) {
  await page.locator('[aria-label="Sees"]').first().click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await page.waitForTimeout(5000);
}
const seesText = () => page.locator('[aria-label="Sees"]').first().innerText();
console.log("before:", await seesText());
const start = (await seesText()).trim();
await setSees("No one");
console.log("after No one:", await seesText());
await page.goto(url.replace(/\/api\/dev-login.*next=/, "").replace(/^http:\/\/[^/]+/, (m)=>m) , { timeout: 120000 }).catch(()=>{});
await page.waitForTimeout(12000);
if (!(await page.locator('[aria-label="Sees"]').count())) { await page.getByRole("button", { name: "Group Chat inspector" }).click(); await page.waitForTimeout(8000); }
const afterReload = (await seesText()).trim();
console.log("after reload:", afterReload);
await page.screenshot({ path: `${OUT}/4-reloaded.png` });
await setSees("Everyone");
console.log("restored:", await seesText());
console.log(JSON.stringify(log.filter(l=>l.m==="PUT"||l.FAILED).map(l=>({m:l.m,status:l.status,reqbody:l.reqbody,auth:l.auth,body:l.body?.slice(0,120)})), null, 1));
await b.close();
