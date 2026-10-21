// CLOSE-CORE grid walk (CD-CORE-03 '+' and field settings for admin, absent for a View sharee; CD-CORE-04 header
// right-click Insert column left/right; CD-CORE-09 choice cell search + keyboard + 375 px). Admin's Workspace,
// one disposable table, archived at the end. Run: MATRX_PREVIEW_SESSION=close-core ORIGIN=http://close-core.localhost:3001 node scripts/airtable-walk/close-core-grid.mjs
import { ensureTable } from "@ai-matrx/records/core";
import { mkdirSync } from "node:fs";
import { store } from "./store.mjs";
import { start, ORIGIN } from "./lib.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const SHOTS = process.env.HOME + "/lane-resume/close-core-shots/";
mkdirSync(SHOTS, { recursive: true });
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))));
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const MEMBER = "4060701e-706a-4c76-b3ca-0bbc69fa5a14"; // test@test.com
const { sb, client } = await store();
const tag = Date.now().toString(36).slice(-4);
const table = ok(await ensureTable(client, { name: `CC grid ${tag}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "qty", label: "Qty", type: "number", sort: 20 },
  { key: "status", label: "Status", type: "select", sort: 30, options: ["Waiting", "Done", "Lost", "Booked", "Declined"] },
] }), "table");
for (const [name, qty, status] of [["Alpha", 3, "waiting"], ["Bravo", 9, "done"], ["Charlie", 5, "lost"]]) ok(await client.recordWrite({ table_id: table, data: { name, qty, status } }), "row");
say("table", table);
const headers = (page) => page.locator("th").evaluateAll((ths) => ths.map((t) => (t.innerText || "").trim().split("\n")[0]).filter(Boolean));
async function openTable(page) {
  await page.goto(`${ORIGIN}/data/${table}`, { waitUntil: "domcontentloaded", timeout: 600000 });
  const resume = page.getByRole("button", { name: "Resume this preview" });
  if (await resume.count()) await resume.click();
  await page.waitForSelector("[data-table-toolbar]", { timeout: 600000 });
  await page.getByText("Alpha", { exact: true }).first().waitFor({ timeout: 180000 });
  await page.waitForTimeout(3000);
}
async function headerInsert(page, side) {
  await page.locator("th", { hasText: "Qty" }).first().click({ button: "right" }); await page.waitForTimeout(1200);
  const direct = page.getByRole("menuitem", { name: new RegExp(`Insert column ${side}`) }).first();
  if (!(await direct.count())) { await page.getByRole("menuitem", { name: /^More/ }).first().click(); await page.waitForTimeout(1000); }
  return page.getByRole("menuitem", { name: new RegExp(`Insert column ${side}`) }).first();
}
const menuItems = (page) => page.locator("[role=menuitem]").evaluateAll((ms) => ms.map((m) => `${(m.innerText || "").trim().split("\n")[0]}${m.getAttribute("aria-disabled") === "true" || m.hasAttribute("data-disabled") ? " [disabled]" : ""}`));

let result = {};
try {
  // ── ADMIN ───────────────────────────────────────────────────────────────
  const a = await start(false); const page = a.page; page.setDefaultTimeout(30000);
  try {
    say("admin signed in as", a.who);
    await openTable(page);
    result.adminAddColumn = await page.locator("[data-records-add-column]").count();
    result.adminHeadersBefore = await headers(page);
    await page.screenshot({ path: SHOTS + "03-admin-grid.png" });
    // CD-CORE-04: right-click the Qty header.
    await page.locator("th", { hasText: "Qty" }).first().click({ button: "right" });
    await page.waitForTimeout(1200);
    result.adminHeaderMenu = await menuItems(page);
    await page.screenshot({ path: SHOTS + "04-admin-header-menu.png" });
    await page.keyboard.press("Escape");
    const left = await headerInsert(page, "left");
    result.adminMoreMenu = await menuItems(page);
    await page.screenshot({ path: SHOTS + "04-admin-header-more.png" });
    if (await left.count()) {
      await left.click(); await page.waitForTimeout(2500);
      const dlg = page.locator("[role=dialog]").last();
      await dlg.locator("input").first().fill("Left of qty");
      await page.screenshot({ path: SHOTS + "04-admin-insert-left-dialog.png" });
      const save = dlg.getByRole("button", { name: /^(Add|Add field|Add column|Save|Create)$/ }).first();
      result.insertSaveButton = await save.count() ? await save.innerText() : "none";
      if (await save.count()) await save.click(); else await page.keyboard.press("Enter");
      await page.waitForTimeout(5000);
    }
    const right = await headerInsert(page, "right");
    if (await right.count()) {
      await right.click(); await page.waitForTimeout(2500);
      const dlg = page.locator("[role=dialog]").last();
      await dlg.locator("input").first().fill("Right of qty");
      const save = dlg.getByRole("button", { name: /^(Add|Add field|Add column|Save|Create)$/ }).first();
      if (await save.count()) await save.click(); else await page.keyboard.press("Enter");
      await page.waitForTimeout(5000);
    }
    await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("[data-table-toolbar]", { timeout: 600000 }); await page.getByText("Alpha", { exact: true }).first().waitFor({ timeout: 180000 }); await page.waitForTimeout(3000);
    result.adminHeadersAfterInsertReload = await headers(page);
    await page.screenshot({ path: SHOTS + "04-admin-after-reload.png" });
    // CD-CORE-09: the Status cell of Alpha — open, type to search, arrow + Enter.
    const rowId = (await client.listPage({ table_id: table, limit: 10 })).data?.rows?.find((r) => r.document?.name === "Alpha")?.id;
    const cell = rowId ? page.locator(`td[data-matrx-cell-row="${rowId}"][data-matrx-cell-col="status"]`) : page.locator(`td[data-matrx-cell-col="status"]`).first();
    await cell.click(); await page.keyboard.press("Enter"); await page.waitForTimeout(1500);
    await page.screenshot({ path: SHOTS + "09-admin-choice-open.png" });
    await page.keyboard.type("Boo"); await page.waitForTimeout(800);
    result.choiceOptionsAfterSearch = await page.locator("[role=option]").evaluateAll((os) => os.map((o) => (o.innerText || "").trim()));
    await page.screenshot({ path: SHOTS + "09-admin-choice-search.png" });
    await page.keyboard.press("Enter"); await page.waitForTimeout(3000);
    const after = await client.listByIds({ table_id: table, ids: rowId ? [rowId] : [] });
    result.alphaStatusAfterSearchEnter = after.ok ? after.data[0]?.document?.status : JSON.stringify(after.error);
    // Arrows: open again with no search, ArrowDown twice, Enter.
    await cell.click(); await page.keyboard.press("Enter"); await page.waitForTimeout(1500);
    result.choiceOrder = await page.locator("[role=option]").evaluateAll((os) => os.map((o) => (o.innerText || "").trim()));
    await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await page.waitForTimeout(300);
    result.choiceHighlighted = await page.locator("[role=option][aria-selected=true], [role=option][data-highlighted], [role=option][data-selected=true]").evaluateAll((os) => os.map((o) => (o.innerText || "").trim()));
    await page.screenshot({ path: SHOTS + "09-admin-choice-arrows.png" });
    await page.keyboard.press("Enter"); await page.waitForTimeout(3000);
    const after2 = await client.listByIds({ table_id: table, ids: rowId ? [rowId] : [] });
    result.alphaStatusAfterArrows = after2.ok ? after2.data[0]?.document?.status : JSON.stringify(after2.error);
    // 375 px.
    const phone = await a.browser.newContext({ viewport: { width: 375, height: 812 }, storageState: await a.ctx.storageState(), isMobile: true, hasTouch: true });
    const pp = await phone.newPage(); pp.setDefaultTimeout(60000);
    await openTable(pp);
    const cell375 = rowId ? pp.locator(`td[data-matrx-cell-row="${rowId}"][data-matrx-cell-col="status"]`) : pp.locator(`td[data-matrx-cell-col="status"]`).first();
    await cell375.scrollIntoViewIfNeeded().catch(() => {});
    await pp.screenshot({ path: SHOTS + "09-admin-375-grid.png" });
    await cell375.click(); await pp.keyboard.press("Enter"); await pp.waitForTimeout(2000);
    const page375 = pp;
    result.choice375 = await page375.locator("[role=option]").first().evaluate(() => {
      const opts = [...document.querySelectorAll("[role=option]")];
      return opts.map((o) => { const r = o.getBoundingClientRect(); return { t: (o.innerText || "").trim(), inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight }; });
    }).catch((e) => "no listbox: " + e.message.slice(0, 80));
    result.page375Overflow = await page375.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await page375.screenshot({ path: SHOTS + "09-admin-choice-375.png" });
  } finally { await a.browser.close(); }

  // ── MEMBER AT VIEW ─────────────────────────────────────────────────────
  const g = await sb.schema("custom").rpc("share_grant", { p_organization_id: process.env.WALK_ORG_ID, p_subject_id: table, p_principal_kind: "user", p_principal_id: MEMBER, p_level: "viewer" });
  say("granted viewer", g.error ? "ERR " + g.error.message : "ok");
  const m = await start(true); const mp = m.page; mp.setDefaultTimeout(30000);
  try {
    say("member signed in as", m.who);
    await openTable(mp);
    result.memberAddColumn = await mp.locator("[data-records-add-column]").count();
    await mp.screenshot({ path: SHOTS + "03-member-view-grid.png" });
    await mp.locator("th", { hasText: "Qty" }).first().click({ button: "right" }); await mp.waitForTimeout(1200);
    result.memberHeaderMenu = await menuItems(mp);
    await mp.screenshot({ path: SHOTS + "03-member-view-header-menu.png" });
    await mp.keyboard.press("Escape");
    await mp.getByRole("button", { name: "Table menu" }).first().click(); await mp.waitForTimeout(1000);
    result.memberTableMenu = await menuItems(mp);
    await mp.screenshot({ path: SHOTS + "03-member-view-table-menu.png" });
  } finally { await m.browser.close(); }
} catch (e) {
  say("ERROR", e.message.split("\n")[0]);
} finally {
  say("RESULT", result);
  for (let i = 0; i < 20; i++) { const r = await client.tableArchive({ table_id: table, chunk: 5, includeTable: true }); if (r.ok && r.data?.done !== false) { say("archived ok"); break; } if (!r.ok && !["timed_out", "unreachable"].includes(r.error.code)) { say("archive refused", r.error.message); break; } await new Promise((res) => setTimeout(res, 5000)); }
}
