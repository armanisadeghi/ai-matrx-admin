// AT-FIX-J2 items 3 and 5: as test@test.com (zone saved by the tz script), run the rail CSV/XLSX, the table menu's Download CSV and the toolbar's Download; save the files.
import { open, gotoTable, say, makeSetZone } from "./at-fix-j2-lib.mjs";
import { mkdirSync } from "node:fs";
const D = process.env.HOME + "/lane-resume/atfj2-dl/"; mkdirSync(D, { recursive: true });
const WHO = process.env.WHO === "admin" ? "admin" : "member";
const { browser, page, who, shot } = await open(WHO === "member");
say("who", who);
const setZone = makeSetZone(page, say);
if (process.env.ZONE) await setZone(process.env.ZONE === "device" ? null : process.env.ZONE);
await gotoTable(page, process.env.TABLE); await page.waitForTimeout(4000);
await page.getByText("Grid", { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1500);
const save = async (label, trigger) => { try { const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), trigger()]); const f = D + WHO + "-" + label + "-" + d.suggestedFilename(); await d.saveAs(f); say("downloaded", label, f); } catch (e) { say("download " + label + " failed", e.message.slice(0, 120)); await shot("ex-fail-" + label); } };
if (process.env.STEP === "explore") {
  say("toolbar buttons", await page.evaluate(() => [...document.querySelectorAll("[data-table-toolbar] button, [data-table-toolbar] [role=button]")].map((b) => (b.getAttribute("aria-label") || b.title || b.innerText || "").trim().slice(0, 50))));
}
// 1. rail
await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(600);
await page.getByText(/^Export/).first().click(); await page.waitForTimeout(2500); await shot("ex1-rail");
await save("rail-csv", () => page.getByRole("button", { name: "CSV", exact: true }).first().click());
await save("rail-xlsx", () => page.getByRole("button", { name: "XLSX", exact: true }).first().click());
await page.keyboard.press("Escape");
// 2. table menu Download CSV
await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(600);
await save("menu-csv", () => page.getByRole("menuitem", { name: /^Download CSV/ }).first().click());
// 3. toolbar copy/export control
const trig = page.locator('[data-table-toolbar] button[aria-label*="opy" i], [data-table-toolbar] button[aria-label*="ownload" i], [data-table-toolbar] button[aria-label*="xport" i]').first();
say("toolbar trigger", await trig.getAttribute("aria-label").catch(() => "(none)"));
await trig.click().catch(() => {}); await page.waitForTimeout(1500); await shot("ex2-toolbar");
say("toolbar menu", await page.$$eval("[role=menuitem],[role=button][aria-label*=ownload]", (e) => e.map((x) => (x.getAttribute("aria-label") || x.innerText).trim().replace(/\n/g, " ").slice(0, 40))));
if (process.env.RESTORE) await setZone(null);
await browser.close();
