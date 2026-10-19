"use client";

/**
 * The app's side of the Sheets model and io (`@ai-matrx/office/sheets`): the three things the
 * package cannot own, stated once at start-up (imported for effect by `app/Providers`).
 */
import { configureSheetsHost, type SheetsSupabase } from "@ai-matrx/office/sheets";
import { fileHandler } from "@/features/files/handler/handler";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { supabase } from "@/utils/supabase/client";

configureSheetsHost({
  getSupabase: () => supabase as unknown as SheetsSupabase,
  ensureOrgId,
  async uploadOriginalFile(file, { folderPath }) {
    const uploaded = await fileHandler.upload({ kind: "file", file }, { folderPath });
    return { fileId: uploaded.fileId };
  },
  // "Make a copy" copies what people are typing right now, not only the last save.
  async readCurrentSnapshot(workbookId) {
    const { readCurrentWorkbook } = await import("@/lib/collab/current-record");
    return { snapshot: (await readCurrentWorkbook(workbookId)).snapshot };
  },
});
