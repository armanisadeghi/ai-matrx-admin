// AT-FIX-G4: what a table page shows when table_page_bundle / table_facts answer a statement timeout (57014).
// Usage: ORIGIN=http://<host>.localhost:3001 node scripts/airtable-walk/g4-timeout-walk.mjs <tableId> [doors=table_page_bundle,table_facts] [timesPerDoor=all]
import { start, ORIGIN } from "./lib.mjs";
const TABLE = process.argv[2];
const DOORS = (process.argv[3] ?? "table_page_bundle,table_facts").split(",").filter(Boolean);
const TIMES = process.argv[4] ?? "all";
const { browser, ctx, page, who, errs } = await start(true);
console.log("who", who, "origin", ORIGIN);
const hits = {};
for (const door of DOORS) {
  await ctx.route(new RegExp(`/rest/v1/rpc/${door}(\\?|$)`), (route) => {
    hits[door] = (hits[door] ?? 0) + 1;
    if (TIMES === "all" || hits[door] <= Number(TIMES)) {
      return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ code: "57014", message: "canceling statement due to statement timeout", details: null, hint: null }) });
    }
    return route.continue();
  });
}
const t0 = Date.now();
await page.goto(`${ORIGIN}/data/${TABLE}`, { waitUntil: "domcontentloaded", timeout: 240000 });
const snap = () => page.evaluate(() => {
  const t = document.body.innerText.replace(/\s+/g, " ");
  return { skeleton: document.querySelectorAll("[class*=animate-pulse], [data-skeleton], [data-records-skeleton]").length, toolbar: document.querySelectorAll("[data-table-toolbar]").length, rows: document.querySelectorAll("tbody tr, [role=row]").length, tooLong: /took too long|too long to answer/i.test(t), retry: /try again|retry/i.test(t), h: document.documentElement.scrollHeight };
});
for (let i = 0; i < 24; i++) { await page.waitForTimeout(2500); console.log(Math.round((Date.now() - t0) / 1000) + "s", JSON.stringify(await snap()), JSON.stringify(hits)); }
console.log("body", (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ").slice(0, 400));
console.log("console errors", JSON.stringify(errs.slice(0, 6)));
await page.screenshot({ path: process.env.SHOT ?? "/tmp/g4-timeout.png" });
await browser.close();
