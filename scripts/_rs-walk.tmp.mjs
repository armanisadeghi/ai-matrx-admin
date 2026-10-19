import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
const OUT = process.argv[2];
const mint = (who, next) => execFileSync("pnpm", ["-s", "dev-login", ...(who === "member" ? ["--member"] : []), next], { encoding: "utf8" }).match(/OPEN\s*:\s*(\S+)/)?.[1];
const browser = await chromium.launch({ headless: true });
const cases = [
  ["admin","dark",1200], ["member","light",1200], ["admin","light",375],
];
for (const [who, theme, width] of cases) {
  const ctx = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: theme });
  const page = await ctx.newPage();
  const reqs = [];
  page.on("request", (r) => { const u = r.url(); if (/tools\/calls|\/search|seo|domain/i.test(u) && !/_next|\.(js|css|png|svg)/.test(u)) reqs.push(r.method()+" "+u.replace(/^https?:\/\/[^/]+/,"").slice(0,110)); });
  await page.goto(mint(who, "/search?q=" + encodeURIComponent("Best Chattanooga Movers")), { waitUntil: "domcontentloaded", timeout: 540000 });
  await page.waitForTimeout(25000);
  await page.screenshot({ path: `${OUT}/search-${who}-${theme}-${width}.png` });
  console.log(who, theme, width, "SEARCH", page.url(), "tabs:", await page.getByRole("tab").allInnerTexts().catch(()=>[]));
  console.log([...new Set(reqs)].slice(0,12).join("\n"));
  reqs.length = 0;
  await page.goto(page.url().split("/search")[0] + "/marketing/tools/domain?d=505cleanqueens.com", { waitUntil: "domcontentloaded", timeout: 540000 });
  await page.waitForTimeout(25000);
  if (who==="admin" && theme==="dark") { await page.getByRole("button",{name:"Run",exact:true}).first().click().catch(e=>console.log("noclick")); await page.waitForTimeout(60000); }
  await page.screenshot({ path: `${OUT}/domain-${who}-${theme}-${width}.png` });
  console.log(who, theme, width, "DOMAIN", page.url(), (await page.locator("main").innerText().catch(()=>"")).slice(0,300).replace(/\n/g," | "));
  console.log([...new Set(reqs)].slice(0,12).join("\n"));
  await ctx.close();
}
await browser.close();
