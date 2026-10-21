// CD-PAGE-17 live walk: a print layout prints three ticked rows as three designed pages, and a View sharee's
// pages leave out the column restricted from them. Disposable table "CDP17 clients" in admin's Workspace
// (test@test.com is a member there and gets a View share on the table), Tax ID marked confidential, one layout
// with a header and a footer. Archived after.
//   ORIGIN=http://<session>.localhost:3001 SHOTS=<dir> node scripts/airtable-walk/cd-page-17-viewer-print.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { declareTable } from "@ai-matrx/records/core";
process.env.WALK_ORG_ID ??= "884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f";
const { store } = await import("./store.mjs");
const { start, ORIGIN } = await import("./lib.mjs");

const say = (...a) => console.log(...a);
const must = (r, w) => { if (!r.ok) throw new Error(w + ": " + JSON.stringify(r.error)); return r.data; };
const SHOTS = process.env.SHOTS ?? "/tmp/cd-page-17";
mkdirSync(SHOTS, { recursive: true });
const MEMBER = "4060701e-706a-4c76-b3ca-0bbc69fa5a14"; // test@test.com
const { sb, organizationId, client } = await store();
const tag = Date.now().toString(36).slice(-5);
const ROWS = [["Juniper Bakery", "TAX-71-0001"], ["Kestrel Plumbing", "TAX-71-0002"], ["Larch Studio", "TAX-71-0003"]];
let table = null, fails = 0;
const check = (label, ok, detail = "") => { if (!ok) fails++; say((ok ? "PASS " : "FAIL ") + label + (detail ? `  (${detail})` : "")); };

async function printAs(member) {
  const who = member ? "viewer" : "admin";
  const { browser, ctx, page, who: signed } = await start(member);
  say(who, "signed in:", signed);
  try {
    await page.goto(`${ORIGIN}/data/${table}`, { waitUntil: "domcontentloaded", timeout: 300000 });
    await page.waitForSelector(`text=${ROWS[2][0]}`, { timeout: 300000 });
    await page.waitForTimeout(3000);
    const grid = await page.locator("main").first().innerText();
    say(who, "grid shows the tax value:", grid.includes("TAX-71-0001"), "| Withheld shown:", /Withheld/.test(grid));
    const boxes = page.locator("button[role=checkbox][data-slot=checkbox]");
    for (let i = 1; i <= 3; i++) await boxes.nth(i).click({ timeout: 10000 });
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: /Print with layout/ }).first().click({ timeout: 20000 });
    await page.waitForSelector("[data-print-layout-dialog]", { timeout: 60000 });
    await page.waitForSelector("[data-print-layout-go]:not([disabled])", { timeout: 60000 });
    await page.screenshot({ path: `${SHOTS}/cd-page-17-${who}-dialog.png` });
    const [popup] = await Promise.all([ctx.waitForEvent("page", { timeout: 60000 }), page.click("[data-print-layout-go]")]);
    await popup.waitForFunction(() => document.body && document.body.innerText.includes("CDP17 header"), null, { timeout: 120000 }).catch(() => {});
    await popup.waitForTimeout(1500);
    const html = await popup.content();
    writeFileSync(`${SHOTS}/cd-page-17-${who}-print.html`, html);
    const text = await popup.locator("body").innerText();
    await popup.screenshot({ path: `${SHOTS}/cd-page-17-${who}-print.png`, fullPage: true }).catch(() => {});
    return { text, html, grid };
  } finally { await browser.close(); }
}

try {
  table = must(await declareTable(client, { name: `CDP17 clients ${tag}`, labelSingular: "Client", labelPlural: "Clients",
    fields: [{ key: "name", label: "Client", type: "text", sort: 10 }, { key: "tax", label: "Tax ID", type: "text", sort: 20 }] }), "table");
  const fields = must(await client.fields({ table_id: table }), "fields");
  const fid = (k) => fields.find((f) => f.key === k).id;
  must(await client.fieldUpdate({ field_id: fid("tax"), patch: { sensitivity: "confidential" } }), "confidential");
  for (const [name, tax] of ROWS) must(await client.recordWrite({ table_id: table, data: { name, tax } }), "row");
  const body = `---\nsize: letter\norientation: portrait\nheader-left: CDP17 header\nfooter-center: CDP17 footer\n---\nClient: {{field:${fid("name")}}}\nTax ID: {{field:${fid("tax")}}}`;
  must(await client.docTemplateSave({ table_id: table, name: "Client slip", body }), "layout");
  const g = await sb.schema("custom").rpc("share_grant", { p_organization_id: organizationId, p_subject_id: table, p_principal_kind: "user", p_principal_id: MEMBER, p_level: "viewer" });
  say("TABLE", table, "| View share to test@test.com:", g.error ? "ERROR " + g.error.message : "ok");

  const admin = await printAs(false);
  const adminPages = (admin.html.match(/CDP17 header/g) ?? []).length;
  check("admin: three ticked rows print three pages", (admin.html.match(/Client: /g) ?? []).length === 3, `${(admin.html.match(/Client: /g) ?? []).length} record pages, header x${adminPages}`);
  check("admin: the layout's header and footer print", admin.html.includes("CDP17 header") && admin.html.includes("CDP17 footer"));
  check("admin: the page size is the layout's", /@page[^}]*(letter|8\.5in|612)/i.test(admin.html), (admin.html.match(/@page[^}]*}/) ?? [""])[0].slice(0, 120));
  check("admin: the tax values print for the admin", ROWS.every(([, t]) => admin.text.includes(t)));

  const viewer = await printAs(true);
  check("viewer: the grid withholds the tax column", !viewer.grid.includes("TAX-71-0001"));
  check("viewer: three pages print", (viewer.html.match(/Client: /g) ?? []).length === 3, `${(viewer.html.match(/Client: /g) ?? []).length}`);
  check("viewer: every client name prints", ROWS.every(([n]) => viewer.text.includes(n)));
  check("viewer: no restricted tax value on any page", ROWS.every(([, t]) => !viewer.html.includes(t)));
} catch (e) {
  fails++; say("WALK ERROR", e.message.split("\n")[0].slice(0, 300));
} finally {
  if (table) { let r; for (let i = 0; i < 10; i++) { r = await client.tableArchive({ table_id: table }); if (!r.ok || r.data?.done !== false) break; } say("cleanup table:", JSON.stringify(r).slice(0, 80)); }
}
say(fails ? `RESULT FAIL (${fails})` : "RESULT PASS");
process.exit(fails ? 1 : 0);
