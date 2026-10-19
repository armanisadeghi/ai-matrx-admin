// AT-FIX-G1 item 6: test@test.com (a real member of admin's Workspace) ticks two rows and "Set a column on 2 rows" writes.
// Seeds one disposable table + 3 rows as admin, drives the grid as the member, reads the store back, archives the table.
import { ensureTable } from "@ai-matrx/records/core";
import { store } from "./store.mjs";
import { start, ORIGIN } from "./lib.mjs";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { sb, client } = await store();
const MEMBER = "4060701e-706a-4c76-b3ca-0bbc69fa5a14"; // test@test.com
const ok = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const tag = Date.now().toString(36).slice(-4);
const table = ok(await ensureTable(client, { name: `ATFG1 batch ${tag}`, fields: [{ key: "name", label: "Name", type: "text", sort: 10 }, { key: "note", label: "Note", type: "text", sort: 20 }] }), "table");
const ids = [];
async function archive() { for (let i = 0; i < 20; i++) { const a = await client.tableArchive({ table_id: table, chunk: 2, includeTable: true }); if (a.ok && a.data.done) { console.log("table archived"); break; } } }
try { for (const n of ["Alpha", "Bravo", "Charlie"]) ids.push(ok(await client.recordWrite({ table_id: table, data: { name: n } }), "row")); } catch (e) { console.log("seed ERROR", e.message); }
const g = await sb.schema("custom").rpc("share_grant", { p_organization_id: process.env.WALK_ORG_ID, p_subject_id: table, p_principal_kind: "user", p_principal_id: MEMBER, p_level: process.env.LEVEL ?? "editor" });
console.log("table", table, "granted", process.env.LEVEL ?? "editor", g.error ? "ERR " + g.error.message : "ok");
if (ids.length < 3) { await archive(); process.exit(1); }
const s = await start(true); const page = s.page; page.setDefaultTimeout(15000);
let code = 1;
try {
  console.log("signed in as", s.who);
  await page.goto(`${ORIGIN}/data/${table}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 }); await page.waitForTimeout(3000);
  console.log("labels:", (await page.locator("[aria-label]").evaluateAll((e) => e.map((x) => x.getAttribute("aria-label")).filter((l) => /select|row|check|tick/i.test(l)).slice(0, 12))).join(" | "));
  const boxes = page.getByRole("checkbox", { name: /select row|select .*row|tick/i }).or(page.locator("tbody input[type=checkbox], [role=row] input[type=checkbox], [role=row] [role=checkbox]"));
  console.log("checkboxes", await boxes.count());
  await boxes.nth(1).click(); await boxes.nth(2).click(); await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /^Set a column/ }).first().click(); await page.waitForTimeout(1200);
  const dlg = page.locator("[role=dialog]").filter({ hasText: "Set a column on" });
  console.log("dialog:", (await dlg.innerText()).replace(/\s+/g, " ").slice(0, 160));
  const sel = dlg.locator("select").first();
  if (await sel.count()) await sel.selectOption({ label: "Note" }); else { await dlg.getByRole("combobox").first().click(); await page.getByRole("option", { name: "Note" }).click(); }
  await dlg.locator("input, textarea").last().fill("ATFG1-bulk");
  const buttons = await dlg.getByRole("button").evaluateAll((b) => b.map((x) => x.innerText.trim() + (x.disabled ? " [disabled]" : "")));
  console.log("dialog buttons:", buttons.join(" | "));
  await dlg.getByRole("button", { name: /^Set on 2 rows|^Set / }).last().click(); await page.waitForTimeout(5000);
  await page.screenshot({ path: "/tmp/atfg1-batch.png" });
  const after = ok(await client.listPage({ table_id: table, limit: 50 }), "list");
  const got = after.rows.map((r) => `${r.document.name}=${r.document.note ?? ""}`);
  console.log("store rows:", got.join(" | "));
  code = got.filter((g) => g.endsWith("=ATFG1-bulk")).length === 2 ? 0 : 1;
} catch (e) { console.log("ERROR", e.message.split("\n")[0]); await page.screenshot({ path: "/tmp/atfg1-batch-err.png" }).catch(() => {}); }
await s.browser.close();
await archive();
console.log(code === 0 ? "PASS" : "FAIL");
process.exit(code);
