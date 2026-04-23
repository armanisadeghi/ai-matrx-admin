import type { FilesystemNode, FilesystemWatchEvent } from "../types";

/**
 * Adapter interface for all filesystem sources.
 *
 * Implementations:
 *  - MockFilesystemAdapter — static in-memory project for demos/tests.
 *  - SandboxFilesystemAdapter — proxies to /api/sandbox/[id]/exec for a live
 *    Coolify-hosted sandbox container.
 *  - (future) AwsFilesystemAdapter — reads the user's cloud project stored
 *    on AWS.
 *
 * The adapter is the single boundary between the workspace UI and whatever
 * storage/runtime is backing it. Keep it narrow; prefer separate adapter
 * methods over plumbing conditionals through the UI.
 */
export interface FilesystemAdapter {
  /** Stable identifier — prefixed to file ids so they survive adapter swaps. */
  readonly id: string;
  /** Human-readable label shown in breadcrumbs, status bar, sandbox picker. */
  readonly label: string;
  /** POSIX path used as the initial "workspace root" in the explorer. */
  readonly rootPath: string;
  /** Whether the adapter currently supports writes. */
  readonly writable: boolean;

  listChildren(path: string): Promise<FilesystemNode[]>;
  readFile(path: string): Promise<string>;
  writeFile?(path: string, content: string): Promise<void>;
  /**
   * Optional subscription. Adapters without a live backend can omit this; the
   * workspace will fall back to explicit refresh actions.
   */
  watch?(path: string, cb: (ev: FilesystemWatchEvent) => void): () => void;
}
