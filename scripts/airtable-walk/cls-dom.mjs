import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = "http://s96c6068c.localhost:3001";
const b = await chromium.launch({ headless: true });
const seed = await b.newContext(); const sp = await seed.newPage(); await walkSignIn(sp, ORIGIN);
const state = await seed.storageState(); state.origins = [];
const ctx = await b.newContext({ storageState: state, viewport: { width: +(process.env.WIDTH||1600), height: 900 } }); ctx.setDefaultNavigationTimeout(240000);
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__snaps = {};
  const dump = (el, d=0) => { if (d>7) return ""; let o=""; for (const c of el.children) { const r=c.getBoundingClientRect(); o += "  ".repeat(d)+c.tagName.toLowerCase()+"."+(c.className?.toString?.()||"").split(" ").slice(0,3).join(".")+" h="+Math.round(r.height)+(c.children.length?"":" '"+(c.textContent||"").slice(0,25)+"'")+"\n"+dump(c,d+1);} return o; };
  const take = (tag) => { const h=[...document.querySelectorAll(".spaces-static-body .spaces-db-host")][+(window.__idx||3)]; if(h && h.firstElementChild && !h.querySelector(".spaces-db-loading")) { const k=Math.round(h.getBoundingClientRect().height); if(!window.__snaps[k]) window.__snaps[k]=dump(h); } };
  setInterval(take, 30);
});
await page.goto(ORIGIN + process.argv[2], { waitUntil: "domcontentloaded" });
await page.waitForTimeout(9000);
const sn = await page.evaluate(() => window.__snaps);
for (const [k,v] of Object.entries(sn)) { console.log("=== height", k); console.log(v.slice(0, 5000)); }
await b.close();
