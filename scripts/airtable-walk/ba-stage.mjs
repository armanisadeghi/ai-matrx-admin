// BA- CD-AUTO-18: a NEW stage rule drawn in the builder (Qty >= 5 on Done), then a Qty 4 card refused, a Qty 7 card moved.
import { declareTable } from "@ai-matrx/records/core";
import { admin, must, live, gotoTable, say } from "./ba-lib.mjs";
const A = await admin();
let tid = process.env.TID; const STEP = process.env.STEP ?? "explore";
if (!tid) {
  tid = must(await declareTable(A.client, { name: "BA- Stage rules", labelSingular: "Card", labelPlural: "Cards", fields: [
    { key: "name", label: "Name", type: "text", sort: 10 }, { key: "qty", label: "Qty", type: "number", sort: 20 },
    { key: "stage", label: "Stage", type: "select", sort: 30, options: ["Todo", "Doing", "Done"] }] }), "declare");
  for (const [name, qty] of [["Four", 4], ["Seven", 7]]) must(await A.client.recordWrite({ table_id: tid, data: { name, qty, stage: "Todo" } }), "row");
  say("pipeline", (await A.client.pipelineDeclare({ table_id: tid, spec: { stage_field: { key: "stage", options: ["Todo", "Doing", "Done"] } } })).ok);
}
say("table", tid);
const { browser, page, who, shot } = await live(false);
say("who", who);
await gotoTable(page, tid);
await page.getByRole("button", { name: "Table menu" }).first().click();
await page.locator("[role^=menuitem]").filter({ hasText: /^Settings/ }).first().click();
await page.waitForTimeout(6000);
const d = page.locator("body");
const sec = d.getByText("Rules for entering a stage");
await sec.first().scrollIntoViewIfNeeded().catch(() => {});
const add = d.getByRole("button", { name: "Add a rule" });
say("add", await add.count());
await d.getByRole("button", { name: "Stage", exact: true }).last().click().catch((e) => say("stage btn", e.message.slice(0, 60)));
await page.locator("[role^=menuitem],[role=option]").filter({ hasText: /^Done/ }).first().click().catch(() => say("no Done option"));
await page.waitForTimeout(800);
await add.first().click();
await page.waitForTimeout(1500);
await shot("stage-1-new");
const txt = (await d.innerText()).replace(/\n+/g, " | ");
say("EDITOR", txt.match(/Rules for entering.{0,900}/)?.[0]);
say("NOT DRAWN?", /not something this builder can draw/.test(txt));
say("clause els", await d.locator("[data-testid=stage-rule-clause-in-words] *").evaluateAll((e) => e.slice(0, 20).map((x) => x.tagName + ":" + (x.getAttribute("aria-label") || x.innerText).slice(0, 30))));
if (STEP === "explore") { await browser.close(); process.exit(0); }
