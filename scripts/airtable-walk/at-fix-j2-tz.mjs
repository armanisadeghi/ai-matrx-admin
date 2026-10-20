// AT-FIX-J2 item 2: test@test.com saves Asia/Tokyo; grid cell, record panel, calendar and timeline read Tokyo time; a date-only value never shifts; zone restored.
import { open, gotoTable, say, ORIGIN } from "./at-fix-j2-lib.mjs";
const { browser, page, who, shot } = await open(true);
say("who", who);
const grab = async (label, re) => say(label, (await page.evaluate(() => document.body.innerText)).split("\n").filter((l) => re.test(l)).slice(0, 8));
const setZone = async (zone, off = true) => {
  await page.goto(`${ORIGIN}/dashboard`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(5000);
  await page.locator('[aria-label*="ettings" i]').first().click(); await page.waitForTimeout(2000);
  await page.getByText("Preferences", { exact: true }).first().click(); await page.waitForTimeout(2500);
  await page.getByText("Language & Region").first().click(); await page.waitForTimeout(2000);
  const sw = page.getByRole("switch", { name: /device's time zone/i }).first();
  if (zone) {
    if ((await sw.getAttribute("aria-checked")) === "true") { await sw.click(); await page.waitForTimeout(800); }
    await page.getByRole("combobox").filter({ hasText: /\// }).first().click().catch(async () => { await page.getByText("Where today starts for you.").locator("xpath=following::button[1]").click(); });
    await page.waitForTimeout(500); await page.keyboard.type(zone.split("/")[1], { delay: 60 }); await page.waitForTimeout(800);
    await page.getByRole("option", { name: new RegExp(zone.split("/")[1], "i") }).first().click(); await page.waitForTimeout(3000);
  } else if ((await sw.getAttribute("aria-checked")) !== "true") { await sw.click(); await page.waitForTimeout(3000); }
  say("switch", await sw.getAttribute("aria-checked"));
};
const T = process.env.TABLE;
if (process.env.STEP === "timeline") {
  await gotoTable(page, T); await page.waitForTimeout(5000);
  await page.getByRole("button", { name: /^(Grid|Calendar)/ }).first().click().catch(() => {}); await page.waitForTimeout(800);
  await page.getByRole("menuitem", { name: /Timeline/ }).first().click().catch(async () => { await page.getByText("Timeline", { exact: true }).first().click(); });
  await page.waitForTimeout(6000); await shot("tz4-Timeline");
  await grab("TOKYO Timeline", /Nov|9:30|AM|PM|Bravo|2026|Joined/);
}
await setZone(null); await shot("tz5-restored");
await gotoTable(page, T); await page.waitForTimeout(6000); await grab("RESTORED grid", /Nov \d/);
await browser.close();
