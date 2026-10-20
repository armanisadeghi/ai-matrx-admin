import { open, gotoTable, say, ORIGIN } from "./at-walk-h-lib.mjs";
const { browser, page, who, shot } = await open(true);
say("who", who);
const joined = async () => { await gotoTable(page, process.env.TABLE); await page.waitForTimeout(5000); return (await page.evaluate(() => document.body.innerText)).match(/Nov \d+, 2026[^\n]*/g)?.slice(0, 2); };
say("before", await joined());
await page.goto(`${ORIGIN}/dashboard`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(6000);
await page.locator('[aria-label*="ettings" i]').first().click().catch(async () => { say("gear aria miss"); await page.mouse.click(22, 912); });
await page.waitForTimeout(2500); await shot("j8-settings");
await page.getByText("Preferences", { exact: true }).first().click(); await page.waitForTimeout(3000); await shot("j8-prefs");
await page.getByText("Language & Region").first().click(); await page.waitForTimeout(2500); await shot("j8-lang");
const setZone = async (zone) => {
  const sw = page.getByRole("switch", { name: /device's time zone/i }).first();
  if ((await sw.getAttribute("aria-checked")) === "true") { await sw.click(); await page.waitForTimeout(800); }
  await page.getByRole("combobox").filter({ hasText: /\// }).first().click().catch(async () => { await page.getByText("Where today starts for you.").locator("xpath=following::button[1]").click(); });
  await page.waitForTimeout(500); await page.keyboard.type(zone.split("/")[1], { delay: 60 }); await page.waitForTimeout(800);
  await page.getByRole("option", { name: new RegExp(zone.split("/")[1], "i") }).first().click(); await page.waitForTimeout(2500);
};
await setZone("Asia/Tokyo"); await shot("j8-tokyo"); await page.waitForTimeout(12000);
say("after set Tokyo", await joined());
await page.goto(`${ORIGIN}/dashboard`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(5000);
await page.locator('[aria-label*="ettings" i]').first().click(); await page.getByText("Preferences", { exact: true }).first().click(); await page.waitForTimeout(2500);
await page.getByText("Language & Region").first().click(); await page.waitForTimeout(2000);
const sw2 = page.getByRole("switch", { name: /device's time zone/i }).first();
if ((await sw2.getAttribute("aria-checked")) !== "true") await sw2.click(); await page.waitForTimeout(2500); await shot("j8-reverted");
say("switch reverted", await sw2.getAttribute("aria-checked"));
say("after revert", await joined());
await browser.close();
