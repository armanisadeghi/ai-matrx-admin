import type { ProcessEvent, ProcessResult } from "../types";

/**
 * Live handle to a PTY session opened via `ProcessAdapter.openPty`. The
 * adapter owns the underlying transport (WebSocket or otherwise); the
 * caller drives the session by `write`-ing user keystrokes, calling
 * `resize` on container resize, and `close` to tear down.
 */
export interface PtyHandle {
  /** Send a chunk of user input (UTF-8 string) to the remote shell. */
  write(data: string): void;
  /** Notify the remote PTY that the local viewport changed size. */
  resize(cols: number, rows: number): void;
  /** Send a POSIX signal name (`"SIGINT"`, `"SIGTERM"`, `"SIGHUP"`, …). */
  signal(name: string): void;
  /** Close the session — terminates the remote shell if still running. */
  close(): void;
  /** True until the underlying transport is closed. */
  readonly isOpen: boolean;
}

export interface PtyOpenOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
  shell?: string;
  env?: Record<string, string>;
  /** Called for every output chunk (string already UTF-8 decoded). */
  onData(data: string): void;
  /** Called when the remote shell exits or the transport closes cleanly. */
  onExit?(code: number | null, signal?: string | null): void;
  /** Called on transport errors. */
  onError?(err: Error): void;
  /** Optional ready callback once the daemon confirms the PTY is open. */
  onReady?(): void;
}

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

  /**
   * Open an interactive PTY session. Adapters that don't implement this
   * (e.g. {@link MockProcessAdapter}) fall back to the buffered read-line
   * emulation in `TerminalTab`. When implemented, the terminal attaches
   * xterm directly to the returned handle so `vim`, `top`, color codes,
   * and mid-stream `Ctrl-C` all behave natively.
   */
  openPty?(opts: PtyOpenOptions): Promise<PtyHandle>;
}
