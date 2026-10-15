// AUTOMATIONS-AIRTABLE (2026-10-10): as admin@admin.com, a scratch page's inline database gets Status (Choice: Todo,
// Done); Automations -> "Done → email me" on "Matches conditions" (Status is Done, typed as a person types it) with a
// Send email step to admin@admin.com's own address and {Name} tokens; the Test button runs it once on a page and shows
// its steps; a row's Status set to Done in the grid starts a real run (history says "Matched", "ran", "email"); the
// automation is archived. TRASH=1 trashes the page.
//   SHOT_DIR=<dir> TRASH=1 node features/spaces/__tests__/walk/automations-airtable.walk.mjs [pageId]
import { open, newPage, act, slash, originOf, trashPage } from "./lib.mjs";

const SHOT = process.env.SHOT_DIR ?? "/tmp";
const { browser, page } = await open({ member: false, width: 1440, height: 1000 });
let failed = 0;
const check = (name, ok, extra = {}) => {
  if (!ok) failed++;
  console.log(JSON.stringify({ check: name, ok, ...extra }));
};
let id = process.argv[2];
if (id) await page.goto(`${originOf(page)}/spaces/${id}`, { waitUntil: "domcontentloaded" });
else id = await newPage(page);
console.log(JSON.stringify({ page: id }));
await page.locator(".bn-editor").first().waitFor({ timeout: 90_000 });
await page.waitForTimeout(2500);
const frame = page.locator(".spaces-db-frame").first();
if (!(await frame.count())) {
  await act(page, async () => {
    await page.locator(".bn-editor .bn-inline-content").last().click();
    await slash(page, "Database - Inline");
  });
}
await frame.waitFor({ timeout: 90_000 });
await page.waitForTimeout(6000);
const headerNames = async () => frame.getByRole("button", { name: /^Sort or filter / }).evaluateAll((els) => els.map((e) => (e.getAttribute("aria-label") ?? "").replace(/^Sort or filter /, "")));
const header = (name) => frame.locator("[role=columnheader], th").filter({ has: page.getByRole("button", { name: `Sort or filter ${name}`, exact: true }) }).first();
const dialog = () => page.getByRole("dialog").last();
const addColumn = async (label, kind, choices = []) => {
  if ((await headerNames()).includes(label)) return;
  await act(page, async () => {
    await header("Name").hover();
    await header("Name").getByRole("button", { name: "Sort or filter Name", exact: true }).click();
    await page.getByText("Insert column right…", { exact: true }).first().click();
    await dialog().waitFor({ timeout: 10_000 });
    await dialog().getByRole("textbox", { name: "Field name" }).fill(label);
    await dialog().getByRole("combobox", { name: "What this field holds" }).click();
    await page.getByRole("option", { name: kind, exact: true }).click();
    await page.waitForTimeout(600);
    for (const [i, w] of choices.entries()) {
      await dialog().getByRole("button", { name: "Add a choice" }).click();
      await dialog().getByRole("textbox", { name: `Choice ${i + 1}` }).fill(w);
    }
    await dialog().getByRole("button", { name: "Create column" }).click();
    await page.waitForTimeout(3500);
  });
};
await addColumn("Status", "Choice", ["Todo", "Done"]);
check("Status and Completed columns", (await headerNames()).includes("Status"), { headers: await headerNames() });

// The automation.
const openPanel = async () => {
  await frame.hover();
  await frame.getByRole("button", { name: "Automations", exact: true }).first().click();
  await page.getByTestId("spaces-automations").waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1500);
};
const NAME = "Done → email me";
const ADDRESS = "admin@admin.com";
await act(page, async () => {
  await openPanel();
  const panel = page.getByTestId("spaces-automations");
  if (!(await panel.getByText(NAME).count())) {
    await panel.getByRole("button", { name: "New automation" }).click();
    const ed = page.getByTestId("spaces-automation-editor");
    await ed.getByRole("textbox", { name: "Automation name" }).fill(NAME);
    for (const t of ["Page updated", "Matches conditions", "Button pressed"]) check(`trigger "${t}" is offered`, (await ed.getByRole("button", { name: t, exact: true }).count()) === 1);
    await ed.getByRole("button", { name: "Page updated", exact: true }).click();
    check("page updated shows its property list", await ed.getByTestId("spaces-automation-watch").isVisible());
    await ed.getByRole("button", { name: "Matches conditions", exact: true }).click();
    check("matches conditions shows conditions / views", await ed.getByTestId("spaces-automation-match").isVisible());
    await ed.getByRole("button", { name: "Status", exact: true }).first().click();
    await ed.getByRole("textbox", { name: "Condition value" }).fill("Done");
    await ed.getByRole("button", { name: "Send email" }).click();
    const mail = ed.getByTestId("spaces-automation-action").nth(0);
    await mail.getByRole("button", { name: "An address", exact: true }).click();
    await mail.getByRole("textbox", { name: "Email address" }).fill(ADDRESS);
    await mail.getByRole("textbox", { name: "Email subject" }).fill("{Name} is done");
    await mail.getByRole("textbox", { name: "Email message" }).fill("{Name} moved to {Status}.");
    check("Slack message is offered", (await ed.getByRole("button", { name: "Slack message" }).count()) === 1);
    await ed.getByRole("button", { name: "Agent", exact: true }).click();
    check("an agent step says it runs no AI", /runs no AI/.test(await ed.getByTestId("spaces-automation-agent-cost").innerText()));
    await ed.getByTestId("spaces-automation-action").nth(1).getByRole("button", { name: "Remove action" }).click();
    await page.screenshot({ path: `${SHOT}/airtable-editor.png` });
    await ed.getByRole("button", { name: "Create" }).click();
    await page.waitForTimeout(3000);
    const err = await panel.locator(".text-destructive").allInnerTexts();
    if (err.length) console.log(JSON.stringify({ refused: err }));
  }
  const rows = await page.getByTestId("spaces-automation-row").allInnerTexts();
  check("the automation is listed", rows.some((r) => r.includes(NAME) && /Matches conditions/.test(r)), { rows });
  await page.keyboard.press("Escape");
});

// A row (needed for the test run and the real run).
await act(page, async () => {
  if (!(await frame.locator("tbody tr").filter({ hasText: /\S/ }).count()) || (await frame.getByText("No records yet").count())) {
    await frame.getByRole("button", { name: /^(New record|New page|Add the first row)$/ }).first().click();
    await page.waitForTimeout(4000);
    await page.keyboard.press("Escape");
  }
});

// TEST RUN — once now on a picked page, without waiting for the trigger.
await act(page, async () => {
  await openPanel();
  const row = page.getByTestId("spaces-automation-row").filter({ hasText: NAME }).first();
  await row.getByRole("button", { name: "Test automation" }).click();
  const test = page.getByTestId("spaces-automation-test");
  await test.waitFor({ timeout: 15_000 });
  await page.waitForTimeout(2500);
  const pick = test.getByRole("button").filter({ hasNotText: "Run once now" }).first();
  check("the test lists a page to pick", (await pick.count()) === 1);
  await pick.click();
  await page.waitForTimeout(4000);
  const text = await test.innerText();
  await page.screenshot({ path: `${SHOT}/airtable-test-run.png` });
  check("the test ran and shows the email step", /ran/i.test(text) && /email/i.test(text) && text.includes(ADDRESS), { text: text.slice(0, 300) });
  await page.keyboard.press("Escape");
});

// REAL RUN — Status set to Done in the grid: the row comes to match.
await act(page, async () => {
  const col = (await headerNames()).indexOf("Status");
  const cell = frame.locator("tbody tr").first().locator("td").nth(col);
  await cell.click();
  await page.waitForTimeout(400);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200);
  await page.getByRole("option", { name: "Done" }).first().click().catch(async () => page.getByText("Done", { exact: true }).last().click());
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(6000);
});
await page.reload({ waitUntil: "domcontentloaded" });
await frame.waitFor({ timeout: 90_000 });
await page.waitForTimeout(8000);
await act(page, async () => {
  await openPanel();
  const row = page.getByTestId("spaces-automation-row").filter({ hasText: NAME }).first();
  await row.getByRole("button", { name: "Runs" }).click();
  const runs = page.getByTestId("spaces-automation-runs");
  const seen = await runs.waitFor({ timeout: 15_000 }).then(() => true, () => false);
  const text = seen ? await runs.innerText() : await row.innerText();
  await page.screenshot({ path: `${SHOT}/airtable-runs.png` });
  check("the matched run is listed with its email step", seen && /Matched/.test(text) && /ran/i.test(text) && /email/i.test(text) && /Test/.test(text), { text: text.slice(0, 500) });
  await row.getByRole("button", { name: "Archive automation" }).click();
  await page.waitForTimeout(3000);
  check("archived (no longer listed)", (await page.getByTestId("spaces-automation-row").filter({ hasText: NAME }).count()) === 0);
  await page.keyboard.press("Escape");
});
if (process.env.TRASH) check("scratch page trashed", await act(page, () => trashPage(page)));
await browser.close();
process.exit(failed ? 1 : 0);
