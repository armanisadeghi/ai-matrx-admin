// features/unified-data/base/archiveBase.ts — "Archive base" (TEMPLATE-UI-POLISH, 2026-10-20).
//
// A base is a Home's group of tables plus its name row (custom.base). Archiving it puts each of its tables away through the
// one table door (the same one the Data home row menu and the snapshot put-away use: `tableArchive`, in passes), then archives
// the name row. Nothing is deleted: the tables come back from the Archived filter, and the name row comes back with them.
// A stopped run says exactly what is left; a base with no tables left (a leftover name row) archives its name row alone.

import { sayError } from "./sayError";

export interface ArchiveBaseDeps {
  /** Put one table away (all its passes). Answers `ok`, or the store's refusal sentence. */
  archiveTable: (tableId: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  /** Archive the base's name row; absent when the base was never named. */
  archiveIdentity: (() => Promise<void>) | null;
  onProgress?: (done: number, total: number) => void;
}

export type ArchiveBaseResult = { ok: true; tables: number } | { ok: false; sentence: string; left: number };

export async function archiveBase(tables: ReadonlyArray<{ id: string; name: string }>, deps: ArchiveBaseDeps): Promise<ArchiveBaseResult> {
  let done = 0;
  deps.onProgress?.(0, tables.length);
  for (const t of tables) {
    const r = await deps.archiveTable(t.id);
    if (!r.ok) {
      const left = tables.length - done;
      return { ok: false, left, sentence: `“${t.name}” could not be archived (${left} of ${tables.length} tables are still live): ${r.message}` };
    }
    done += 1;
    deps.onProgress?.(done, tables.length);
  }
  if (deps.archiveIdentity) {
    try {
      await deps.archiveIdentity();
    } catch (e) {
      return { ok: false, left: 0, sentence: `The tables are archived, but the base's name was not: ${sayError(e, "Try again.")}` };
    }
  }
  return { ok: true, tables: done };
}
