// AT-FIX-G3: test@test.com opens a table; reports what draws, console errors, failed requests.
import { start, ORIGIN } from "./lib.mjs";
const TABLE = process.argv[2];
const { browser, page, who, errs } = await start(true);
console.log("who", who, "origin", ORIGIN);
const bad = []; const calls = []; page.on("response", (r) => { if (/rpc|rest\/v1|supabase|matrxserver/.test(r.url())) calls.push(r.status() + " " + r.url().slice(0, 110)); if (r.status() >= 400) bad.push(r.status() + " " + r.url().slice(0, 140)); }); page.on("requestfailed", (r) => bad.push("FAILED " + r.url().slice(0, 140) + " " + r.failure()?.errorText));
const t0 = Date.now();
await page.goto(`${ORIGIN}/data/${TABLE}`, { waitUntil: "domcontentloaded", timeout: 240000 });
let ok = false;
for (let i = 0; i < 40; i++) { if (await page.locator("[data-table-toolbar]").count()) { ok = true; break; } await page.waitForTimeout(3000); }
console.log("toolbar drawn", ok, Math.round((Date.now() - t0) / 1000) + "s", "url", page.url());
await page.waitForTimeout(Number(process.env.EXTRA_WAIT ?? 0));
console.log("skeleton rows", await page.locator("[class*=animate-pulse], [data-skeleton]").count(), "data rows", await page.locator("tbody tr, [role=row]").count());
console.log("body", (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 500));
console.log("console errors", JSON.stringify(errs.slice(0, 8)));
console.log("calls", JSON.stringify(calls.slice(-25), null, 0));
console.log("bad responses", JSON.stringify(bad.slice(0, 10)));
await page.screenshot({ path: "/tmp/g3-member-open.png" });
await browser.close();
