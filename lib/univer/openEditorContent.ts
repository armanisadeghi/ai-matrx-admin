/**
 * THE ONE way to replace the whole content of an open Univer editor
 * (workbook or document) with a snapshot that is already SAVED: a history
 * restore, "Update from Google" / "Use Google's", and a collaborator's
 * replacement all arrive here.
 *
 * Callers save first, then call `showSavedSnapshot`. The open editor for that
 * record (registered below) swaps its content in place, drops its pending
 * autosave (it would write the old content back over the new one), and — in
 * a collab room — tells every peer to reload the same snapshot. A caller
 * never touches Univer units itself: disposing the current unit by hand left
 * Univer's selection observers pointing at nothing (`getUnitId` of null).
 *
 * Pure registry (no Univer import), so it is testable without booting Univer.
 */

export type EditorRecordKind = "workbook" | "document";

/** A snapshot row as stored: its id and the Univer body. */
export type SavedEditorSnapshot = { id: string; snapshot: unknown };

export type EditorContentReplacer = (row: SavedEditorSnapshot) => void | Promise<void>;

const replacers = new Map<string, EditorContentReplacer>();

const keyOf = (kind: EditorRecordKind, recordId: string) => `${kind}:${recordId}`;

/**
 * The open editor of a record lends its replacer while it is mounted. The
 * newest registration wins; the returned release only removes its own.
 */
export function registerOpenEditorContent(
  kind: EditorRecordKind,
  recordId: string,
  replace: EditorContentReplacer,
): () => void {
  const key = keyOf(kind, recordId);
  replacers.set(key, replace);
  return () => {
    if (replacers.get(key) === replace) replacers.delete(key);
  };
}

/**
 * Show a saved snapshot in the record's open editor (and its collab peers).
 * Returns false when no editor of the record is open in this tab — the saved
 * row then simply is the content the next open loads.
 */
export async function showSavedSnapshot(
  kind: EditorRecordKind,
  recordId: string,
  row: SavedEditorSnapshot,
): Promise<boolean> {
  const replace = replacers.get(keyOf(kind, recordId));
  if (!replace) return false;
  await replace(row);
  return true;
}
