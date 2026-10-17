import { chromium } from "playwright";
import { walkSignIn } from "./walk-signin.mjs";
const ORIGIN = "http://s96c6068c.localhost:3001"; const [,, D, ...ids] = process.argv;
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } }); ctx.setDefaultNavigationTimeout(240000);
const page = await ctx.newPage();
await walkSignIn(page, ORIGIN);
for (const id of ids) {
  await page.goto(ORIGIN + "/spaces/" + id, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(10000);
  await page.getByLabel("Page options", { exact: true }).first().click(); await page.waitForTimeout(1500);
  await page.screenshot({ path: `${D}/trash-menu-${id.slice(0,4)}.png` });
  const item = page.getByText(/Move to Trash|Delete/).first();
  console.log(id, await item.textContent().catch(() => "none"));
  await item.click(); await page.waitForTimeout(3000);
  const confirm = page.getByRole("button", { name: /Move to Trash|Delete|Confirm/ }).last();
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await page.waitForTimeout(4000);
  console.log("after", page.url());
}
await b.close();
