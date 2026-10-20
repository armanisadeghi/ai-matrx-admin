// AT-FIX-J item 2: the per-field "Who can see and edit" screen as admin, then the grid as test@test.com.
import { open, gotoTable, say } from "./at-walk-h-lib.mjs";
const id = process.env.TABLE;
const dialogText = async (page) => (await page.locator("[role=dialog]").first().innerText()).replace(/\s+/g, " ");
const a = await open(false);
say("admin", a.who);
await gotoTable(a.page, id); await a.page.waitForTimeout(2500);
await a.page.mouse.move(540, 117); await a.page.waitForTimeout(400); await a.page.mouse.click(515, 117);
await a.page.getByText("Who can see and edit…").first().click();
await a.page.waitForSelector("[role=dialog]", { timeout: 60000 }); await a.page.waitForTimeout(3500);
for (const word of ["Confidential", "Restricted"]) {
  await a.page.locator("[role=dialog]").getByText(word, { exact: true }).first().click(); await a.page.waitForTimeout(2500);
  say(word, "->", await dialogText(a.page)); await a.shot("fixj-access-" + word);
}
await a.page.getByRole("button", { name: "Save" }).click(); await a.page.waitForTimeout(5000);
say("after save, dialog open?", await a.page.locator("[role=dialog]").count());
await a.shot("fixj-access-saved");
await a.browser.close();
const m = await open(true);
say("member", m.who);
await gotoTable(m.page, id); await m.page.waitForTimeout(4000);
const text = await m.page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
say("member sees header row:", text.match(/NAME[^]{0,60}/)?.[0]);
say("member has QTY column:", /\bQTY\b/.test(text), "| any 3/9/5 value cells next to names:", /Alpha\s+3|Bravo\s+9/.test(text));
await m.shot("fixj-access-member");
await m.browser.close();
