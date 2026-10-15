import { chromium } from "playwright";
import { execSync } from "node:child_process";
const b = await chromium.launch();
for (let i = 0; i < 4; i++) {
  const nonce = execSync("pnpm -s dev-login 2>&1 | grep -o 'nonce=[0-9a-f]*' | head -1").toString().trim();
  const ctx = await b.newContext({ viewport: { width: 1300, height: 850 } });
  const p = await ctx.newPage();
  await p.goto("http://s96c6068c.localhost:3001/api/dev-login?" + nonce + "&next=/data/888512ef-f688-47f2-abee-f18d0d2795ca", { waitUntil: "load", timeout: 180000 });
  await p.waitForTimeout(12000);
  const t = await p.innerText("body");
  if (!/walk cap/.test(t)) { await p.screenshot({ path: "/private/tmp/claude-501/-Users-armanisadeghi-code/4aca9d01-f3c0-4271-be17-2f948446dfb3/scratchpad/ui2.png" }); console.log("IN", p.url()); 
    const btns = await p.locator("button").evaluateAll(els => els.map(e => (e.innerText||e.getAttribute("aria-label")||"").trim()).filter(Boolean).slice(0,40));
    console.log(JSON.stringify(btns)); await b.close(); process.exit(0); }
  await ctx.close(); await new Promise(r => setTimeout(r, 130000));
}
console.log("STILL CAPPED"); await b.close();
