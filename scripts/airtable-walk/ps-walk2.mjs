import { start, open, out } from "./lib.mjs";
const TABLE = process.env.TABLE; const SHOTS = process.env.SHOTS;
const { browser, page } = await start();
await open(page, TABLE);
await page.getByText("Mix and master").first().waitFor({ timeout: 180000 });
await page.waitForTimeout(2000);
// unmatched person opens a peek too
await page.getByText("Priya Raman").first().click();
await page.waitForTimeout(3500);
await page.screenshot({ path: `${SHOTS}/03-peek-unmatched.png` });
await page.keyboard.press("Escape");
await page.waitForTimeout(500);
// column menu
await page.getByText("Lead", { exact: true }).first().click({ button: "right" });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${SHOTS}/04-header-menu.png` });
out(await page.locator("[role=menu]").innerText().catch(() => "no role=menu"));
await browser.close();
