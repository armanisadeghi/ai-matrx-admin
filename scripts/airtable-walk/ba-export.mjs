// BA- CD-IO-04: on the live site, search + sort the grid, then export every format from the Export rail, the table menu and
// the toolbar's Alchemy menu; files saved for comparison with the grid's rows, order and cell words.
import { declareTable } from "@ai-matrx/records/core";
import { mkdirSync } from "node:fs";
import { admin, member, must, live, gotoTable, say } from "./ba-lib.mjs";
const D = process.env.HOME + "/lane-resume/ba-dl/"; mkdirSync(D, { recursive: true });
const A = await admin();
let tid = process.env.TID;
if (!tid) {
  tid = must(await declareTable(A.client, { name: "BA- Export", labelSingular: "Row", labelPlural: "Rows", fields: [
    { key: "name", label: "Name", type: "text", sort: 10 }, { key: "qty", label: "Qty", type: "number", sort: 20 },
    { key: "tags", label: "Tags", type: "multi_select", sort: 30, options: ["Alpha", "Beta", "Gamma"] },
    { key: "joined", label: "Joined", type: "datetime", kind: "datetime", sort: 40 },
    { key: "start", label: "Start", type: "datetime", kind: "date", sort: 50 }] }), "declare");
  for (const [name, qty, tags] of [["Alpha", 3, ["Gamma"]], ["Bravo", 9, ["Alpha", "Beta"]], ["Charlie", 5, ["Beta"]], ["Delta", 1, ["Alpha"]], ["Echo", 7, []]])
    must(await A.client.recordWrite({ table_id: tid, data: { name, qty, tags, joined: "2026-11-03T00:30:00Z", start: "2026-11-02" } }), "row");
  if (process.env.GRANT) await A.sb.schema("custom").rpc("share_grant", { p_organization_id: "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f", p_subject_id: tid, p_principal_kind: "user", p_principal_id: (await member()).userId, p_level: "viewer" });
}
say("table", tid);
const WHO = process.env.WHO === "member" ? "member" : "admin";
const { browser, page, who, shot } = await live(WHO === "member");
say("who", who);
await gotoTable(page, tid);
await page.getByText("Grid", { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1500);
const sb = page.locator('input[placeholder="Search records"]').first();
await sb.click(); await sb.pressSequentially(process.env.SEARCH ?? "e", { delay: 80 }); await page.waitForTimeout(4000);
for (let i = 0; i < Number(process.env.SORTCLICKS ?? 2); i++) { await page.getByText("Qty", { exact: true }).first().click(); await page.waitForTimeout(2500); }
await shot("export-grid-" + WHO);
const grid = await page.$$eval("tr[data-row-id]", (rs) => rs.map((r) => [...r.querySelectorAll("td")].map((c) => c.innerText.trim().replace(/\n+/g, ", ")).filter(Boolean).join(" | ")));
say("GRID", grid);
const save = async (label, trigger) => { try { const [d] = await Promise.all([page.waitForEvent("download", { timeout: 45000 }), trigger()]); const f = D + WHO + "-" + label + "-" + d.suggestedFilename(); await d.saveAs(f); say("downloaded", label, f); } catch (e) { say("FAIL " + label, e.message.slice(0, 100)); await shot("ex-fail-" + label); } };
if (!process.env.SKIP_RAIL) {
await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(600);
await page.getByText(/^Export/).first().click(); await page.waitForTimeout(2500); await shot("export-rail-" + WHO);

for (const n of ["CSV", "XLSX", "Markdown", "JSON", "Full schema"]) await save("rail-" + n.replace(" ", ""), () => page.getByRole("button", { name: n, exact: true }).last().click());
await page.keyboard.press("Escape"); await page.waitForTimeout(800);
await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(600);
await save("menu-csv", () => page.getByRole("menuitem", { name: /^Download CSV/ }).first().click());
await page.keyboard.press("Escape"); await page.waitForTimeout(500);
}
const trig = page.locator('button[aria-label^="Copy, transform or export"]').first();
const openDownload = async () => {
  await page.keyboard.press("Escape"); await page.waitForTimeout(500); await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  await trig.click({ force: true }); await page.waitForTimeout(1500);
  await page.getByText("Download", { exact: true }).first().click({ timeout: 10000 }).catch(() => {}); await page.waitForTimeout(1500);
};
for (const lab of ["CSV", "Excel", "Markdown", "JSON", "Full schema (JSON)"]) {
  await openDownload();
  await save("tb-" + lab.replace(/\W+/g, ""), () => page.getByText(lab, { exact: true }).last().click());
}
await browser.close();
