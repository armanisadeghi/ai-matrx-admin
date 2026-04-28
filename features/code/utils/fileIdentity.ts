/**
 * fileIdentity — stable identification of a file across reloads, tabs,
 * and adapters.
 *
 * `tab.id` works as a session-local cache key but is *not* trustworthy
 * across reloads: it embeds adapter ids that are regenerated each
 * boot (e.g. the active filesystem id), and library tabs are keyed by
 * the row's UUID rather than its on-disk identity. The AI edit history
 * system needs something that survives a reload so we can:
 *
 *   1. Persist a (file_adapter, file_path) tuple into Supabase.
 *   2. Hydrate from Supabase on the next session and find the
 *      currently-open tab (or open it on demand) for the same file.
 *   3. Group history rows by the same logical file even when the user
 *      reopens the workspace through a different adapter (e.g. opens
 *      the same path through "sandbox" today and "mock" tomorrow —
 *      they should *not* match, since the bytes are different).
 *
 * The chosen identity is the tuple:
 *
 *     { adapter, path, libraryFileId? }
 *
 *   - `adapter`   — the family of filesystem behind the tab. Stable
 *                   prefix string ("library", "cloud-file", "sandbox",
 *                   "mock", "cloud-fs", "aga-app", "prompt-app",
 *                   "tool-ui", "source", or any other custom adapter
 *                   id). NEVER an ephemeral instance id.
 *   - `path`      — the logical/display path on that adapter. For
 *                   library / cloud-file / source tabs this is the
 *                   synthetic display path (e.g. `library:/foo.ts`)
 *                   we already store in `tab.path`. For real FS
 *                   adapters it's the canonical absolute path.
 *   - `libraryFileId` — UUID of a row in `code_files`, `cld_files`, or
 *                   the equivalent library source table. Set whenever
 *                   the tab id is a UUID-keyed prefix; gives us a
 *                   second handle for the same file in case the
 *                   logical path changes (rename).
 *
 * The serialization order is **stable**: `tabToFileIdentity` reads from
 * an `EditorFile`, `fileIdentityToTabId` reconstructs the tab id, and
 * `fileIdentityKey` produces a single string suitable for use as a
 * `Record` key (e.g. the `byFile` map in `codeEditHistorySlice`).
 */

import type { EditorFile } from "../types";

/** All adapters we currently round-trip. Open string for forward-compat. */
export type FileAdapter =
  | "library"
  | "cloud-file"
  | "sandbox"
  | "mock"
  | "cloud-fs"
  | "aga-app"
  | "prompt-app"
  | "tool-ui"
  | "source"
  | (string & {});

export interface FileIdentity {
  adapter: FileAdapter;
  path: string;
  /**
   * UUID of the row in the parent table when the adapter is keyed by
   * a database id rather than a path — `library` and `cloud-file` are
   * the canonical examples. `aga-app` / `prompt-app` / `tool-ui` also
   * key by row id; we stash that here for symmetry, prefixed when the
   * adapter uses a composite (rowId:fieldId).
   */
  libraryFileId?: string;
}

const LIBRARY_PREFIX = "library:";
const CLOUD_FILE_PREFIX = "cloud-file:";
const AGA_APP_PREFIX = "aga-app:";
const PROMPT_APP_PREFIX = "prompt-app:";
const TOOL_UI_PREFIX = "tool-ui:";

/**
 * Map an open `EditorFile` to its persistence-grade identity. Returns
 * `null` for tabs that aren't a real file (preview-only tabs without a
 * meaningful path, untitled scratch tabs, etc.) so callers can short-
 * circuit instead of fabricating a row.
 */
export function tabToFileIdentity(tab: EditorFile): FileIdentity | null {
  const id = tab.id;
  const path = tab.path;
  if (!id || !path) return null;

  if (id.startsWith(LIBRARY_PREFIX)) {
    return {
      adapter: "library",
      path,
      libraryFileId: id.slice(LIBRARY_PREFIX.length) || undefined,
    };
  }

  if (id.startsWith(CLOUD_FILE_PREFIX)) {
    return {
      adapter: "cloud-file",
      path,
      libraryFileId: id.slice(CLOUD_FILE_PREFIX.length) || undefined,
    };
  }

  if (id.startsWith(AGA_APP_PREFIX)) {
    return {
      adapter: "aga-app",
      path,
      libraryFileId: id.slice(AGA_APP_PREFIX.length) || undefined,
    };
  }

  if (id.startsWith(PROMPT_APP_PREFIX)) {
    return {
      adapter: "prompt-app",
      path,
      libraryFileId: id.slice(PROMPT_APP_PREFIX.length) || undefined,
    };
  }

  if (id.startsWith(TOOL_UI_PREFIX)) {
    // Tool-ui ids use a `<rowId>:<fieldId>` composite. We keep the full
    // composite as `libraryFileId` so reverse-mapping reconstructs the
    // exact tab id without losing information.
    return {
      adapter: "tool-ui",
      path,
      libraryFileId: id.slice(TOOL_UI_PREFIX.length) || undefined,
    };
  }

  // Generic filesystem adapter: id format is "<adapterId>:<path>".
  const sepIdx = id.indexOf(":");
  if (sepIdx > 0) {
    const adapterId = id.slice(0, sepIdx);
    return {
      adapter: adapterId,
      path,
    };
  }

  // Fallback for any future tab id that doesn't follow the convention.
  // We use the tab id itself as the "adapter" so the identity stays
  // unique within the workspace, even though it won't survive a reload.
  return { adapter: id, path };
}

/**
 * Reverse of `tabToFileIdentity`. Reconstructs the tab id we'd assign
 * to a tab opened for this identity. Used by hydration / triple-view to
 * locate an already-open tab without depending on its in-memory state.
 *
 * Note: we cannot guarantee the produced id matches a tab that's
 * actually open — only that, *if* it were opened, it would carry this
 * id. Callers must still consult `codeTabs.byId` to confirm presence.
 */
export function fileIdentityToTabId(identity: FileIdentity): string {
  const { adapter, path, libraryFileId } = identity;

  if (adapter === "library") {
    return libraryFileId ? `${LIBRARY_PREFIX}${libraryFileId}` : path;
  }
  if (adapter === "cloud-file") {
    return libraryFileId ? `${CLOUD_FILE_PREFIX}${libraryFileId}` : path;
  }
  if (adapter === "aga-app") {
    return libraryFileId ? `${AGA_APP_PREFIX}${libraryFileId}` : path;
  }
  if (adapter === "prompt-app") {
    return libraryFileId ? `${PROMPT_APP_PREFIX}${libraryFileId}` : path;
  }
  if (adapter === "tool-ui") {
    return libraryFileId ? `${TOOL_UI_PREFIX}${libraryFileId}` : path;
  }

  // Generic filesystem: just rejoin with ":".
  return `${adapter}:${path}`;
}

/**
 * Stable single-string key suitable for use as a `Record` key — the
 * canonical "this is the same logical file" comparison. Currently
 * `${adapter}:${path}` (the adapter prefix is mandatory so the same
 * path under two different adapters never collides).
 *
 * IMPORTANT: do NOT include `libraryFileId` in this key. Two history
 * entries against the same library file should always group together
 * even if one was opened via a tab id that lacked the library_file_id
 * fallback; the (adapter, path) tuple is the canonical identity.
 */
export function fileIdentityKey(identity: FileIdentity): string {
  return `${identity.adapter}:${identity.path}`;
}

/**
 * Convenience: compare two identities for equality. Equivalent to
 * comparing their `fileIdentityKey()` strings.
 */
export function fileIdentityEquals(
  a: FileIdentity | null | undefined,
  b: FileIdentity | null | undefined,
): boolean {
  if (!a || !b) return a === b;
  return a.adapter === b.adapter && a.path === b.path;
}
