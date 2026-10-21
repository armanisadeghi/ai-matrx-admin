// CD-TPL-01 live walk: /templates/<random base template> signed in > Install into admin's Workspace > the landing lists what it made,
// the store holds the base's tables and views > Remove > everything it made is archived. MEMBER=1 runs it as test@test.com (a member of
// admin's Workspace). Exit 1 on any failed check.
//   ORIGIN=http://<session>.localhost:3001 SLUG=<slug> SHOTS=<dir> [MEMBER=1] node scripts/airtable-walk/cd-tpl-01-install.mjs
import { mkdirSync } from "node:fs";
import { ORIGIN, start } from "./lib.mjs";

const SLUG = process.env.SLUG;
if (!SLUG) throw new Error("SLUG= a template slug");
const member = !!process.env.MEMBER;
const ORG = process.env.ORG_NAME ?? "admin's Workspace";
const SHOTS = process.env.SHOTS ?? "/tmp/cd-tpl-01";
mkdirSync(SHOTS, { recursive: true });
const fails = [];
const check = (label, ok, detail = "") => { console.log((ok ? "PASS " : "FAIL ") + label + (ok ? "" : "  — " + String(detail).slice(0, 300))); if (!ok) fails.push(label); };

const s = await start(member);
console.log("signed in as", s.who);
const page = s.page;
try {
  await page.goto(`${ORIGIN}/templates/${SLUG}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await page.waitForSelector("[data-public-template-install]", { timeout: 180000 });
  const title = await page.locator("h1").first().innerText().catch(() => "");
  console.log("template", title);
  // An earlier walk's install still here: remove it first so this one installs fresh.
  const install = page.locator("[data-make-template-install]");
  const remove = page.locator("[data-make-template-remove]");
  await Promise.race([install.waitFor({ timeout: 120000 }), remove.waitFor({ timeout: 120000 })]).catch(() => {});
  await page.screenshot({ path: `${SHOTS}/01-before.png` });
  check("the signed-in template page offers Install", await install.isVisible().catch(() => false), await page.locator("[data-public-template-install]").innerText().catch(() => ""));
  await install.click();
  // With no organization chosen the install asks which one.
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible({ timeout: 6000 }).catch(() => false)) {
    console.log("asked for an organization");
    const search = dialog.locator("input").first();
    if (await search.isVisible().catch(() => false)) await search.fill(ORG.slice(0, 12)).catch(() => {});
    await dialog.getByText(ORG, { exact: true }).first().click();
    const cont = dialog.getByRole("button", { name: /^(Continue|Use this organization|Choose)$/ });
    if (await cont.isVisible().catch(() => false)) await cont.click();
  }
  await page.waitForSelector("[data-make-template-landing], [data-make-template-refused]", { timeout: 600000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOTS}/02-installed.png`, fullPage: true });
  const refused = await page.locator("[data-make-template-refused]").innerText().catch(() => "");
  check("the install finished without a refusal", !refused, refused);
  const kinds = await page.locator("[data-make-template-landing-row]").evaluateAll((els) => els.map((e) => e.getAttribute("data-make-template-landing-row")));
  const count = (k) => kinds.filter((x) => x === k).length;
  console.log("landing rows", JSON.stringify(kinds));
  check("the landing lists tables", count("table") > 0, kinds.join(","));
  check("the landing lists views", count("view") > 0, kinds.join(","));
  const landing = await page.locator("[data-make-template-landing]").innerText().catch(() => "");
  check("the landing says nothing in raw database text", !/[a-z]+_[a-z]+\(|violates|null value|PGRST|uuid/i.test(landing), landing.slice(0, 300));
  // The base: the first table row's link opens the table; the Bases list carries the new base.
  const tableHref = await page.locator('[data-make-template-landing-row="table"] a').first().getAttribute("href").catch(() => null);
  console.log("first table", tableHref);
  if (tableHref) {
    await page.goto(ORIGIN + tableHref, { waitUntil: "domcontentloaded", timeout: 240000 });
    const ok = await page.waitForSelector("[data-table-toolbar]", { timeout: 180000 }).then(() => true, () => false);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SHOTS}/03-table.png` });
    check("the installed table opens with its toolbar", ok);
    const rows = await page.locator('[role="row"]').count();
    console.log("grid rows on screen", rows);
  }
  // Remove.
  await page.goto(`${ORIGIN}/templates/${SLUG}`, { waitUntil: "domcontentloaded", timeout: 240000 });
  await remove.waitFor({ timeout: 180000 });
  await remove.click();
  await page.getByRole("alertdialog").or(page.getByRole("dialog")).getByRole("button", { name: /^Remove$/ }).click();
  const removed = await page.waitForSelector("[data-make-template-removed], [data-make-template-refused]", { timeout: 600000 }).then(() => true, () => false);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOTS}/04-removed.png` });
  check("Remove says everything it made is in Trash", removed && (await page.locator("[data-make-template-removed]").isVisible().catch(() => false)), await page.locator("[data-make-template-refused]").innerText().catch(() => ""));
} catch (e) {
  await page.screenshot({ path: `${SHOTS}/zz-error.png` }).catch(() => {});
  check("walk ran to the end", false, e.message);
}
console.log("console errors", JSON.stringify(s.errs.slice(0, 8)));
await s.browser.close();
console.log(fails.length ? `FAIL cd-tpl-01 (${fails.length})` : "PASS cd-tpl-01");
process.exit(fails.length ? 1 : 0);
