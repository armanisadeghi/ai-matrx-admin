import { open, gotoTable, say } from "./at-walk-h-lib.mjs";
import { mkdirSync } from "node:fs";
const D = process.env.HOME + "/lane-resume/atwj-dl/"; mkdirSync(D, { recursive: true });
const WHO = process.env.WHO === "member" ? "member" : "admin";
const { browser, page, who, shot } = await open(WHO === "member");
say("who", who);
await gotoTable(page, process.env.TABLE);
const settle = async (ms = 4000) => { let last = ""; for (let i = 0; i < 40; i++) { await page.waitForTimeout(ms); const t = await page.evaluate(() => document.body.innerText); if (t === last) return; last = t; } };
const gridNames = async () => page.evaluate(() => { const want = /^(Alpha|Bravo|Charlie|Delta|Echo|Foxtrot)$/; const out = []; document.querySelectorAll("div,span,td").forEach((e) => { if (e.children.length === 0 && want.test(e.textContent.trim())) { const r = e.getBoundingClientRect(); if (r.x < 300 && r.y > 120) out.push([r.y, e.textContent.trim()]); } }); return out.sort((a, b) => a[0] - b[0]).map((x) => x[1]); });
await page.getByText(/^Qty$/i).first().click(); await settle();
await page.getByText(/^Qty$/i).first().click(); await settle();
say("sorted Qty desc", await gridNames());
// search
await page.getByRole("button", { name: /Search records/ }).first().click();
await page.keyboard.type("Done", { delay: 120 }); await settle(5000);
say("search 'Done'", await gridNames());
// filter
await page.getByRole("button", { name: /^Filter/ }).first().click(); await page.waitForTimeout(1200); await shot("j1-filter");
await page.getByText("Pick a field").first().click(); await page.waitForTimeout(600);
await page.getByRole("option", { name: /^Qty$/ }).first().click(); await page.waitForTimeout(1200); await shot("j1-filter2");
await page.locator("[data-radix-popper-content-wrapper] button[role=combobox]").nth(1).click(); await page.waitForTimeout(500);
say("ops", await page.$$eval("[role=option]", (els) => els.map((e) => e.innerText.trim())));
await page.getByRole("option", { name: /^is not$/i }).first().click();
await page.locator("[data-radix-popper-content-wrapper] input").first().fill("7");
await page.getByRole("button", { name: "Apply" }).click(); await settle(5000);
const grid = await gridNames(); say("grid: sort Qty desc + search Done + Qty is not 7", grid); await shot("j1-final-" + WHO);
await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(600);
await page.getByText(/^Export/).first().click(); await page.waitForTimeout(2000);
for (const l of ["CSV", "XLSX"]) {
  try { const [d] = await Promise.all([page.waitForEvent("download", { timeout: 90000 }), page.getByRole("button", { name: l, exact: true }).first().click()]); const f = D + WHO + "-panel-" + d.suggestedFilename(); await d.saveAs(f); say("downloaded", l, f); } catch (e) { say("download " + l + " failed", e.message.slice(0, 100)); await shot("j1-dlfail-" + l); }
}
await browser.close();
