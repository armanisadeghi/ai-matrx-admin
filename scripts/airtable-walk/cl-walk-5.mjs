// CLOSE-LINK walk 5 (= walk 4 with the Move dialog's table picked first, the archive confirm read as an alertdialog) (browser, WHO=admin|member, round 2026-10-22): every CD-LINK screen on the installed records-ui, each step on its
// own (a failed step is logged and the walk goes on). Menus are reached through their "Search this menu…" box, so a moved item still
// resolves. STEPS=comma list. Host: ORIGIN. Shots + text: ~/lane-resume/closelink/r6/shots/w4-*.
import { open, say, gotoTable, ORIGIN } from "./at-fix-j2-lib.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
const S = process.env.HOME + "/lane-resume/closelink/r6/shots/";
mkdirSync(S, { recursive: true });
const T = { clients: "475d36ce-7e0e-4914-bb2e-f9372f999e48", bookings: "7dad23dc-ac4a-46a4-876c-499cdf9b8793", sup: "ee75cc4e-5ec9-4e57-ad89-6e0c80547d1f", tags: "2b5c17fa-ede0-4070-bc11-46756b831486", pos: "f72f1831-f2c9-49db-a5c3-17f10146060e" };
const ONLY = (process.env.STEPS ?? "picker,settings,move,history,backlinks,restrict,tablesettings").split(",");
const { browser, page, who, errs } = await open(process.env.WHO === "member");
const tag = process.env.WHO === "member" ? "m-" : "";
say("who", who, "origin", ORIGIN);
const shot = (n) => page.screenshot({ path: S + "w5-" + tag + n + ".png" }).catch(() => {});
const bodyText = async () => (await page.locator("body").innerText().catch(() => "")).replace(/\n+/g, " | ");
const dumpText = (n, t) => { writeFileSync(S + "w5-" + tag + n + ".txt", t); return t; };
const row = (title) => page.locator("tbody tr").filter({ hasText: title }).first();
const cellOf = (title, key) => row(title).locator(`[data-matrx-cell-col='${key}']`).first();
async function menuPick(item) {
  const search = page.getByPlaceholder("Search this menu…").last();
  if (await search.count()) { await search.fill(item.replace("…", "")); await page.waitForTimeout(700); }
  await page.getByRole("menuitem", { name: item }).first().click({ timeout: 15000 });
  await page.waitForTimeout(2500);
}
async function rowMenu(title, item, key = "title") {
  await cellOf(title, key).click({ button: "right" });
  await page.waitForTimeout(900);
  await menuPick(item);
}
async function colSettings(label) {
  await page.locator("th").filter({ hasText: new RegExp("^" + label) }).first().click({ button: "right" });
  await page.waitForTimeout(900);
  await menuPick("Column settings…");
  await page.waitForTimeout(3000);
  const dlg = page.getByRole("dialog").filter({ hasText: "Column settings" }).last();
  return (await dlg.innerText().catch(() => "")).replace(/\n+/g, " | ");
}
async function step(name, fn) {
  if (!ONLY.includes(name)) return;
  try { await fn(); say("STEP", name, "done"); } catch (e) { say("STEP", name, "ERR", String(e).slice(0, 300)); await shot(name + "-err"); }
  await page.keyboard.press("Escape").catch(() => {}); await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(700);
}
await gotoTable(page, T.bookings);
await shot("grid");
say("grid", (await bodyText()).match(/Title[^]*?Add row/)?.[0]?.slice(0, 600));

await step("picker", async () => {
  await cellOf("Summer order", "client").click(); await page.waitForTimeout(500); await page.keyboard.press("Enter"); await page.waitForTimeout(3500);
  say("candidates", await page.locator("[data-relation-candidate]").allInnerTexts());
  await page.keyboard.type(process.env.Q ?? "Inc", { delay: 80 }); await page.waitForTimeout(3000);
  say("after search", await page.locator("[data-relation-candidate]").allInnerTexts());
  await shot("picker");
});
await step("settings", async () => {
  for (const col of ["Client", "Party", "Bill to"]) {
    const t = dumpText("settings-" + col.replace(/ /g, ""), await colSettings(col));
    say("settings", col, { choices: t.includes("Choices come from"), binding: t.includes("When a linked record changes"), carries: t.includes("Whoever sees a linked record"), also: t.includes("Also points at") });
    say("settings text", col, t.slice(0, 900));
    await shot("settings-" + col.replace(/ /g, ""));
    await page.keyboard.press("Escape"); await page.waitForTimeout(900);
  }
});
async function pickTable(name) {
  const dlg = page.getByRole("dialog").last();
  await dlg.getByRole("combobox", { name: "Table" }).or(dlg.getByText("Choose a table")).first().click(); await page.waitForTimeout(1200);
  await page.getByPlaceholder("Search tables").last().fill(name); await page.waitForTimeout(1500);
  await page.getByRole("option", { name: new RegExp("^" + name) }).first().click(); await page.waitForTimeout(2500);
}
await step("move", async () => {
  await rowMenu("Summer order", "Move under…");
  await shot("move-dialog");
  const dlg = page.getByRole("dialog").last();
  say("move dialog", (await dlg.innerText()).replace(/\n+/g, " | ").slice(0, 600));
  await pickTable("CL Bookings 9ta");
  await page.locator("[data-records-move-under-search]").fill("Spring"); await page.waitForTimeout(3000);
  await page.locator("[data-records-move-under-option]").first().click(); await page.waitForTimeout(500);
  await page.locator("[data-records-move-under-go]").click(); await page.waitForTimeout(5000);
  say("after move", (await bodyText()).match(/[^|]*(Moved|moved|under)[^|]*/g)?.slice(0, 6));
  await shot("moved");
  await page.keyboard.press("Escape"); await page.waitForTimeout(900);
  await rowMenu("Spring order", "Move under…");
  await pickTable("CL Bookings 9ta");
  await page.locator("[data-records-move-under-search]").fill("Summer"); await page.waitForTimeout(3000);
  await page.locator("[data-records-move-under-option]").first().click(); await page.waitForTimeout(500);
  await page.locator("[data-records-move-under-go]").click(); await page.waitForTimeout(5000);
  say("ring refused", dumpText("move-refused", (await page.getByRole("dialog").last().innerText()).replace(/\n+/g, " | ")).slice(0, 700));
  await shot("move-refused");
});
await step("history", async () => {
  await rowMenu("Spring order", "Row history");
  await page.waitForTimeout(5000);
  const t = dumpText("history", await bodyText());
  const i = t.indexOf("History |");
  say("history", t.slice(i, i + 900));
  await shot("history");
});
await step("backlinks", async () => {
  await gotoTable(page, T.clients);
  await rowMenu("Harbor Bakery", "Open record", "name");
  await page.waitForTimeout(5000);
  const t = dumpText("client-record", await bodyText());
  const i = t.indexOf("Expand |");
  say("client record", t.slice(i, i + 700));
  await shot("client-record");
});
await step("restrict", async () => {
  await gotoTable(page, T.sup);
  say("supplier rows", (await page.locator("tbody").first().innerText()).replace(/\n+/g, " | ").slice(0, 300));
  await rowMenu("Acme Lumber", "Archive record", "name");
  await shot("archive-confirm");
  say("confirm text", (await page.getByRole("alertdialog").or(page.getByRole("dialog")).last().innerText().catch(() => "")).replace(/\n+/g, " | ").slice(0, 500));
  const confirm = page.getByRole("alertdialog").or(page.getByRole("dialog")).last().getByRole("button", { name: /^Archive/ }).last();
  if (await confirm.count()) { await confirm.click(); await page.waitForTimeout(1800); }
  const t = dumpText("restrict", await bodyText());
  say("restrict text", t.match(/[^|]*(still used|refused|cannot|can't|not deleted|not archived)[^|]*/gi)?.slice(0, 6));
  await shot("restrict");
});
await step("tablesettings", async () => {
  await gotoTable(page, T.bookings);
  await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(900);
  await menuPick("Settings");
  await page.waitForTimeout(4000);
  const t = dumpText("tablesettings", (await page.getByRole("dialog").last().innerText().catch(() => "")).replace(/\n+/g, " | "));
  say("table settings", { homes: /lives in/i.test(t), cross: /other organizations/i.test(t) }, t.slice(0, 900));
  await shot("tablesettings");
});
say("console errors", errs.filter((e) => !/matrx-pending|favicon/.test(e)).slice(0, 6));
await browser.close();
