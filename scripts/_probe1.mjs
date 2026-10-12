import { chromium } from "playwright";
import { execSync } from "node:child_process";
const login = execSync(`pnpm -s dev-login '/chat/new'`, { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname });
const url = login.match(/OPEN\s*:\s*(\S+)/)?.[1];
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
await page.goto(url, { timeout: 180000 });
if (page.url().includes("__dev-walk")) { await page.getByRole("button", { name: "Resume this preview" }).click(); await page.waitForURL(u=>!u.href.includes("__dev-walk"),{timeout:180000}); }
await page.waitForTimeout(6000);
const hdr=async()=>page.evaluate(()=>[...document.querySelectorAll("button")].map(b=>b.innerText).filter(t=>/·/.test(t)));
for (let a=0;a<5;a++){ const h=await hdr(); console.log("attempt",a,h); if(h.some(t=>t.startsWith("Content Writing Partner"))) break;
  await page.locator("button",{hasText:"General Chat ·"}).first().click({timeout:8000}).catch(()=>{}); await page.waitForTimeout(1500);
  await page.getByText("Content Writing Partner").first().click({timeout:8000}).catch(()=>{}); await page.waitForTimeout(4000); }
await page.locator('textarea[placeholder*="How can I help"]').first().fill(process.argv[2]);
console.log("pre-send hdr", await hdr()); await page.screenshot({ path: "/tmp/rw/pre.png" });
await page.keyboard.press("Enter");
for (let i=0;i<6;i++){ await page.waitForTimeout(500); console.log(i, page.url().slice(-14), await hdr()); }
await page.waitForURL(/\/chat\/[0-9a-f-]{36}/, { timeout: 60000 });
console.log(page.url());
await page.waitForTimeout(50000);
await page.waitForTimeout(40000);
await page.screenshot({ path: "/tmp/rw/p1.png" }); console.log(await page.evaluate(()=>document.querySelector("[data-message-group][aria-label=\"Assistant answer\"]")?.innerText.slice(0,1500))); await page.getByRole("button",{name:"Instagram",exact:true}).click({timeout:5000}).catch(()=>console.log("no instagram"));
await page.waitForTimeout(3000);
await page.screenshot({ path: "/tmp/rw/p2.png" });
console.log(await page.evaluate(()=>{const c=document.querySelector("textarea[placeholder=Reply]")?.closest("form,div[class*=rounded]"); let e=document.querySelector("textarea[placeholder=Reply]"); for(let i=0;i<6&&e;i++) e=e.parentElement; return e?.innerText+"\n"+e?.outerHTML.slice(0,3000)}));
await b.close();
