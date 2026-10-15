import { start, open, out } from "./lib.mjs";
const TABLE = process.env.TABLE; const SHOTS = process.env.SHOTS;
const { browser, page, who, errs } = await start();
out("who", who);
await open(page, TABLE);
await page.screenshot({ path: `${SHOTS}/01-grid.png` });
const chips = await page.locator("[data-records-person-open]").count();
out("openable person chips", chips);
if (chips) {
  await page.locator("[data-records-person-open]").first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SHOTS}/02-peek.png` });
  out("peek user:", await page.locator("[data-user-peek]").count(), "url", page.url());
}
out("uuid on screen:", /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(await page.locator("body").innerText()));
out("errs", errs.slice(0, 3));
await browser.close();
