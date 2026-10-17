import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = process.env.ORIGIN, href = process.env.HREF;
const browser = await chromium.launch();
const seed = await browser.newContext(); const sp = await seed.newPage();
await walkSignIn(sp, ORIGIN, { member: true });
const state = await seed.storageState(); state.origins = [];
const ctx = await browser.newContext({ storageState: state, viewport: { width: 1440, height: 900 } });
const w = await ctx.newPage(); await w.goto(ORIGIN + href, { waitUntil: "domcontentloaded", timeout: 180000 }); await w.waitForTimeout(9000); await w.close();
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__snap = [];
  const t0 = performance.now();
  const tick = () => {
    const c = document;
    const host = c?.querySelector("[data-activity-feed]")?.closest(".z-10");
    const kids = host ? [...host.children].map((k) => (k.getAttribute("data-activity-feed") !== null ? "activity" : (k.textContent || "").trim().slice(0, 18) + "<" + k.tagName + ">") + ":" + Math.round(k.getBoundingClientRect().width * 10) / 10) : null;
    const cs = host ? getComputedStyle(host) : null; const s = (host ? host.className.slice(0,80) + " gap=" + cs.columnGap + " pl=" + cs.paddingLeft + " pr=" + cs.paddingRight + " kids=" + [...host.children].map((k)=>{const q=getComputedStyle(k);return q.marginLeft+"/"+q.marginRight+"/"+(k.className.length>60?"":"")+k.className.replace(/shrink-0 items-center/,"").slice(0,200)+"{"+(k.firstElementChild?k.firstElementChild.tagName+"."+String(k.firstElementChild.className).slice(0,120):"")+"}"}).join(" | ") : "") + (host ? " W=" + Math.round(host.getBoundingClientRect().width*10)/10 + " x=" + Math.round(host.getBoundingClientRect().x*10)/10 : "");
    if (s !== window.__last) { window.__last = s; window.__snap.push([Math.round(performance.now() - t0), s]); }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await page.goto(ORIGIN + href, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(20000);
console.log(JSON.stringify(await page.evaluate(() => window.__snap), null, 1));
await browser.close();
