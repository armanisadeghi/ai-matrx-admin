import type { ProcessAdapter } from "./ProcessAdapter";
import type { ProcessResult } from "../types";

/** Matches the response shape of /api/sandbox/[id]/exec */
interface RawExecResponse {
  stdout: string;
  stderr: string;
  exit_code: number;
  cwd?: string;
}

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
    const resp = await fetch(`/api/sandbox/${this.instanceId}/exec`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        command,
        timeout: opts?.timeoutSec ?? 60,
        ...(opts?.cwd ? { cwd: opts.cwd } : {}),
      }),
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
      cwd: data.cwd ?? this.cwd,
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
    return {
      stdout: `(mock) $ ${command}\n(no sandbox connected — select one from the Sandboxes view)\n`,
      stderr: "",
      exitCode: 0,
      cwd: this.cwd,
    };
  }
}
