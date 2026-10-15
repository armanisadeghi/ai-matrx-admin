// lane PERSON-UNDO live walk: Person -> Text -> Undo, -> Email -> Undo, -> Number -> click an amber cell. env TABLE SHOTS
import { start, open, out } from "./lib.mjs";
const TABLE = process.env.TABLE, SHOTS = process.env.SHOTS;
const { browser, page } = await start();
await open(page, TABLE);
const chips = async () => (await page.locator("[data-records-person-chips]").allInnerTexts()).map((t) => t.replace(/\n/g, " ")).join(" | ");
const grid = async () => (await page.locator("[role=row]").allInnerTexts().catch(() => [])).slice(0, 5).join(" | ").replace(/\n/g, " ~ ");
await page.getByText("Mix and master").first().waitFor({ timeout: 180000 });
await page.waitForTimeout(3000);
out("start chips:", await chips());
async function openSettings() {
  await page.getByText("Lead", { exact: true }).first().click({ button: "right" });
  await page.getByText("Column settings…").click();
  await page.waitForTimeout(2000);
}
async function change(label, tag) {
  await openSettings();
  await page.getByLabel("Change what this column holds").click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await page.waitForTimeout(3500);
  out(tag, "preview:", await page.locator("[data-records-retype-preview]").innerText().catch(() => "NO PREVIEW"));
  await page.locator("[data-records-retype-go]").click();
  await page.waitForTimeout(6000);
  out(tag, "done:", await page.locator("[data-records-retype-done]").innerText().catch(() => "NO DONE"));
  await page.screenshot({ path: `${SHOTS}/${tag}-1-after-change.png` });
}
// Text, then Undo from the notice
await change("Text", "text");
await page.keyboard.press("Escape"); await page.waitForTimeout(1000);
out("text grid:", await grid());
const undoBtn = page.getByRole("button", { name: /Undo.*⌘Z/ }).first();
out("undo button visible:", await undoBtn.isVisible().catch(() => false));
await undoBtn.click(); await page.waitForTimeout(6000);
await page.screenshot({ path: `${SHOTS}/text-2-after-undo.png` });
out("after text undo chips:", await chips(), "| kept-aside cells:", await page.locator("[data-records-kept-aside]").count());
// Email, then Undo
await change("Email address", "email");
await page.keyboard.press("Escape"); await page.waitForTimeout(1000);
out("email grid:", await grid());
const undo2 = page.getByRole("button", { name: /Undo.*⌘Z/ }).first();
out("email undo button visible:", await undo2.isVisible().catch(() => false));
await undo2.click(); await page.waitForTimeout(6000);
await page.screenshot({ path: `${SHOTS}/email-2-after-undo.png` });
out("after email undo chips:", await chips(), "| kept-aside cells:", await page.locator("[data-records-kept-aside]").count());
// Number, then an amber cell
await change("Number", "number");
await page.keyboard.press("Escape"); await page.waitForTimeout(1500);
await page.reload({ waitUntil: "domcontentloaded" });
await page.getByText("Mix and master").first().waitFor({ timeout: 180000 });
await page.waitForTimeout(4000);
const amber = page.locator("[data-records-kept-aside]").first();
out("amber cells:", await page.locator("[data-records-kept-aside]").count(), "text:", await amber.innerText().catch(() => "NONE"));
await page.screenshot({ path: `${SHOTS}/number-2-amber.png` });
await amber.click(); await page.waitForTimeout(3000);
await page.screenshot({ path: `${SHOTS}/number-3-peek.png` });
out("peek dialogs:", (await page.locator("[role=dialog]").allInnerTexts()).map((t) => t.replace(/\n/g, " ~ ").slice(0, 200)).join(" || ") || "NONE");
out("uuid on screen:", /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(await page.locator("body").innerText()));
await browser.close();
