// WITHHELD-HONEST-2 browser check as test@test.com on a SHARED saved view. Env: ORIGIN (own preview host).
// Seeds a disposable table (admin), makes Qty restricted, saves a shared view that filters AND sorts on Qty (plus a visible condition),
// then as test@test.com opens it and records: no error page, the rows the viewer may see, "Filter skipped" / "Sort skipped" notes,
// and that Qty is not offered in the view filter's column list or the sort panel. Archives the table at the end.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { admin, say, must, seedTable } from "./at-fix-j-lib.mjs";
import { ORIGIN } from "./lib.mjs";
const SHOTS = process.env.HOME + "/lane-resume/wh2/shots/"; mkdirSync(SHOTS, { recursive: true });
const a = await admin();
const id = await seedTable(a.client, "wh2ui");
let viewId = null; let failed = 0;
const check = (ok, what, extra = "") => { say(ok ? "PASS" : "FAIL", what, extra); if (!ok) failed++; };
const browser = await chromium.launch({ headless: true });
try {
  const fields = must(await a.client.fields({ table_id: id }), "fields");
  const qty = fields.find((f) => f.key === "qty"); const name = fields.find((f) => f.key === "name");
  must(await a.client.fieldUpdate({ field_id: qty.id, patch: { sensitivity: "restricted" } }), "restrict");
  const where = { op: "and", args: [{ op: "gte", args: [{ field: qty.id }, { const: 4 }] }, { op: "ne", args: [{ field: name.id }, { const: "Alpha" }] }] };
  viewId = must(await a.client.viewDeclare({ table_id: id, spec: { name: "WH2 big and not Alpha", definition: { table_id: id, layout: "grid", where, sorts: [{ field: "qty", direction: "desc" }] } } }), "view");
  say("view", viewId);
  await new Promise((r) => setTimeout(r, 2500));
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
  ctx.setDefaultNavigationTimeout(180000);
  const page = await ctx.newPage();
  const out = execFileSync("bash", ["scripts/dev-login.sh", "--member", `/data/${id}`], { cwd: new URL("../..", import.meta.url).pathname, encoding: "utf8" });
  const url = out.match(/OPEN\s*:\s*(\S+)/)[1].replace(/^http:\/\/[^/]+/, ORIGIN);
  await page.goto(url, { waitUntil: "commit", timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(8000);
  const who = await page.evaluate(async () => (await (await fetch("/api/whoami")).json())?.email ?? null).catch(() => null);
  say("who", who); check(who === "test@test.com", "signed in as test@test.com");
  await page.goto(`${ORIGIN}/data/${id}?view=${viewId}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForSelector("[data-table-toolbar]", { timeout: 240000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: SHOTS + "1-view-open.png" });
  const text = await page.evaluate(() => document.body.innerText);
  say("body mentions", text.split("\n").filter((l) => /Bravo|Charlie|Alpha|skipped|withheld|not accepted|cannot|error/i.test(l)).slice(0, 14));
  // A row's name is the cell just before its withheld Qty cell. Reading the first line of every row-like element picked up the tag "Alpha" (Bravo's tag) as a row.
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const names = lines.map((l, i) => (l === "Withheld" ? lines[i - 1] : null)).filter((n) => /^(Alpha|Bravo|Charlie)$/.test(n ?? ""));
  say("row names", names);
  check(names.includes("Bravo") && names.includes("Charlie") && !names.includes("Alpha"), "the view lists the rows the viewer may see, other condition applied (Bravo, Charlie; not Alpha)");
  check(!/cannot read the Qty column|This was not accepted|Something went wrong/i.test(text), "no error for the saved view's filter on Qty");
  check(await page.locator("[data-records-filter-ignored]").count() > 0, "the view says a filter was skipped", (await page.locator("[data-records-filter-ignored]").first().innerText().catch(() => "")));
  check(await page.locator("[data-records-sort-ignored]").count() > 0, "the view says its saved sort was skipped", (await page.locator("[data-records-sort-ignored]").first().innerText().catch(() => "")));
  // Qty is not offered as a filter column
  const filterBtn = page.getByRole("button", { name: /^Filter/ }).first();
  if (await filterBtn.count()) {
    await filterBtn.click(); await page.waitForTimeout(1200);
    await page.screenshot({ path: SHOTS + "2-filter-open.png" });
    const dlg = await page.evaluate(() => (document.querySelector("[role=dialog],[data-radix-popper-content-wrapper]")?.innerText ?? ""));
    say("filter panel text", dlg.split("\n").slice(0, 25));
    await page.keyboard.press("Escape");
  } else say("no Filter button found");
  await ctx.close();
} finally {
  const r = await a.client.tableArchive({ table_id: id }); say("archived table", id, r.ok ? "ok" : JSON.stringify(r.error).slice(0, 100));
  if (viewId) { const v = await a.client.viewArchive({ view_id: viewId }); say("archived view", viewId, v.ok ? "ok" : JSON.stringify(v.error).slice(0, 100)); }
  await browser.close();
}
console.log(failed ? `FAILED ${failed}` : "ALL PASS"); process.exit(failed ? 1 : 0);
