// edit Owner note on a row through the grid (a real edit) then read every automation's runs in the panel.
import { open, gotoTable, openAutomations, say } from "./at-walk-h-lib.mjs";
const [, , T, ROW, TEXT, MEMBER] = process.argv;
const tag = MEMBER === "member" ? "member" : "admin";
const { browser, page, who, shot } = await open(MEMBER === "member");
say("who", who);
await gotoTable(page, T);
await page.getByText(ROW, { exact: true }).first().waitFor({ timeout: 120000 });
const h = await page.getByText("OWNER NOTE", { exact: false }).first().boundingBox();
const r = await page.getByText(ROW, { exact: true }).first().boundingBox();
say("boxes", h, r);
await page.mouse.dblclick(h.x + 30, r.y + r.height / 2);
await page.waitForTimeout(800);
await page.keyboard.type(TEXT);
await page.keyboard.press("Enter");
await page.waitForTimeout(3000);
await shot(`g1-edit-${tag}`);
say("ROWTEXT", (await page.getByText(TEXT).count()) + " cells show the text");
await page.waitForTimeout(45000);
await openAutomations(page);
const d = page.getByRole("dialog");
say("PANEL", (await d.innerText()).replace(/\n+/g, " | ").slice(0, 700));
const rows = d.locator("[data-testid=spaces-automation-row]");
const n = await rows.count();
for (let i = 0; i < n; i++) {
  const row = rows.nth(i);
  await row.getByRole("button", { name: "Runs" }).click().catch((e) => say("no Runs btn", e.message.slice(0, 60)));
  await page.waitForTimeout(2500);
  say("ROW", i, (await row.innerText()).replace(/\n+/g, " | ").slice(0, 700));
}
await shot(`g1-panel-${tag}`);
await browser.close();
