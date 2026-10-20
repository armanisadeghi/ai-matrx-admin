import { open, gotoTable, say } from "./at-walk-h-lib.mjs";
import { readFileSync, mkdirSync } from "node:fs";
const id = process.env.TABLE;
const D = process.env.HOME + "/lane-resume/atwj-dl/"; mkdirSync(D, { recursive: true });
const WHO = process.env.WHO === "member" ? "member" : "admin";
const { browser, page, who, shot } = await open(WHO === "member");
say("who", who);
await gotoTable(page, id);
const settle = async (ms = 4000) => { let last = ""; for (let i = 0; i < 60; i++) { await page.waitForTimeout(ms); const t = await page.evaluate(() => document.body.innerText); if (t === last) return; last = t; } };
const gridNames = async () => page.evaluate(() => {
  const want = /^(Alpha|Bravo|Charlie|Delta|Echo|Foxtrot)$/; const out = [];
  document.querySelectorAll("div,span,td").forEach((e) => { if (e.children.length === 0 && want.test(e.textContent.trim())) { const r = e.getBoundingClientRect(); if (r.x < 300 && r.y > 120) out.push([r.y, e.textContent.trim()]); } });
  return out.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
});
await page.getByText(/^Qty$/i).first().click(); await settle();
say("after header sort Qty asc, grid", await gridNames());
await page.getByText(/^Qty$/i).first().click(); await settle();
say("after 2nd click (desc?), grid", await gridNames());
await page.getByRole("button", { name: /Search records/ }).first().click().catch(() => {});
await page.getByPlaceholder(/search/i).first().fill("e"); await settle(6000);
const grid = await gridNames(); say("after search 'e', grid", grid); await shot("j1-final-" + WHO);
async function dl(label) {
  await page.locator('[aria-label^="Copy, transform or export"]').first().click();
  await page.waitForTimeout(600); await page.getByText("Download", { exact: true }).first().click(); await page.waitForTimeout(600);
  const [d] = await Promise.all([page.waitForEvent("download", { timeout: 90000 }), page.getByText(label, { exact: true }).first().click()]);
  const p = D + WHO + "-" + d.suggestedFilename(); await d.saveAs(p); return p;
}
for (const l of ["CSV", "Excel"]) { try { const p = await dl(l); say("downloaded", l, p); } catch (e) { say("download " + l + " failed", e.message.slice(0, 100)); await shot("j1-dlfail-" + l); await page.keyboard.press("Escape"); } }
await browser.close();
