// CONFIDENTIAL-DEFAULT grid walk (headless, own preview host). Seeds a disposable table as admin, marks Qty Confidential,
// opens /data/<id> as test@test.com (member) and as admin@admin.com, and checks what the grid shows: the member sees
// "Withheld" and no Qty value; the admin sees the values. Screenshots to $SHOTS. Exits 1 on a failed check; archives.
// Usage: MATRX_PREVIEW_SESSION=confidential-default ORIGIN=http://confidential-default.localhost:3001 node scripts/airtable-walk/confidential-default-grid.mjs
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { admin, seedTable, say, must, ORG as LIB_ORG } from "./at-fix-j-lib.mjs";
import { open as openBrowser } from "./at-fix-j2-lib.mjs";
const ORIGIN = process.env.ORIGIN ?? "http://confidential-default.localhost:3001";
const SHOTS = process.env.SHOTS ?? process.env.HOME + "/lane-resume/confdef-shots/";
mkdirSync(SHOTS, { recursive: true });
const REPO = new URL("../..", import.meta.url).pathname;
let failed = 0;
const check = (name, ok, detail) => { if (!ok) failed++; say(ok ? "PASS" : "FAIL", name, detail ?? ""); };

// Sign-in goes through the walk library's cached, retried sign-in (a bare dev-login nonce for the member stopped landing
// on a busy preview, 2026-10-21); one headless browser per person.
async function signedIn(_browser, member) {
  const b = await openBrowser(member);
  opened.push(b.browser);
  return { ctx: b.ctx, page: b.page, who: b.who };
}
const opened = [];
async function gridText(page, id, shot) {
  await page.goto(`${ORIGIN}/data/${id}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 });
  // the grid draws skeleton rows first; wait for the seeded rows themselves (a cold preview can take a while)
  await page.getByText("Charlie", { exact: true }).first().waitFor({ timeout: 180000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: SHOTS + shot + ".png" }).catch(() => {});
  return page.evaluate(() => document.body.innerText);
}

const a = await admin();
const id = await seedTable(a.client, "conf-grid");
say("table", id);
const browser = await chromium.launch({ headless: true });
try {
  const qty = must(await a.client.fields({ table_id: id }), "fields").find((f) => f.key === "qty");
  must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: "confidential" } }), "set confidential");
  const m = await signedIn(browser, true);
  say("member signed in as", m.who);
  check("member signed in as test@test.com", m.who === "test@test.com", m.who);
  const mt = await gridText(m.page, id, "member-grid");
  const mRows = mt.split("\n").filter((l) => /Alpha|Bravo|Charlie|Withheld|Qty/i.test(l));
  say("member grid lines", mRows.slice(0, 20));
  check("member grid shows Withheld", /Withheld/i.test(mt), "");
  check("member grid shows the rows", /Bravo/.test(mt) && /Charlie/.test(mt), "");
  const ad = await signedIn(browser, false);
  check("admin signed in as admin@admin.com", ad.who === "admin@admin.com", ad.who);
  const at = await gridText(ad.page, id, "admin-grid");
  const aRows = at.split("\n").filter((l) => /Alpha|Bravo|Charlie|Withheld|Qty|^\s*[359]\s*$/i.test(l));
  say("admin grid lines", aRows.slice(0, 20));
  check("admin grid has no Withheld", !/Withheld/i.test(at), "");
  check("admin grid shows Qty values", /(^|\n)\s*9\s*(\n|$)/.test(at) && /(^|\n)\s*5\s*(\n|$)/.test(at), "");
  // CLOSE-SHARE (CD-SHARE-04): a share of the Qty column with the member at View opens it to them in the grid.
  const ORG = LIB_ORG;
  const MEMBER = "4060701e-706a-4c76-b3ca-0bbc69fa5a14"; // test@test.com
  const g = await a.sb.schema("custom").rpc("share_grant", { p_organization_id: ORG, p_subject_id: qty.id, p_principal_kind: "person", p_principal_id: MEMBER, p_level: "viewer" });
  check("admin shares the Qty column with the member at View", !g.error, g.error?.message);
  await new Promise((r) => setTimeout(r, 2000));
  const mt2 = await gridText(m.page, id, "member-grid-after-column-share");
  say("member grid lines after the column share", mt2.split("\n").filter((l) => /Alpha|Bravo|Charlie|Withheld|Qty|^\s*[359]\s*$/i.test(l)).slice(0, 20));
  check("member grid after the column share has no Withheld", !/Withheld/i.test(mt2), "");
  check("member grid after the column share shows Qty values", /(^|\n)\s*9\s*(\n|$)/.test(mt2) && /(^|\n)\s*5\s*(\n|$)/.test(mt2), "");
} finally {
  await browser.close().catch(() => {});
  for (const b of opened) await b.close().catch(() => {});
  try { const r = await a.client.tableArchive({ table_id: id }); say("archived", id, r.ok); } catch (e) { say("archive failed", e.message); }
}
say(failed ? `RED: ${failed} check(s) failed` : "GREEN: every check passed");
process.exitCode = failed ? 1 : 0;
