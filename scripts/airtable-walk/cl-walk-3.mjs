// CLOSE-LINK walk 3 (browser, WHO=admin|member): every CD-LINK row's screen in one signed-in session, each step on its own
// (a failed step is logged and the walk goes on). Host: ORIGIN. Shots + text: ~/lane-resume/closelink/r4/shots/w3-*.
import { open, say, gotoTable, ORIGIN } from "./at-fix-j2-lib.mjs";
import { writeFileSync } from "node:fs";
const S = process.env.HOME + "/lane-resume/closelink/r4/shots/";
const T = { clients: "475d36ce-7e0e-4914-bb2e-f9372f999e48", bookings: "7dad23dc-ac4a-46a4-876c-499cdf9b8793", sup: "ee75cc4e-5ec9-4e57-ad89-6e0c80547d1f" };
const ONLY = (process.env.STEPS ?? "picker,settings,move,history,backlinks,restrict,tablesettings").split(",");
const { browser, page, who, errs } = await open(process.env.WHO === "member");
const tag = process.env.WHO === "member" ? "m-" : "";
say("who", who, "origin", ORIGIN);
if (/walk cap/i.test(await page.locator("body").innerText().catch(() => ""))) { say("WALK CAP"); await browser.close(); process.exit(3); }
const shot = (n) => page.screenshot({ path: S + "w3-" + tag + n + ".png" }).catch(() => {});
const dump = async (n, sel = "body") => { const t = (await page.locator(sel).last().innerText().catch(() => "")).replace(/\n+/g, " | "); writeFileSync(S + "w3-" + tag + n + ".txt", t); return t; };
const row = (title) => page.locator("tbody tr").filter({ hasText: title }).first();
const cellOf = async (title, key) => row(title).locator(`[data-matrx-cell-col='${key}']`).first();
async function rowMenu(title, item, key = "title") {
  await row(title).locator(`[data-matrx-cell-col='${key}']`).first().click({ button: "right" });
  await page.waitForTimeout(800);
  await page.getByRole("menuitem", { name: item }).first().click();
  await page.waitForTimeout(2500);
}
async function step(name, fn) {
  if (!ONLY.includes(name)) return;
  try { await fn(); say("STEP", name, "done"); } catch (e) { say("STEP", name, "ERR", String(e).slice(0, 300)); await shot(name + "-err"); }
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(600);
}
await gotoTable(page, T.bookings);
await shot("grid"); await dump("grid", "[data-table-toolbar] >> xpath=../..");

await step("picker", async () => {
  const cell = await cellOf("Summer order", "client");
  await cell.click(); await page.waitForTimeout(500); await page.keyboard.press("Enter"); await page.waitForTimeout(3000);
  say("candidates", await page.locator("[data-relation-candidate]").allInnerTexts());
  await page.keyboard.type("Harb", { delay: 80 }); await page.waitForTimeout(2500);
  say("after Harb", await page.locator("[data-relation-candidate]").allInnerTexts());
  await shot("picker");
});
await step("settings", async () => {
  await page.locator("th").filter({ hasText: /^Client/ }).first().click({ button: "right" });
  await page.waitForTimeout(800);
  await page.getByRole("menuitem", { name: "Column settings…" }).first().click();
  await page.waitForTimeout(4000);
  const t = await dump("settings", "[role=dialog]");
  say("settings has", { choices: t.includes("Choices come from"), binding: t.includes("When a linked record changes"), carries: t.includes("Whoever sees a linked record"), also: t.includes("Also points at") });
  await shot("settings");
});
await step("move", async () => {
  await rowMenu("Summer order", "Move under…");
  await shot("move-dialog"); say("move dialog", (await dump("move-dialog", "[role=dialog]")).slice(0, 600));
  await page.locator("[data-records-move-under-search]").fill("Spring"); await page.waitForTimeout(2500);
  await page.locator("[data-records-move-under-option]").first().click(); await page.waitForTimeout(500);
  await page.locator("[data-records-move-under-go]").click(); await page.waitForTimeout(4000);
  say("after move", (await page.locator("body").innerText()).match(/[^\n]*(Moved|moved|under)[^\n]*/g)?.slice(0, 5));
  await shot("moved");
  await page.keyboard.press("Escape"); await page.waitForTimeout(800);
  await rowMenu("Spring order", "Move under…");
  await page.locator("[data-records-move-under-search]").fill("Summer"); await page.waitForTimeout(2500);
  await page.locator("[data-records-move-under-option]").first().click(); await page.waitForTimeout(500);
  await page.locator("[data-records-move-under-go]").click(); await page.waitForTimeout(4000);
  say("ring refused", (await dump("move-refused", "[role=dialog]")).slice(0, 600));
  await shot("move-refused");
});
await step("history", async () => {
  await rowMenu("Spring order", "Row history");
  await page.waitForTimeout(4000);
  const t = await dump("history");
  say("history mentions Client", t.includes("Client"), t.slice(t.indexOf("History") - 50, t.indexOf("History") + 600));
  await shot("history");
});
await step("backlinks", async () => {
  await gotoTable(page, T.clients);
  await rowMenu("Harbor Bakery", "Open record", "name");
  await page.waitForTimeout(4000);
  const t = await dump("client-record");
  say("client record shows bookings", { spring: t.includes("Spring order"), summer: t.includes("Summer order") }, t.slice(0, 900));
  await shot("client-record");
});
await step("restrict", async () => {
  await gotoTable(page, T.sup);
  const first = await page.locator("tbody tr").first().innerText();
  say("supplier row", first.replace(/\n+/g, " | "));
  await page.locator("tbody tr").first().locator("[data-matrx-cell-col='name']").first().click({ button: "right" });
  await page.waitForTimeout(800);
  await page.getByRole("menuitem", { name: "Archive record" }).first().click(); await page.waitForTimeout(1500);
  await shot("archive-confirm");
  const confirm = page.getByRole("button", { name: /^Archive/ }).last();
  if (await confirm.count()) { await confirm.click(); await page.waitForTimeout(4000); }
  const t = await dump("restrict");
  say("restrict text", t.match(/[^|]*(still used|PO-100)[^|]*/g)?.slice(0, 4));
  await shot("restrict");
});
await step("tablesettings", async () => {
  await gotoTable(page, T.bookings);
  await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(800);
  const items = await page.getByRole("menuitem").allInnerTexts(); say("table menu", items);
  await page.getByRole("menuitem", { name: /settings/i }).first().click(); await page.waitForTimeout(4000);
  const t = await dump("tablesettings", "[role=dialog]");
  say("table settings", { homes: /lives in/i.test(t), cross: /other organizations/i.test(t) }, t.slice(0, 800));
  await shot("tablesettings");
});
say("console errors", errs.slice(0, 6));
await browser.close();
