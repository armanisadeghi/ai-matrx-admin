import { open, say, ORIGIN, gotoTable } from "./at-walk-h-lib.mjs";
const WHO = process.env.WHO === "member" ? "member" : "admin";
const { browser, page, who, shot } = await open(WHO === "member");
say("who", who);
await page.goto(`${ORIGIN}/data/interfaces/${process.env.IFACE}`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForSelector("[data-records-interface]", { timeout: 240000 }).catch(() => say("no interface element"));
await page.waitForFunction(() => document.querySelectorAll("[data-records-page-block=chart] svg").length > 0, null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(6000);
const txt = await page.locator("[data-records-page-block=chart]").first().innerText().catch(() => "(no chart block) " + document?.title);
say("chart text", JSON.stringify(txt.replace(/\s+/g, " ").slice(0, 300)));
say("chart svg tick/labels", await page.$$eval("[data-records-page-block=chart] svg text", (els) => els.map((e) => e.textContent)).catch(() => []));
await shot("j3-iface-" + WHO);
if (WHO === "admin" && process.env.TABLE) {
  await gotoTable(page, process.env.TABLE);
  await page.getByRole("button", { name: /^Layout: Grid/ }).first().click().catch(async () => { await page.getByText(/^Grid$/).first().click(); });
  await page.waitForTimeout(800); await shot("j3-layoutmenu");
  say("layouts", await page.$$eval("[role=option],[role=menuitem],[role=menuitemradio]", (els) => els.map((e) => e.innerText.trim())));
  await page.getByRole("option", { name: /Chart/ }).first().click().catch(() => page.getByText(/^Chart$/).first().click().catch(() => {}));
  await page.waitForTimeout(8000); await shot("j3-chartview");
  say("chart view svg text", await page.$$eval("svg text", (els) => els.map((e) => e.textContent)));
}
await browser.close();
