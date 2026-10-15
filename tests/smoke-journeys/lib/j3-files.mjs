// J3 helpers: find, rename and trash the one file this journey uploaded, through the Files page's own controls.
import { open, sleep } from "./harness.mjs";

export async function openFiles(page, s) {
  await open(s, "/files");
  await page.getByRole("button", { name: /^New$/ }).first().waitFor({ timeout: 180000 });
}

/** The file's row link, narrowed through the page's own "Filter this list" box. */
export async function findFile(page, name, { timeout = 60000 } = {}) {
  const box = page.getByPlaceholder("Filter this list");
  if (await box.isVisible({ timeout: 20000 }).catch(() => false)) {
    await box.fill(name);
    await sleep(1500);
  }
  const link = page.getByText(name).first();
  return (await link.waitFor({ timeout }).then(() => true).catch(() => false)) ? link : null;
}

export async function fileMenu(page, link, item) {
  await link.click({ button: "right" });
  await page.getByText(item, { exact: true }).first().click({ timeout: 15000 });
}

export async function trashFile(page, s, name) {
  await openFiles(page, s);
  const link = await findFile(page, name);
  if (!link) return false;
  await fileMenu(page, link, "Move to Trash");
  const confirm = page.getByRole("button", { name: /^(move to trash|delete|confirm)$/i }).last();
  if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) await confirm.click();
  await sleep(3000);
  await openFiles(page, s);
  return !(await findFile(page, name, { timeout: 8000 }));
}
