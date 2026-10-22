import { declareTable } from "@ai-matrx/records/core";
import { admin, must, live, gotoTable, say, SHOTS } from "./ba-lib.mjs";
import { readFileSync } from "node:fs";
const A = await admin();
let tid = process.env.TID;
if (!tid) {
  tid = must(await declareTable(A.client, { name: "WK2- Export", labelSingular: "Row", labelPlural: "Rows", fields: [
    { key: "name", label: "Name", type: "text", sort: 10 },
    { key: "tags", label: "Tags", type: "multi_select", sort: 20, options: ["Alpha","Beta"] },
    { key: "joined", label: "Joined", type: "datetime", sort: 30 }] }), "declare");
  must(await A.client.recordWrite({ table_id: tid, data: { name: "Full", tags: ["Alpha","Beta"], joined: "2026-11-02T16:30:00Z" } }), "r1");
  must(await A.client.recordWrite({ table_id: tid, data: { name: "Empty", tags: [], joined: "2026-11-03T16:30:00Z" } }), "r2");
}
say("table", tid);
const { browser, page, shot } = await live(false);
await gotoTable(page, tid);
await page.getByRole("button", { name: /Copy, transform or export WK2- Export/ }).first().click();
await page.waitForTimeout(1000);
await shot("wk2-io04-1");
await page.getByRole("menuitem",{name:/^Download/}).or(page.getByText("Download",{exact:true})).first().click();
await page.waitForTimeout(800);
await shot("wk2-io04-2");
say("SUB", (await page.locator("[role^=menu]").allInnerTexts()).map(t=>t.replace(/\n+/g," | ").slice(0,400)));
const [dl] = await Promise.all([page.waitForEvent("download",{timeout:30000}), page.getByText("Markdown",{exact:true}).last().click()]);
const p = SHOTS+"wk2-export.md"; await dl.saveAs(p);
say("FILE", dl.suggestedFilename()); console.log(readFileSync(p,"utf8"));
process.exit(0);
