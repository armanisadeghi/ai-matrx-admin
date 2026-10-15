// RECORD-FIXES live proof: kept-aside person named, image thumbnail (record + grid), ⤢ in-app. node rf-final.mjs <table> <row>
import { store } from "./store.mjs";
import { start, open, out, ORIGIN } from "./lib.mjs";
const [TB, ROW] = process.argv.slice(2);
const { client } = await store();
if (!process.env.SKIP_SEED) {
const d = await client.fieldDeclare({ table_id: TB, spec: { key: "reviewer", label: "Reviewer", type: "member", sort: 60 } });
out("declare", d.ok ? "ok" : JSON.stringify(d.error).slice(0, 200));
const w = await client.recordWrite({ record_id: ROW, table_id: TB, data: { reviewer: "4060701e-706a-4c76-b3ca-0bbc69fa5a14" } });
out("write", w.ok ? "ok" : JSON.stringify(w.error).slice(0, 200));
const f = (await client.fields({ table_id: TB })).data.find((x) => x.key === "reviewer");
const r = await client.migrateRetype({ field_id: f.id, to: "range" });
out("retype", r.ok ? "ok" : JSON.stringify(r.error).slice(0, 200));
}
const { browser, page } = await start(false);
await page.goto(`${ORIGIN}/data/${TB}/r/${ROW}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForSelector("[data-records-retired], [data-records-attachment-editor]", { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(4000);
const retired = await page.locator("[data-records-retired]").innerText().catch(() => "NO KEPT PANEL");
out("kept panel:", retired.replace(/\n+/g, " | ").slice(0, 300));
const input = page.locator("input[type=file]").first();
if (await input.count()) { await input.setInputFiles("/tmp/airtable-walk/referral-scan.png"); await page.waitForTimeout(8000); }
out("record thumb count", await page.locator("[data-records-file-thumb]").count());
await page.screenshot({ path: "/tmp/airtable-walk/rf-record-final.png", fullPage: true });
await open(page, TB);
out("grid thumb count", await page.locator("[data-records-file-thumb]").count());
await page.evaluate(() => (window.__rfMarker = "same-document"));
const t0 = Date.now();
await page.locator("[data-records-open-record]").first().click({ timeout: 8000 });
await page.waitForURL(/\/r\//, { timeout: 15000 });
out("open-record ms", Date.now() - t0, "same document (no reload):", await page.evaluate(() => window.__rfMarker === "same-document"));
await page.goBack(); await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/airtable-walk/rf-grid-final.png" });
await browser.close();
