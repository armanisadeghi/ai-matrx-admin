import { start, out, ORIGIN } from "./lib.mjs";
const { browser, page } = await start(false);
await page.goto(`${ORIGIN}/files/all`, { waitUntil: "domcontentloaded", timeout: 240000 });
await page.waitForTimeout(6000);
const hit = page.getByText("brochure.png").first();
out("found", await hit.count());
await page.screenshot({ path: "/tmp/airtable-walk/f1.png" });
if (await hit.count()) {
  await hit.click({ button: "right" }); await page.waitForTimeout(600);
  const items = await page.$$eval("[role=menuitem]", (b) => b.map((x) => x.textContent.trim()));
  out(JSON.stringify(items));
  await page.getByRole("menuitem", { name: /Move to Trash/ }).click(); await page.waitForTimeout(1500);
  const confirm = page.getByRole("button", { name: /trash|archive|confirm|delete/i }).last();
  out("dialogs", await page.getByRole("dialog").count(), await page.getByRole("alertdialog").count());
  out("alert:", (await page.getByRole("alertdialog").innerText()).replace(/\n/g," | "));
  await page.getByRole("alertdialog").getByRole("button").last().click(); await page.waitForTimeout(2500);
  await page.waitForTimeout(1500); await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForTimeout(6000);
  out("still listed after reload", await page.getByText("brochure.png").count());
}
await browser.close();
