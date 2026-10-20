import { open, gotoTable, openAutomations, say } from "./at-walk-h-lib.mjs";
const [, , T, MEMBER] = process.argv;
const tag = MEMBER === "member" ? "member" : "admin";
const { browser, page, who, shot } = await open(MEMBER === "member");
say("who", who);
await gotoTable(page, T);
await openAutomations(page);
const d = page.getByRole("dialog");
for (const name of ["ATWH gmail", "ATWH calendar", "ATWH one-off schedule"]) {
  const row = d.locator("[data-testid=spaces-automation-row]").filter({ hasText: name });
  say(name, "BEFORE", (await row.innerText().catch(() => "MISSING")).replace(/\n+/g, " | ").slice(0, 600));
  const chk = row.getByRole("button", { name: /Check now/ });
  if (await chk.count()) { await chk.click(); await page.waitForTimeout(12000); say(name, "AFTER CHECK", (await row.innerText()).replace(/\n+/g, " | ").slice(0, 700)); }
  await row.getByRole("button", { name: "Runs" }).click().catch(() => {});
  await page.waitForTimeout(2500);
  say(name, "RUNS", (await row.innerText().catch(() => "")).replace(/\n+/g, " | ").slice(0, 500));
}
await shot(`app-${tag}`);
await browser.close();
