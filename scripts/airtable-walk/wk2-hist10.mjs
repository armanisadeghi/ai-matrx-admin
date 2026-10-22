import { declareTable } from "@ai-matrx/records/core";
import { admin, must, live, gotoTable, say } from "./ba-lib.mjs";
const A = await admin();
let tid = process.env.TID;
if (!tid) {
  tid = must(await declareTable(A.client, { name: "WK2- History", labelSingular: "Person", labelPlural: "People", fields: [
    { key: "name", label: "Name", type: "text", sort: 10 }, { key: "address", label: "Address", type: "text", sort: 20 }] }), "declare");
  must(await A.client.recordWrite({ table_id: tid, data: { name: "Ann", address: "X Street" } }), "row");
}
say("table", tid);
const { browser, page, who, shot } = await live(false);
say("who", who);
await gotoTable(page, tid);
await page.getByRole("button", { name: "Table menu" }).first().click();
await page.locator("[role^=menuitem]").filter({ hasText: /^Settings/ }).first().click();
await page.waitForTimeout(6000);
const d = page.locator("body");
const t = (await d.innerText()).replace(/\n+/g, " | ");
say("RETENTION?", t.match(/.{0,200}(Keep value history|value history).{0,300}/i)?.[0]);
await shot("wk2-h10-1");
const inp = d.locator('xpath=//*[contains(text(),"Keep value history for")]/following::input[1]');
say("input count", await inp.count(), await inp.first().inputValue());
await inp.first().fill("10");
await d.getByRole("button", { name: "Save", exact: true }).first().click().catch(e=>say("save?", e.message.slice(0,80)));
await page.waitForTimeout(3000);
say("AFTER10", ((await d.innerText()).replace(/\n+/g," | ")).match(/Keep value history.{0,300}/)?.[0]);
await shot("wk2-h10-2");
await inp.first().fill("60");
await d.getByRole("button", { name: "Save", exact: true }).first().click().catch(e=>say("save?", e.message.slice(0,80)));
await page.waitForTimeout(3000);
say("AFTER60", ((await d.innerText()).replace(/\n+/g," | ")).match(/Keep value history.{0,300}/)?.[0]);
await shot("wk2-h10-3");
say("STORE", JSON.stringify(await A.client.historyRetention?.({table_id: tid})));
await page.reload(); await page.waitForTimeout(500);

await browser.close();
