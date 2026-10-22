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
const opts = () => page.locator("[role^=menuitem],[role=option]");
await d.getByText(/pick a column/).first().click({ timeout: 8000 }).catch(() => say("pick fail"));
await page.waitForTimeout(800);
say("COLS", await opts().allInnerTexts());
await opts().filter({ hasText: /^Qty/ }).first().click();
await page.waitForTimeout(1000);
await shot("stage-2-qty");
say("AFTER QTY", (await d.innerText()).replace(/\n+/g, " | ").match(/Rules for entering.{0,600}/)?.[0]);
say("inputs", await page.locator("input,button,[role=combobox]").evaluateAll((e) => e.filter((x) => x.closest("section,div") && x.offsetParent).map((x) => x.tagName + ":" + (x.getAttribute("aria-label") || x.getAttribute("placeholder") || x.innerText || "").slice(0, 30)).filter((t) => !/^BUTTON:$/.test(t)).slice(-60)));
if (STEP === "qty") { await browser.close(); process.exit(0); }
await page.locator("[aria-label=\"Condition comparison\"]").first().click();
await page.waitForTimeout(600);
say("CMP", await opts().allInnerTexts());
await opts().filter({ hasText: /at least|≥|>=|greater than or equal/i }).first().click();
await page.locator("[aria-label=\"Condition value\"]").first().fill("5");
await d.getByLabel("Rule name").fill("BA- Done needs Qty 5");
const words = page.getByRole("textbox", { name: "What it says" });
if (await words.count()) await words.fill("A card needs Qty 5 or more to be Done.");
else await page.getByPlaceholder(/Write the sentence/).first().fill("A card needs Qty 5 or more to be Done.");
await page.waitForTimeout(1200);
say("BEFORE SAVE", (await d.innerText()).replace(/\n+/g, " | ").match(/Rules for entering.{0,400}/)?.[0]);
say("BTNS", (await d.getByRole("button").allInnerTexts()).filter((b) => /Save|Add|Cancel|Rule/i.test(b)));
await d.getByRole("button", { name: /^(Save|Add this rule|Add rule|Save rule)/ }).first().click().catch((e) => say("no save", e.message.slice(0, 80)));
await page.waitForTimeout(5000);
await shot("stage-3-saved");
say("AFTER SAVE", (await d.innerText()).replace(/\n+/g, " | ").match(/Rules for entering.{0,400}/)?.[0]);
await browser.close();
const got = must(await A.client.list({ table_id: tid }), "rows"); const rows = Array.isArray(got) ? got : (got.rows ?? got.records ?? []); say("listkeys", Object.keys(got));
for (const r of rows) {
  const w = await A.client.pipelineMove({ record_id: r.id, to: "Done" });
  say("move", r.document?.name ?? r.document?.data?.name, JSON.stringify(w).slice(0, 300));
}
