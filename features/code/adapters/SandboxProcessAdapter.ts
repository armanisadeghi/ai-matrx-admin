import type { ProcessAdapter } from "./ProcessAdapter";
import type { ProcessResult } from "../types";

/** Matches the response shape of /api/sandbox/[id]/exec */
interface RawExecResponse {
  stdout: string;
  stderr: string;
  exit_code: number;
  cwd?: string;
}

/**
 * Sandbox ProcessAdapter.
 *
 * The orchestrator (Python/FastAPI service behind /api/sandbox/[id]/exec)
 * already maintains per-sandbox session state including the current working
 * directory — `cd foo && pwd` persists across calls and the response carries
 * the updated `cwd`. We mirror that value locally so the UI can render a
 * prompt, but we DO NOT wrap commands or force the cwd: doing so stomps on
 * the server's session state and breaks `cd`.
 */
export class SandboxProcessAdapter implements ProcessAdapter {
  readonly id: string;
  isReady = true;
  cwd: string;

  constructor(
    public readonly instanceId: string,
    initialCwd = "/home/agent",
  ) {
    this.id = `sandbox:${instanceId}`;
    this.cwd = initialCwd;
  }

  async exec(
    command: string,
    opts?: { cwd?: string; timeoutSec?: number },
  ): Promise<ProcessResult> {
    const body: Record<string, unknown> = {
      command,
      timeout: opts?.timeoutSec ?? 60,
    };
    // Only forward an explicit cwd override to the orchestrator when the
    // caller asked for one. Otherwise let the orchestrator use whatever
    // working directory its session is already in — that way `cd` persists
    // naturally between exec calls.
    if (opts?.cwd) body.cwd = opts.cwd;

    const resp = await fetch(`/api/sandbox/${this.instanceId}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => resp.statusText);
      throw new Error(`exec failed (${resp.status}): ${errBody}`);
    }
    const data: RawExecResponse = await resp.json();
    if (data.cwd) this.cwd = data.cwd;

    return {
      stdout: data.stdout ?? "",
      stderr: data.stderr ?? "",
      exitCode: data.exit_code ?? 0,
      cwd: this.cwd,
    };
  }
}

/**
 * Simple mock: pretends commands ran and echoes them. Good enough for the
 * default route when there's no active sandbox.
 */
export class MockProcessAdapter implements ProcessAdapter {
  readonly id = "mock";
  isReady = true;
  cwd = "/workspace";

  async exec(command: string): Promise<ProcessResult> {
    const trimmed = command.trim();
    // Minimal `cd` support so the mock feels less broken when users poke
    // at it without a real sandbox.
    const cdMatch = trimmed.match(/^cd\s+(\S+)$/);
    if (cdMatch) {
      const target = cdMatch[1];
      if (target === "~" || target === "") {
        this.cwd = "/workspace";
      } else if (target.startsWith("/")) {
        this.cwd = target;
      } else if (target === "..") {
        this.cwd = this.cwd.replace(/\/[^/]+$/, "") || "/";
      } else {
        this.cwd = `${this.cwd.replace(/\/$/, "")}/${target}`;
      }
      return { stdout: "", stderr: "", exitCode: 0, cwd: this.cwd };
    }

    return {
      stdout: `(mock) $ ${command}\n(no sandbox connected — select one from the Sandboxes view)\n`,
      stderr: "",
      exitCode: 0,
      cwd: this.cwd,
    };
  }
}
