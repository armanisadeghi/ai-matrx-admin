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
 * Monaco-backed). `"binary-preview"` tabs render through `BinaryFileViewer`
 * — bytes are fetched lazily from the active filesystem adapter, never put
 * into Redux, never shipped to the agent context bridge.
 */
export type EditorTabKind = "editor" | "binary-preview";

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
   * Resolved MIME type for the file. Only populated on `"binary-preview"`
   * tabs today — the binary viewer reads it to pick the right previewer
   * primitive (image / video / audio / pdf / generic).
   */
  mime?: string;
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
