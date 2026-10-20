// AT-FIX-J2 item 3: the grid toolbar's "Copy, transform or export" > Download > CSV / Excel, saved to compare with the rail's files.
import { open, gotoTable, say } from "./at-fix-j2-lib.mjs";
import { mkdirSync } from "node:fs";
const D = process.env.HOME + "/lane-resume/atfj2-dl/"; mkdirSync(D, { recursive: true });
const WHO = process.env.WHO === "admin" ? "admin" : "member";
const { browser, page, who, shot } = await open(WHO === "member");
say("who", who);
await gotoTable(page, process.env.TABLE); await page.waitForTimeout(4000);
await page.getByRole("tab", { name: "Grid" }).first().click().catch(async () => { await page.getByText("Grid", { exact: true }).first().click(); }); await page.waitForTimeout(2500);
await page.getByRole("button", { name: /Copy, transform or export/ }).first().click(); await page.waitForTimeout(2000); await shot("tb1-menu");
say("menu", await page.$$eval("[role=menuitem],[role=menu] button,[role=dialog] button", (e) => e.map((x) => (x.getAttribute("aria-label") || x.innerText).trim().replace(/\n/g, " ").slice(0, 40)).slice(0, 40)));
await page.getByText("Download", { exact: true }).first().click().catch((e) => say("no Download fold", e.message.slice(0, 60))); await page.waitForTimeout(1200); await shot("tb2-download");
say("download items", await page.$$eval("[role=menuitem],[role=menu] button,[role=dialog] button", (e) => e.map((x) => (x.getAttribute("aria-label") || x.innerText).trim().replace(/\n/g, " ").slice(0, 40)).slice(0, 40)));
for (const name of (process.env.ONLY ? [process.env.ONLY] : ["Download CSV", "Download Excel workbook"])) {
  const item = page.getByRole("button", { name }).first();
  if (!(await item.count())) continue;
  try { const [d] = await Promise.all([page.waitForEvent("download", { timeout: 60000 }), item.click()]); const f = D + WHO + "-toolbar-" + name.replace(/\W+/g, "-") + "-" + d.suggestedFilename(); await d.saveAs(f); say("downloaded", name, f); } catch (e) { say(name, "failed", e.message.slice(0, 100)); }
  await page.getByRole("button", { name: /Copy, transform or export/ }).first().click().catch(() => {}); await page.waitForTimeout(1000);
  await page.getByText("Download", { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(800);
}
await browser.close();
