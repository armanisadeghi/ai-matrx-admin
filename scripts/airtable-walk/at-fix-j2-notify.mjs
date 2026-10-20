// AT-FIX-J2 item 4c: notifications and digests. Admin: Table menu > Built on it > Notifications; schedule an hourly summary over the view; Preview.
import { open, gotoTable, say } from "./at-fix-j2-lib.mjs";
const { browser, page, who, shot } = await open(process.env.WHO === "member");
say("who", who);
await gotoTable(page, process.env.TABLE); await page.waitForTimeout(3000);
await page.getByRole("button", { name: "Table menu" }).first().click(); await page.waitForTimeout(600);
await page.getByText("Built on it").first().click(); await page.waitForTimeout(800);
say("built-on items", await page.$$eval("[role=menuitem]", (e) => e.map((x) => x.innerText.trim().replace(/\n/g, " | ")).slice(-12)));
await page.getByRole("menuitem", { name: /Notifications/ }).first().click(); await page.waitForTimeout(4000); await shot("nt1");
const panel = async () => (await page.evaluate(() => [...document.querySelectorAll("[role=dialog],aside")].map((e) => e.innerText).join("\n---\n"))).slice(0, 2500);
say("panel", await panel());
if (process.env.STEP === "schedule") {
  await page.getByRole("button", { name: /Schedule a summary/ }).first().click().catch((e) => say("no schedule button", e.message.slice(0, 60)));
  await page.waitForTimeout(2500); await shot("nt2"); say("after click", await panel());
}
if (process.env.STEP === "schedule") {
  say("select els", await page.evaluate(() => [...document.querySelectorAll('[aria-label="What it summarizes"],[aria-label="How often"]')].map((e) => e.tagName + ":" + e.getAttribute("role"))));
  const sel = async (label, pick) => {
    const el = page.locator(`[aria-label="${label}"]`).first();
    if ((await el.evaluate((e) => e.tagName)) === "SELECT") { await el.selectOption(pick); return; }
    await el.click(); await page.waitForTimeout(600);
    say(label + " options", await page.$$eval("[role=option],[role=menuitemradio],li", (e) => e.map((x) => x.innerText.trim()).filter(Boolean).slice(0, 12)));
    await page.locator("li,[role=option],[role=menuitem],[role=menuitemradio],div").filter({ hasText: pick }).last().click();
  };
  await sel("What it summarizes", /What I am looking at now/); await page.waitForTimeout(800);
  await sel("How often", /hour/i); await page.waitForTimeout(800);
  await page.getByText("admin@admin.com").last().click().catch(() => {});
  await shot("nt3-hourly"); say("form", (await panel()).split("Notifications")[1]?.slice(0, 900));
  await page.getByRole("button", { name: /^Schedule it$/ }).first().click(); await page.waitForTimeout(5000); await shot("nt4-saved");
  say("saved", (await panel()).split("Notifications")[1]?.slice(0, 1500));
}
if (process.env.STEP === "now") {
  await page.getByText("Send me a preview now").first().click(); await page.waitForTimeout(6000); await shot("nt5-preview");
  say("preview", (await panel()).split("Notifications")[1]?.slice(0, 1800));
  await page.getByText("Send me one now").first().click(); await page.waitForTimeout(8000); await shot("nt6-sent");
  say("sent", (await panel()).split("Notifications")[1]?.slice(0, 1800));
}
await browser.close();
