// node pier-shot.mjs <tableId> <recordId> <out.png> [width]
import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const [tb, rec, png, w] = process.argv.slice(2);
const O = process.env.ORIGIN ?? "http://s96c6068c.localhost:3001";
const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: Number(w ?? 1440), height: 1000 } }); const p = await c.newPage();
await walkSignIn(p, O);
await p.goto(`${O}/data/${tb}/r/${rec}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await p.waitForTimeout(12000);
await p.screenshot({ path: png });
console.log(JSON.stringify(await p.evaluate(() => { const t = document.querySelector("[data-records-structured='table']"); const f = t?.firstElementChild; return { aboutFirst: [...document.querySelectorAll("dd, div")].find((e) => /We recycle/.test(e.textContent) && e.children.length < 3)?.getBoundingClientRect().x, frameScroll: f ? f.scrollWidth - f.clientWidth : null, cols: t?.querySelectorAll("th").length }; })));
await b.close();
