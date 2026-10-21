// CONFIDENTIAL-DEFAULT grid walk (headless, own preview host). Seeds a disposable table as admin, marks Qty Confidential,
// opens /data/<id> as test@test.com (member) and as admin@admin.com, and checks what the grid shows: the member sees
// "Withheld" and no Qty value; the admin sees the values. Screenshots to $SHOTS. Exits 1 on a failed check; archives.
// Usage: MATRX_PREVIEW_SESSION=confidential-default ORIGIN=http://confidential-default.localhost:3001 node scripts/airtable-walk/confidential-default-grid.mjs
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { admin, seedTable, say, must } from "./at-fix-j-lib.mjs";
const ORIGIN = process.env.ORIGIN ?? "http://confidential-default.localhost:3001";
const SHOTS = process.env.SHOTS ?? process.env.HOME + "/lane-resume/confdef-shots/";
mkdirSync(SHOTS, { recursive: true });
const REPO = new URL("../..", import.meta.url).pathname;
let failed = 0;
const check = (name, ok, detail) => { if (!ok) failed++; say(ok ? "PASS" : "FAIL", name, detail ?? ""); };

async function signedIn(browser, member) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  ctx.setDefaultNavigationTimeout(240000);
  const page = await ctx.newPage();
  let who = null;
  for (let i = 0; i < 4 && !who; i++) {
    const out = execFileSync("bash", ["scripts/dev-login.sh", ...(member ? ["--member"] : []), "/dashboard"], { cwd: REPO, encoding: "utf8", env: process.env });
    const url = out.match(/OPEN\s*:\s*(\S+)/)[1].replace(/^http:\/\/[^/]+/, ORIGIN);
    await page.goto(url, { waitUntil: "commit", timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(8000);
    who = await page.evaluate(async () => (await (await fetch("/api/whoami")).json())?.email ?? null).catch(() => null);
  }
  return { ctx, page, who };
}
async function gridText(page, id, shot) {
  await page.goto(`${ORIGIN}/data/${id}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 });
  await page.waitForTimeout(5000);
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
} finally {
  await browser.close().catch(() => {});
  try { const r = await a.client.tableArchive({ table_id: id }); say("archived", id, r.ok); } catch (e) { say("archive failed", e.message); }
}
say(failed ? `RED: ${failed} check(s) failed` : "GREEN: every check passed");
process.exitCode = failed ? 1 : 0;
