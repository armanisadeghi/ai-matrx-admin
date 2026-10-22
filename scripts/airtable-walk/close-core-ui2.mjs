// CLOSE-CORE second walk on this lane's preview host, reusing close-core-signin.mjs's kept admin sign-in.
//   CD-CORE-16 grid row menu > Move to another table…: same id, the misfit value To History, the link resolves.
//   CD-CORE-21 /data?home=old draws the one data home; no table menu says "Copy this table again".
//   CD-CORE-24 a Barcode value on the record page: Scan takes a photo and fills the code (real Chrome, its own
//             barcode reader; the photo is a rendered EAN-13 — a phone camera is not available to this lane).
// Disposable tables in admin's Workspace, archived at the end.
// Run: ORIGIN=http://close-core.localhost:3001 BARCODE_PNG=/path/ean13.png node scripts/airtable-walk/close-core-ui2.mjs
import { chromium } from "playwright";
import { declareTable } from "@ai-matrx/records/core";
import { admin as adminStore, say } from "./at-fix-j-lib.mjs";
import { ORIGIN } from "./lib.mjs";
const STATE = process.env.HOME + "/lane-resume/close-core-state/admin.json";
const SHOTS = process.env.HOME + "/lane-resume/close-core-shots/r3-";
const { client } = await adminStore();
const tries = async (fn) => { let r; for (let i = 0; i < 5; i++) { r = await fn(); if (r.ok || !["timed_out", "unreachable"].includes(r.error?.code)) return r; await new Promise((res) => setTimeout(res, 4000)); } return r; };
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + r.error.message); return r.data; };
const tag = Math.random().toString(36).slice(2, 6);
const made = [];
let fails = 0;
const R = {};
const check = (ok, what, detail) => { if (!ok) fails++; R[what] = detail ?? ok; say(ok ? "PASS" : "FAIL", what, detail ?? ""); };
const raw = async (id) => { const r = await client.recordAsOf({ record_id: id, recorded_at: new Date().toISOString() }); return r.ok ? r.data : { error: r.error.message }; };

const suppliersName = `CC suppliers ${tag}`;
const vendors = must(await tries(() => declareTable(client, { name: `CC vendors ${tag}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "phone", label: "Phone", type: "phone", sort: 20 },
  { key: "budget", label: "Budget", type: "number", sort: 30 },
  { key: "sku", label: "SKU", type: "barcode", symbology: "ean13", sort: 40 },
] })), "vendors");
made.push(vendors);
const suppliers = must(await tries(() => declareTable(client, { name: suppliersName, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "phone", label: "Phone", type: "phone", sort: 20 },
] })), "suppliers");
made.push(suppliers);
const orders = must(await tries(() => declareTable(client, { name: `CC orders ${tag}`, fields: [
  { key: "name", label: "Name", type: "text", sort: 10 },
  { key: "vendor", label: "Vendor", type: "relation", relationTarget: vendors, sort: 20 },
] })), "orders");
made.push(orders);
const hollis = must(await tries(() => client.recordWrite({ table_id: vendors, data: { name: "Hollis Garden Supply", phone: "714 555 0190", budget: 4000 } })), "hollis");
const other = must(await tries(() => client.recordWrite({ table_id: vendors, data: { name: "Ridgeway Tools", phone: "714 555 0123", budget: 900 } })), "ridgeway");
const order = must(await tries(() => client.recordWrite({ table_id: orders, data: { name: "Spring mulch", vendor: hollis } })), "order");
say("tables", { vendors, suppliers, orders }, ORIGIN + "/data/" + vendors);

async function browser(opts = {}) {
  const b = await chromium.launch({ headless: true, ...opts });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, storageState: STATE });
  ctx.setDefaultNavigationTimeout(900000);
  const page = await ctx.newPage(); page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(900000);
  return { b, page };
}
async function openGrid(page, id, first) {
  await page.goto(`${ORIGIN}/data/${id}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-table-toolbar]", { timeout: 900000 });
  await page.getByText(first, { exact: true }).first().waitFor({ timeout: 300000 });
  await page.waitForTimeout(2500);
}
async function menuPick(page, name) {
  const direct = page.getByRole("menuitem", { name }).first();
  if (await direct.isVisible().catch(() => false)) return direct;
  for (const s of await page.locator("[role=menuitem][aria-haspopup]:visible").all()) {
    await s.hover().catch(() => {}); await page.waitForTimeout(800);
    if (await direct.isVisible().catch(() => false)) return direct;
  }
  return null;
}

try {
  // ── CD-CORE-16 ───────────────────────────────────────────────────────────
  const a = await browser();
  try {
    await openGrid(a.page, vendors, "Hollis Garden Supply");
    const cell = a.page.locator(`td[data-matrx-cell-row="${hollis}"][data-matrx-cell-col="phone"]`).first();
    await cell.click({ button: "right" }); await a.page.waitForTimeout(1200);
    const item = await menuPick(a.page, /^Move to another table/);
    if (!item) throw new Error("no Move to another table… on the row menu");
    await item.click(); await a.page.waitForTimeout(2000);
    const dlg = a.page.locator("[data-records-move-record]");
    await dlg.waitFor({ timeout: 60000 });
    const picker = dlg.locator("button, input, [role=combobox]").first();
    await picker.click(); await a.page.waitForTimeout(1200);
    const search = a.page.locator("[role=dialog] input:visible, [cmdk-input]:visible").last();
    if (await search.count()) { await search.fill(suppliersName); await a.page.waitForTimeout(1500); }
    const opt = a.page.getByRole("option", { name: new RegExp(suppliersName) }).first();
    if (await opt.count()) await opt.click(); else await a.page.getByText(suppliersName, { exact: false }).last().click();
    await a.page.waitForTimeout(3500);
    R.moveFit = await dlg.locator("[data-records-move-field]").evaluateAll((li) => li.map((l) => `${l.getAttribute("data-records-move-field")}:${l.getAttribute("data-records-move-stays")}`));
    await a.page.screenshot({ path: SHOTS + "16-move-dialog.png" });
    check(R.moveFit.includes("budget:no") && R.moveFit.includes("phone:yes"), "CD-CORE-16 the dialog says Budget goes To History and Phone stays", R.moveFit);
    await dlg.locator("[data-records-move-go]").click(); await a.page.waitForTimeout(6000);
    await a.page.screenshot({ path: SHOTS + "16-after-move.png" });
    const moved = await raw(hollis);
    check(moved.phone === "714 555 0190" && moved.budget === undefined, "CD-CORE-16 the same id now reads in Suppliers with its phone", { phone: moved.phone, budget: moved.budget ?? null, retired: moved._retired?.map((x) => ({ key: x.key, value: x.value, reason: x.reason })) });
    check((moved._retired ?? []).some((x) => x.key === "budget" && String(x.value) === "4000" && x.reason), "CD-CORE-16 Budget 4000 is kept in History with its reason", moved._retired);
    const where = must(await tries(() => client.listByIds({ table_id: suppliers, ids: [hollis] })), "in suppliers");
    check(where.length === 1, "CD-CORE-16 the record is listed in Suppliers under the same id", where.map((r) => r.id));
    const ord = await raw(order);
    check(ord.vendor === hollis, "CD-CORE-16 the order still links to the same id", ord.vendor);
  } catch (e) { fails++; say("MOVE ERROR", e.message.split("\n")[0]); await a.page.screenshot({ path: SHOTS + "16-error.png" }).catch(() => {}); }
  // ── CD-CORE-21 ───────────────────────────────────────────────────────────
  try {
    await a.page.goto(`${ORIGIN}/data?home=old`, { waitUntil: "domcontentloaded" });
    await a.page.waitForTimeout(15000);
    R.homeOld = { url: a.page.url(), oldHub: await a.page.locator("[data-organization-hub], [data-old-data-hub]").count(), text: (await a.page.locator("main").innerText().catch(() => "")).slice(0, 300) };
    await a.page.screenshot({ path: SHOTS + "21-home-old.png" });
    check(R.homeOld.oldHub === 0 && !/organization hub/i.test(R.homeOld.text), "CD-CORE-21 /data?home=old draws the one data home", R.homeOld);
    await openGrid(a.page, orders, "Spring mulch");
    const tm = a.page.getByRole("button", { name: /Table menu|More/ }).first();
    if (await tm.count()) { await tm.click(); await a.page.waitForTimeout(1500); }
    const items = await a.page.locator("[role=menuitem]:visible").allInnerTexts();
    await a.page.screenshot({ path: SHOTS + "21-table-menu.png" });
    const html = await a.page.content();
    check(!/Copy this table again/i.test(html) && !items.some((t) => /Copy this table again/i.test(t)), "CD-CORE-21 no 'Copy this table again' on the table menu", items.map((t) => t.split("\n")[0]).slice(0, 30));
  } catch (e) { fails++; say("HOME ERROR", e.message.split("\n")[0]); }
  await a.b.close();
  // ── CD-CORE-24 (real Chrome: it carries the barcode reader) ──────────────
  const c = await browser({ channel: "chrome" });
  try {
    await c.page.goto(`${ORIGIN}/data/${vendors}/r/${other}`, { waitUntil: "domcontentloaded" });
    await c.page.getByText("Ridgeway Tools").first().waitFor({ timeout: 900000 });
    await c.page.waitForTimeout(4000);
    R.hasDetector = await c.page.evaluate(() => "BarcodeDetector" in globalThis);
    const scan = c.page.getByRole("button", { name: "Scan", exact: true }).first();
    if (!(await scan.count())) {
      // The value may need its editor opened first.
      await c.page.getByText("SKU", { exact: true }).first().click().catch(() => {});
      await c.page.waitForTimeout(1500);
    }
    await c.page.screenshot({ path: SHOTS + "24-record-page.png" });
    check(await scan.count() > 0, "CD-CORE-24 the Barcode value offers Scan where the browser reads barcodes", { hasDetector: R.hasDetector });
    const [chooser] = await Promise.all([c.page.waitForEvent("filechooser", { timeout: 30000 }), scan.click()]);
    await chooser.setFiles(process.env.BARCODE_PNG);
    await c.page.waitForTimeout(3000);
    await c.page.keyboard.press("Tab"); await c.page.waitForTimeout(4000);
    await c.page.screenshot({ path: SHOTS + "24-after-scan.png" });
    const shown = await c.page.locator("input.font-mono").first().inputValue().catch(() => null);
    const saved = (await raw(other)).sku;
    check(shown === "4006381333931", "CD-CORE-24 the photographed code fills the value", shown);
    R.skuSaved = saved ?? null;
  } catch (e) { fails++; say("BARCODE ERROR", e.message.split("\n")[0]); await c.page.screenshot({ path: SHOTS + "24-error.png" }).catch(() => {}); }
  await c.b.close();
} finally {
  for (const id of made) for (let i = 0; i < 8; i++) { const r = await client.tableArchive({ table_id: id, chunk: 5, includeTable: true }); if (r.ok && r.data?.done !== false) { say("archived", id); break; } await new Promise((res) => setTimeout(res, 4000)); }
  say("RESULT", R);
  say(fails ? `${fails} FAILED` : "ALL PASS");
}
