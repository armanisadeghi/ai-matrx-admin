// CD-PAGE-16 walk (F10): a fresh page gets a "Table view" whose source is Built-in > Tasks, and a second one
// over one of the person's own tables; the Tasks rows draw beside the custom table; a filter on Tasks narrows
// the rows; a row opens in the peek. The page is made by the walk and moved to the trash after.
//   S=<shots dir> node features/spaces/__tests__/walk/builtin-tasks.walk.mjs
import { open, newPage, act, slash } from "./lib.mjs";

const shots = process.env.S ?? "/tmp";
let failures = 0;
const check = (name, ok, detail = "") => { if (!ok) failures += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`); };
const { browser, page } = await open({ next: "/spaces", width: 1440, height: 1000 });
const id = await newPage(page);
console.log("PAGE", id);
const insert = async (pickName) => {
  await act(page, async () => {
    await page.locator(".bn-editor .bn-inline-content").last().click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await slash(page, "Table view");
  });
  const dlg = page.getByRole("dialog").last();
  await dlg.waitFor({ timeout: 30_000 });
  await dlg.getByText("Built-in", { exact: true }).waitFor({ timeout: 60_000 });
  await page.waitForTimeout(800);
  if (pickName) await dlg.getByRole("button", { name: new RegExp(`^${pickName}`) }).first().click();
  else {
    // the first of "Your tables"
    const names = await dlg.locator("button").allInnerTexts();
    const yourStart = (await dlg.innerText()).indexOf("Your tables");
    void yourStart; void names;
    await dlg.locator("button:has(svg.lucide-database)").first().click();
  }
  await page.waitForTimeout(4000);
};
await insert("Tasks");
const tasks = page.locator(".spaces-db-frame[data-source=entity]").first();
await tasks.waitFor({ timeout: 120_000 });
await tasks.locator("tbody tr").first().waitFor({ timeout: 120_000 }).catch(() => {});
const before = await tasks.locator("tbody tr").count();
check("Built-in > Tasks draws task rows", before > 0, `${before} rows; ${await tasks.locator(".spaces-entity-count").innerText().catch(() => "")}`);
await insert(null);
const custom = page.locator(".spaces-db-frame:not([data-source=entity])").first();
const customDrew = await custom.waitFor({ timeout: 120_000 }).then(() => true, () => false);
check("a custom table draws beside it on the same page", customDrew && (await page.locator(".spaces-db-frame").count()) >= 2, `${await page.locator(".spaces-db-frame").count()} database blocks`);
await page.screenshot({ path: `${shots}/cd-page-16-1-both.png`, fullPage: true });

// Filter on Tasks.
await tasks.scrollIntoViewIfNeeded();
await tasks.hover();
await tasks.getByRole("button", { name: "Filter", exact: true }).click();
const pop = page.locator("[data-radix-popper-content-wrapper]").last();
await pop.waitFor({ timeout: 10_000 });
console.log("FILTER MENU:", (await pop.innerText()).replace(/\n+/g, " | ").slice(0, 400));
await page.screenshot({ path: `${shots}/cd-page-16-2-filter-menu.png` });
const firstProp = pop.locator("button, [role=menuitem], [role=option]").filter({ hasText: /Status|Priority/ }).first();
if (await firstProp.count()) {
  await firstProp.click();
  await page.waitForTimeout(1200);
  const pop2 = page.locator("[data-radix-popper-content-wrapper]").last();
  console.log("FILTER RULE:", (await pop2.innerText()).replace(/\n+/g, " | ").slice(0, 400));
  const opt = pop2.locator("[role=option], [role=menuitemcheckbox], label, button").filter({ hasText: /^(Done|Completed|Not started|To do|In progress|Todo|High|Low)/i }).first();
  if (await opt.count()) await opt.click();
  await page.waitForTimeout(5000);
  await page.keyboard.press("Escape");
}
await page.waitForTimeout(2000);
const after = await tasks.locator("tbody tr").count();
check("a filter on Tasks narrows the rows", after < before, `${before} -> ${after}`);
await page.screenshot({ path: `${shots}/cd-page-16-3-filtered.png`, fullPage: true });

// Open a row.
const row = tasks.locator("tbody tr").first();
await row.hover();
const openBtn = row.locator(".spaces-entity-open, .spaces-entity-openpill").first();
if (await openBtn.count()) await openBtn.click(); else await row.locator("td").first().click();
const peek = await page.locator(".spaces-entity-peek").first().waitFor({ timeout: 30_000 }).then(() => true, () => false);
check("a task row opens in the peek", peek, peek ? (await page.locator(".spaces-entity-peektitle").first().innerText().catch(() => "")) : "");
await page.screenshot({ path: `${shots}/cd-page-16-4-peek.png`, fullPage: true });
await browser.close();
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
