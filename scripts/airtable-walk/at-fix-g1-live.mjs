// AT-FIX-G1 live check (items 1, 2, 4, 5): seed with at-walk-g-seed (sweep org; test@test.com is an interface-only outsider),
// open the interface as test@test.com and as admin, read the number titles, the chart box, the status words; then archive the
// interface by its own door and the table. Prints one JSON verdict.
import { execFileSync } from "node:child_process";
import { store } from "./store.mjs";
import { start, ORIGIN } from "./lib.mjs";
process.env.WALK_ORG_ID ??= "9c54ebd0-49c0-4ff0-8a51-1cd2c6b8562d";
const raw = execFileSync("node", ["scripts/airtable-walk/at-walk-g-seed.mjs"], { cwd: new URL("../..", import.meta.url).pathname, encoding: "utf8", env: process.env });
const seed = JSON.parse(raw.trim().split("\n").pop());
console.log("seed", JSON.stringify({ table: seed.table, iface: seed.iface }));
const { client } = await store();
const verdict = {};
async function look(member) {
  const s = await start(member); const page = s.page; page.setDefaultTimeout(20000);
  const who = member ? "outsider" : "admin"; const v = (verdict[who] = {});
  try {
    await page.goto(`${ORIGIN}/data/interfaces/${seed.iface}`, { waitUntil: "domcontentloaded", timeout: 240000 });
    await page.waitForSelector("[data-records-page-number]", { timeout: 120000 }); await page.waitForTimeout(2500);
    v.titles = await page.locator("[data-records-page-number-title]").allInnerTexts();
    v.numbers = await page.locator("[data-records-page-number]").allInnerTexts();
    v.chartNote = await page.locator("[data-records-page-chart-note]").allInnerTexts();
    v.chartDrawn = await page.locator("[data-records-page-block=chart]").count();
    await page.screenshot({ path: `/tmp/atfg1-${who}-dash.png` });
    await page.getByText("Edit grid", { exact: true }).first().click(); await page.waitForTimeout(5000);
    v.gridText = (await page.locator("main, body").first().innerText()).replace(/\s+/g, " ").slice(0, 600);
    await page.screenshot({ path: `/tmp/atfg1-${who}-grid.png` });
  } catch (e) { v.error = e.message.split("\n")[0]; await page.screenshot({ path: `/tmp/atfg1-${who}-err.png` }).catch(() => {}); }
  await s.browser.close();
}
await look(true); await look(false);
const del = await client.dashboardDelete({ dashboard_id: seed.iface }); verdict.archiveDoor = del.ok ? "ok" : JSON.stringify(del.error);
for (let i = 0; i < 20; i++) { const a = await client.tableArchive({ table_id: seed.table, chunk: 2, includeTable: true }); if (a.ok && a.data.done) { verdict.tableArchived = true; break; } }
console.log(JSON.stringify(verdict, null, 1));
