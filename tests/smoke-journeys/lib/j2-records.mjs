// J2 helpers: the disposable table this journey creates, found and archived through the app's own controls.
import { open, sleep } from "./harness.mjs";

/** Open a table by its URL id (the id comes from where Create table lands). */
export async function openTableById(page, s, id) {
  await open(s, `/data/${id}`);
  await page.getByRole("button", { name: /^new record$/i }).first().waitFor({ timeout: 180000 });
  await sleep(1500);
}

/** Search the Data list and wait until the filter has really been applied (the box can be wiped by hydration). */
export async function searchData(page, s, text) {
  await open(s, "/data");
  const search = page.getByPlaceholder("Search your data");
  await search.waitFor({ timeout: 180000 });
  for (let i = 0; i < 20; i++) {
    await search.fill(text);
    await sleep(1500);
    const applied = (await search.inputValue().catch(() => "")) === text && (await page.getByText("Automation", { exact: true }).count()) === 0;
    if (applied) return true;
    await sleep(1500);
  }
  return false;
}

export const rowWith = (page, text) => page.locator("tr, [role=row]").filter({ hasText: text }).first();

/** Archive (soft-delete) the table this journey made, via the Table menu; true when it is gone from the Data list. */
export async function archiveTable(page, s, id, name) {
  await openTableById(page, s, id);
  await page.getByRole("button", { name: "Table menu" }).first().click();
  await page.getByText("Archive table", { exact: true }).first().click();
  const confirm = page.getByRole("button", { name: /^archive$/i }).last();
  if (await confirm.isVisible({ timeout: 4000 }).catch(() => false)) await confirm.click();
  await sleep(4000);
  const applied = await searchData(page, s, name);
  await sleep(2000);
  return applied && !(await page.getByText(name).first().isVisible().catch(() => false));
}
