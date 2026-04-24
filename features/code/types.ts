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
  type: "created" | "modified" | "deleted";
  path: string;
}

// ─── Editor files / tabs ─────────────────────────────────────────────────────

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
   * Remote `updated_at` captured at load time for source-backed tabs
   * (prompt apps, agent apps, tool UIs). Used by the optimistic
   * concurrency check inside `useSaveActiveTab`. Undefined for tabs
   * that don't need conflict detection (filesystem, code_files).
   *
   * TODO: Once sources support Realtime subscriptions, this field will
   * be pushed forward live and the conflict path becomes a warning
   * instead of a hard stop.
   */
  remoteUpdatedAt?: string;
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
