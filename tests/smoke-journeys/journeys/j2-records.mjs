import { open, faulted, sleep } from "../lib/harness.mjs";
import { openTableById, rowWith, archiveTable } from "../lib/j2-records.mjs";

export default {
  id: "j2-records", title: "Records: create a table row, edit, list, archive (soft-delete), restore from Trash",
  async run({ s, check, note }) {
    const { page } = s;
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const table = `Crew roster ${stamp}`;
    const person = "Dana Whitfield";
    const edited = "Dana Whitfield-Reyes";
    let tableId = null;
    try {
      // Create a disposable table through the New table dialog.
      await open(s, "/data");
      await page.getByRole("button", { name: /new table/i }).first().click({ timeout: 180000 });
      await page.getByPlaceholder("Table name").fill(table);
      await page.getByPlaceholder(/Columns \(optional\)/).fill("name, phone, status");
      await page.getByRole("button", { name: /create table/i }).click();
      await page.waitForURL(/\/data\/[0-9a-f-]{36}/, { timeout: 180000 });
      tableId = page.url().match(/\/data\/([0-9a-f-]{36})/)[1];
      await page.getByRole("button", { name: /^new record$/i }).first().waitFor({ timeout: 180000 });
      check("new table opens with its columns", await page.getByText(/^phone$/i).first().isVisible().catch(() => false), table);

      // Create a record (inline row), then see it after a reload.
      await page.getByRole("button", { name: /^new record$/i }).first().click();
      await sleep(1500);
      await page.keyboard.type(person);
      await page.keyboard.press("Enter");
      await sleep(3000);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page.getByRole("button", { name: /^new record$/i }).first().waitFor({ timeout: 180000 });
      const listed = await rowWith(page, person).waitFor({ timeout: 90000 }).then(() => true).catch(() => false);
      check("created record is listed after reload", listed, person);

      // Edit it.
      const cell = rowWith(page, person).getByText(person, { exact: true }).first();
      await cell.dblclick();
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type(faulted("j2-records") ? "" : edited);
      await page.keyboard.press("Enter");
      await sleep(3000);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page.getByRole("button", { name: /^new record$/i }).first().waitFor({ timeout: 180000 });
      const editedSeen = await rowWith(page, edited).waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
      check("edited value persists after reload", editedSeen, edited);

      // Soft-delete (Archive).
      await rowWith(page, edited).getByText("Delete", { exact: true }).click();
      await page.getByRole("button", { name: /^archive$/i }).last().click({ timeout: 15000 });
      await sleep(3000);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 180000 });
      await page.getByRole("button", { name: /^new record$/i }).first().waitFor({ timeout: 180000 });
      await sleep(2000);
      check("archived record leaves the table", (await rowWith(page, edited).count()) === 0, edited);

      // It sits in Trash with a Restore button.
      await open(s, "/trash");
      const trashRow = page.locator("div, li, tr").filter({ hasText: `${edited} (in ${table})` }).filter({ has: page.getByText("Restore") }).last();
      const inTrash = await trashRow.waitFor({ timeout: 90000 }).then(() => true).catch(() => false);
      check("archived record appears in Trash", inTrash, edited);
      if (inTrash) await trashRow.getByText("Restore", { exact: true }).click();
      await sleep(3000);

      // Back in the table.
      await openTableById(page, s, tableId);
      const back = await rowWith(page, edited).waitFor({ timeout: 90000 }).then(() => true).catch(() => false);
      check("restored record is back in the table", back, edited);
    } finally {
      if (tableId) {
        const gone = await archiveTable(page, s, tableId, table).catch((e) => { note(`cleanup error: ${String(e.message).split("\n")[0]}`); return false; });
        check("disposable table archived", gone, table);
      }
    }
  },
};
