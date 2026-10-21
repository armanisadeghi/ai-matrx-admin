import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { fillSecret } from "./lib/seat-browser.mjs";
const base = process.argv[2], route = process.argv[3] || "/agents", out = process.argv[4];
fs.mkdirSync(out, { recursive: true });
const env = {};
for (const line of fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*(AI_ADMIN_USERNAME|AI_ADMIN_PASSWORD)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m) env[m[1]] = m[2];
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${base}/login`, { timeout: 120000 });
await page.waitForTimeout(3000);
await page.fill('input[type="email"]', env.AI_ADMIN_USERNAME);
await fillSecret(page, 'input[type="password"]', env.AI_ADMIN_PASSWORD);
await page.evaluate(() => document.querySelector("form")?.requestSubmit());
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 });
await page.waitForTimeout(3000);
const cands = await page.evaluate(() => [...document.querySelectorAll("button,[role=button],a")].map((e) => (e.getAttribute("aria-label") || e.getAttribute("title") || "")).filter((t) => /debug|admin|bug|watch/i.test(t)));
console.log("candidates", JSON.stringify(cands));
if (!process.env.NO_DEBUG) { await page.evaluate(() => { const e = [...document.querySelectorAll("button,[role=button],a")].find((x) => /Turn debug mode on/.test(x.getAttribute("aria-label") || x.getAttribute("title") || "")); if (e) e.click(); }); await page.waitForTimeout(1500); }
const sep = route.includes("?") ? "&" : "?";
await page.goto(`${base}${route}${sep}panels=ai-watch:page`, { timeout: 120000 });
await page.waitForTimeout(8000);
const present = await page.locator('[data-testid="ai-watch-rail"]').count();
const body = (await page.locator("body").innerText()).slice(0, 0);
await page.screenshot({ path: path.join(out, "opened.png") });
const reqs = [];
page.on("request", (r) => { const u = r.url(); if (/supabase|db\.matrxserver|rest\/v1|realtime/.test(u) && !u.startsWith("ws")) reqs.push(r.method() + " " + u.replace(/\?.*$/, "").slice(0, 110)); });
await page.waitForTimeout(Number(process.env.IDLE_MS||30000));
const counts = {};
for (const r of reqs) counts[r] = (counts[r] || 0) + 1;
console.log(JSON.stringify({ debugBtn: await page.evaluate(() => [...document.querySelectorAll("button,[role=button],a")].filter((x) => /Turn debug mode off/.test(x.getAttribute("aria-label") || x.getAttribute("title") || "")).length), url: page.url(), railPresent: present, dataRequestsIn30s: reqs.length, counts }, null, 1));
await browser.close();
