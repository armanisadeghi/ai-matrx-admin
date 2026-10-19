// f2: Sync into another workspace -> Holdfast Vault. node at-walk-e6-f2.mjs <tableId>
import { start, ORIGIN } from "./lib.mjs";
const S = "/Users/armanisadeghi/lane-resume/atwe6-shots/";
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))));
const { browser, page } = await start(false);
const d = page.locator('[role="dialog"]');
try {
  await page.goto(`${ORIGIN}/data/${process.argv[2]}`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForSelector("[data-sync-into-workspace]", { timeout: 180000 });
  await page.locator("[data-sync-into-workspace]").click(); await page.waitForTimeout(2000);
  await d.locator("button, [role=combobox]").filter({ hasText: "Pick a workspace" }).first().click(); await page.waitForTimeout(1500);
  await page.waitForTimeout(2500); say("PICKER:", (await page.locator("[role=listbox], [role=menu], [cmdk-list]").allInnerTexts()).join("|").replace(/\n+/g," / ").slice(0,900)); await page.keyboard.type("Fairview"); await page.waitForTimeout(1500); say("VAULT search:", (await page.locator("[role=listbox], [role=menu], [cmdk-list]").allInnerTexts()).join("|").replace(/\n+/g," / ").slice(0,300));
  await page.screenshot({ path: S + "f2-b.png" });
  await page.getByText("Fairview People").first().click(); await page.waitForTimeout(1000);
  await d.getByRole("button", { name: "Sync", exact: true }).click();
  for (let i = 0; i < 40; i++) { await page.waitForTimeout(3000); const t = await page.locator("[data-sonner-toast], [role=status]").allInnerTexts(); if (t.length) { say("TOAST:", t.join(" | ")); break; } }
  say("DIALOG after:", (await d.allInnerTexts()).join("").replace(/\n+/g, " | ").slice(0, 400));
  await page.screenshot({ path: S + "f2-c.png" });
} catch (e) { say("FAIL", e.message.split("\n")[0]); await page.screenshot({ path: S + "f2-fail.png" }).catch(() => {}); }
await browser.close(); say("END");
