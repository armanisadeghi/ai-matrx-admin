/**
 * Public type definitions for the code workspace feature.
 *
 * Everything a consumer of `features/code` needs is re-exported here.
 */

// ─── Filesystem ──────────────────────────────────────────────────────────────

export type FilesystemNodeKind = "file" | "directory";

export interface FilesystemNode {
  /** Absolute POSIX path, e.g. "/home/agent/src/index.ts" */
  path: string;
  /** Display name (basename). */
  name: string;
  kind: FilesystemNodeKind;
  /** Bytes — undefined for directories. */
  size?: number;
  /** ISO date string, if known. */
  modifiedAt?: string;
  /** If the adapter already knows this directory has no children. */
  empty?: boolean;
}

export interface FilesystemWatchEvent {
  type: "created" | "modified" | "deleted" | "moved";
  path: string;
  /** Present for "moved" events — the original path before the rename. */
  fromPath?: string;
}

export interface FilesystemStat {
  path: string;
  kind: FilesystemNodeKind | "symlink";
  size: number;
  /** Unix mode bits (e.g. 0o644). */
  mode?: number;
  /** ISO date string. */
  modifiedAt?: string;
  /** sha1 of contents — when the adapter cheaply provides it. */
  hash?: string;
  /** Symlink target, if `kind === "symlink"`. */
  target?: string;
}

export interface FilesystemSearchHit {
  path: string;
  /** 1-based line number of the match. */
  line: number;
  column?: number;
  /** The matched line contents (trimmed). */
  text: string;
}

// ─── Editor files / tabs ─────────────────────────────────────────────────────

/**
 * Tab kind. Defaults to `"editor"` when absent (legacy tabs are always
 * Monaco-backed).
 *
 *  - `"editor"`            → standard Monaco-backed text editor.
 *  - `"binary-preview"`    → renders through `BinaryFileViewer`. Bytes
 *    are fetched lazily from the active filesystem adapter via
 *    `filesystem.download(path)` — never put into Redux, never shipped
 *    to the agent context bridge.
 *  - `"cloud-file-preview"` → renders the canonical cloud-files
 *    `<FilePreview fileId={cloudFileId}>` (image / video / audio / pdf
 *    / markdown / code / data). Bytes flow through the cloud-files
 *    signed-URL + blob-cache pipeline; nothing goes through the active
 *    code-workspace filesystem adapter. The tab's `path` is a synthetic
 *    `cloud-file:/<name>` display string and the file is identified
 *    by `cloudFileId`.
 *
 * AI patch review is NOT a tab kind — when a normal `"editor"` tab has
 * pending AI patches, `EditorArea` swaps in `<TabDiffView>` (Cursor-style
 * inline diff) automatically. The tab itself stays a normal editor tab.
 */
export type EditorTabKind = "editor" | "binary-preview" | "cloud-file-preview";

/**
 * Tabs that don't have an editable text buffer (no Monaco, no AI patches,
 * no save pipeline, no selection-as-context). Centralising the check
 * keeps every consumer in sync when a new preview kind is added.
 */
export function isPreviewTab(kind?: EditorTabKind): boolean {
  return kind === "binary-preview" || kind === "cloud-file-preview";
}

export interface EditorFile {
  /** Stable id. Typically the absolute path prefixed with adapter id. */
  id: string;
  /** Absolute path on the adapter. */
  path: string;
  /** Basename shown on the tab. */
  name: string;
  /** Monaco language id, e.g. "typescript", "json", "plaintext". */
  language: string;
  /** Current buffer contents in memory. */
  content: string;
  /** Last-loaded content from disk — used to compute the dirty flag. */
  pristineContent: string;
  /** True iff `content !== pristineContent`. Computed by the slice. */
  dirty?: boolean;
  /**
   * What renders this tab. Omit (or set `"editor"`) for the standard
   * Monaco-backed text editor. `"binary-preview"` swaps Monaco for the
   * `BinaryFileViewer` so we don't try to feed image / video / pdf bytes
   * into a code editor.
   */
  kind?: EditorTabKind;
  /**
   * Resolved MIME type for the file. Populated on preview tabs
   * (`"binary-preview"` / `"cloud-file-preview"`) — the previewer
   * primitives use it to pick the right player (image / video / audio
   * / pdf / generic).
   */
  mime?: string;
  /**
   * cld_files UUID. Set only on `"cloud-file-preview"` tabs and is the
   * sole identifier the previewer needs — `path` is just for the tab
   * label / breadcrumbs and never hits a filesystem adapter.
   */
  cloudFileId?: string;
  /**
   * Remote `updated_at` captured at load time for source-backed tabs
   * (prompt apps, agent apps, tool UIs). Used by the optimistic
   * concurrency check inside `useSaveActiveTab`, and refreshed live
   * via `useTabRealtimeWatcher` so the conflict path can degrade to a
   * soft warning when the remote row moves under the user's feet.
   */
  remoteUpdatedAt?: string;
  /**
   * Wall-clock timestamp of the last successful save (ISO string). Set
   * by `markTabSaved`. Used by the editor toolbar to surface a "Saved
   * 12s ago"-style indicator. Undefined until the tab has been saved
   * at least once during this session.
   */
  lastSavedAt?: string;
}

// ─── Process / terminal ──────────────────────────────────────────────────────

export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  /** The cwd the process ended in (adapters that track cwd). */
  cwd?: string;
}

export interface ProcessEvent {
  type: "stdout" | "stderr" | "info" | "exit";
  text: string;
  exitCode?: number;
  cwd?: string;
}

// ─── Activity bar / bottom panel IDs ────────────────────────────────────────

export type ActivityViewId =
  | "explorer"
  | "search"
  | "git"
  | "source-control"
  | "run"
  | "extensions"
  | "sandboxes"
  | "library";

export type BottomTabId =
  | "problems"
  | "output"
  | "debug"
  | "terminal"
  | "ports";
