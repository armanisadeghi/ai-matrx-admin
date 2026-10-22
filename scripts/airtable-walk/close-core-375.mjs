// CLOSE-CORE CD-CORE-09 at 375 px: a Choice value on a phone — the folded grid card and the record page —
// opens a list that is searchable and fully on screen. Reuses close-core-signin.mjs's admin cookies.
// Run: ORIGIN=http://close-core.localhost:3001 node scripts/airtable-walk/close-core-375.mjs
import { chromium } from "playwright";
import { declareTable } from "@ai-matrx/records/core";
import { admin as adminStore, say } from "./at-fix-j-lib.mjs";
import { ORIGIN } from "./lib.mjs";
const SHOTS = process.env.HOME + "/lane-resume/close-core-shots/r3-375b-";
const { client } = await adminStore();
const t = await declareTable(client, { name: `CC phone ${Math.random().toString(36).slice(2, 6)}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "status", label: "Status", type: "select", sort: 20, options: ["Waiting", "Done", "Lost", "Booked", "Declined"] },
] });
if (!t.ok) throw new Error(t.error.message);
const id = (await client.recordWrite({ table_id: t.data, data: { name: "Alpha", status: "waiting" } })).data;
let fails = 0;
const check = (ok, what, detail) => { if (!ok) fails++; say(ok ? "PASS" : "FAIL", what, detail ?? ""); };
const b = await chromium.launch({ headless: true });
try {
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, storageState: process.env.HOME + "/lane-resume/close-core-state/admin.json" });
  ctx.setDefaultNavigationTimeout(900000);
  const p = await ctx.newPage(); p.setDefaultTimeout(30000); p.setDefaultNavigationTimeout(900000);
  const options = () => p.evaluate(() => [...document.querySelectorAll("[role=option]")].filter((o) => o.offsetParent !== null).map((o) => { const r = o.getBoundingClientRect(); return { t: (o.innerText || "").trim(), inView: r.left >= 0 && r.right <= innerWidth + 0.5 && r.top >= 0 && r.bottom <= innerHeight + 0.5 }; }));
  for (const [where, url] of [["grid card", `${ORIGIN}/data/${t.data}`], ["record page", `${ORIGIN}/data/${t.data}/r/${id}`]]) {
    await p.goto(url, { waitUntil: "domcontentloaded" });
    await p.getByText("Alpha").first().waitFor({ timeout: 900000 });
    await p.waitForTimeout(4000);
    const chip = p.getByText("Waiting", { exact: true }).first();
    await chip.scrollIntoViewIfNeeded().catch(() => {});
    await p.screenshot({ path: `${SHOTS}${where.replace(" ", "-")}-before.png` });
    await chip.tap({ timeout: 15000 }).catch(async (e) => { say(where, "tap failed:", e.message.split("\n")[0]); await chip.click({ force: true, timeout: 15000 }).catch(() => {}); });
    await p.waitForTimeout(2500);
    if (!(await options()).length) { await chip.dblclick({ timeout: 10000 }).catch(() => {}); await p.waitForTimeout(2500); }
    const o = await options();
    await p.screenshot({ path: `${SHOTS}${where.replace(" ", "-")}-open.png` });
    say(where, "url now", p.url());
    check(o.length >= 5 && o.every((x) => x.inView), `CD-CORE-09 at 375 px (${where}): every option fully on screen`, o);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    check(!overflow, `CD-CORE-09 at 375 px (${where}): no sideways page scroll`);
    await p.keyboard.press("Escape").catch(() => {});
  }
} catch (e) { fails++; say("ERROR", e.message.split("\n")[0]); }
finally {
  await b.close();
  for (let i = 0; i < 6; i++) { const r = await client.tableArchive({ table_id: t.data, chunk: 5, includeTable: true }); if (r.ok && r.data?.done !== false) { say("archived", t.data); break; } await new Promise((res) => setTimeout(res, 4000)); }
  say(fails ? `${fails} FAILED` : "ALL PASS");
}
