import type { ProcessEvent, ProcessResult } from "../types";

/**
 * Adapter interface for running commands in the workspace's active runtime.
 *
 * v1 exposes a single request/response `exec` entry point (matches the
 * existing /api/sandbox/[id]/exec contract). A streaming variant is left for
 * v2 — the UI is already structured around append-on-event semantics so it
 * will slot in without a rewrite.
 */
export interface ProcessAdapter {
  /** Stable identifier — matches the filesystem adapter when paired. */
  readonly id: string;
  /** Whether the adapter can currently execute commands. */
  readonly isReady: boolean;
  /** Last-known cwd; the UI prompt uses this for display. */
  readonly cwd: string;

  exec(
    command: string,
    opts?: {
      cwd?: string;
      timeoutSec?: number;
      env?: Record<string, string>;
      stdin?: string;
    },
  ): Promise<ProcessResult>;

  /**
   * Optional live stream. Backed by the orchestrator's /exec/stream SSE
   * endpoint — incremental stdout/stderr arrive via `onEvent`, and the final
   * `ProcessResult` resolves with the exit code. Cancellation: pass an
   * AbortSignal; aborting closes the SSE which signals the orchestrator to
   * SIGTERM the running command.
   */
  stream?(
    command: string,
    onEvent: (ev: ProcessEvent) => void,
    opts?: {
      cwd?: string;
      env?: Record<string, string>;
      stdin?: string;
      signal?: AbortSignal;
    },
  ): Promise<ProcessResult>;
}
