import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { open, faulted, sleep } from "../lib/harness.mjs";
import { openFiles, findFile, fileMenu, trashFile } from "../lib/j3-files.mjs";

export default {
  id: "j3-files", title: "Files: upload, list, open, download, rename, delete, restore from Trash",
  async run({ s, check, note }) {
    const { page } = s;
    const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    const original = `Dispatch-board-notes-${stamp}.txt`;
    const renamed = `Dispatch-board-notes-final-${stamp}.txt`;
    const body = `Truck 2 picks up Tuesday and Thursday at 7am; gate code stays with dispatch. Run ${stamp}.\n`;
    const dir = mkdtempSync(`${tmpdir()}/safety-net-j3-`);
    const path = `${dir}/${original}`;
    writeFileSync(path, body);
    let name = null; // the file's current name once it exists
    try {
      await openFiles(page, s);
      await page.locator("input[type=file]:not([webkitdirectory])").first().setInputFiles(path);
      name = original;
      const listed = await findFile(page, name, { timeout: 120000 });
      check("uploaded file is listed", !!listed, name);
      if (!listed) return;

      // Reload: it is really stored, not just in memory.
      await openFiles(page, s);
      const again = await findFile(page, name);
      check("file is still listed after reload", !!again, name);

      // Download: bytes match what we uploaded.
      const dl = page.waitForEvent("download", { timeout: 60000 }).catch(() => null);
      await fileMenu(page, again, "Download");
      const download = await dl;
      let got = "";
      if (download) { const p = await download.path().catch(() => null); got = p ? readFileSync(p, "utf8") : ""; }
      check("download returns the uploaded bytes", got === body, got.slice(0, 60) || "no download");

      // Open: the preview shows the file's text.
      await openFiles(page, s);
      const link = await findFile(page, name);
      await link.click();
      const seen = await page.getByText("Truck 2 picks up Tuesday").first().waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
      check("opening the file shows its contents", seen, "Truck 2 picks up Tuesday");
      await page.keyboard.press("Escape");

      // Rename.
      await openFiles(page, s);
      const row = await findFile(page, name);
      let renameError = "";
      const onResp = async (r) => {
        if (/\/files\/[0-9a-f-]{36}\/rename/.test(r.url()) && r.status() >= 400) renameError = `HTTP ${r.status()} ${(await r.text().catch(() => "")).slice(0, 160)}`;
      };
      page.on("response", onResp);
      await fileMenu(page, row, "Rename");
      await sleep(800);
      await page.keyboard.press("ControlOrMeta+a");
      await page.keyboard.type((faulted("j3-files") ? original : renamed).replace(/\.txt$/, "")); // the dialog shows ".txt" separately
      await page.keyboard.press("Enter");
      await sleep(3000);
      page.off("response", onResp);
      await openFiles(page, s);
      const ren = await findFile(page, renamed);
      check("renamed file is listed under its new name", !!ren, renameError || renamed);
      if (ren) name = renamed;

      // Delete (Move to Trash), then restore from Trash.
      const gone = await trashFile(page, s, name);
      check("trashed file leaves the list", gone, name);
      await open(s, "/trash");
      const trashRow = page.locator("div, li, tr").filter({ hasText: name }).filter({ has: page.getByText("Restore") }).last();
      const inTrash = await trashRow.waitFor({ timeout: 90000 }).then(() => true).catch(() => false);
      check("trashed file appears in Trash", inTrash, name);
      if (inTrash) await trashRow.getByText("Restore", { exact: true }).click();
      await sleep(3000);
      await openFiles(page, s);
      const back = await findFile(page, name, { timeout: 90000 });
      check("restored file is back in the list", !!back, name);
    } finally {
      if (name) {
        const cleaned = await trashFile(page, s, name).catch((e) => { note(`cleanup error: ${String(e.message).split("\n")[0]}`); return false; });
        check("disposable file moved to Trash", cleaned, name);
      }
    }
  },
};
