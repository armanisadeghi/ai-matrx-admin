import type { ProcessAdapter } from "./ProcessAdapter";
import type { ProcessEvent, ProcessResult } from "../types";

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
    opts?: {
      cwd?: string;
      timeoutSec?: number;
      env?: Record<string, string>;
      stdin?: string;
    },
  ): Promise<ProcessResult> {
    const body: Record<string, unknown> = {
      command,
      timeout: opts?.timeoutSec ?? 60,
    };
    if (opts?.cwd) body.cwd = opts.cwd;
    if (opts?.env) body.env = opts.env;
    if (opts?.stdin !== undefined) body.stdin = opts.stdin;

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

  /**
   * Streaming exec via SSE. Stdout/stderr arrive incrementally via `onEvent`;
   * the returned ProcessResult resolves when the orchestrator emits the `exit`
   * event. Aborting the AbortSignal closes the SSE connection — the
   * orchestrator interprets that as cancellation and SIGTERMs the command.
   */
  async stream(
    command: string,
    onEvent: (ev: ProcessEvent) => void,
    opts?: {
      cwd?: string;
      env?: Record<string, string>;
      stdin?: string;
      signal?: AbortSignal;
    },
  ): Promise<ProcessResult> {
    const body: Record<string, unknown> = { command };
    if (opts?.cwd) body.cwd = opts.cwd;
    if (opts?.env) body.env = opts.env;
    if (opts?.stdin !== undefined) body.stdin = opts.stdin;

    const resp = await fetch(`/api/sandbox/${this.instanceId}/exec/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal: opts?.signal,
    });
    if (!resp.ok || !resp.body) {
      const errBody = await resp.text().catch(() => resp.statusText);
      throw new Error(`exec/stream failed (${resp.status}): ${errBody}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let exitCode = 0;
    let stdout = "";
    let stderr = "";
    let cwd = this.cwd;

    // Robust SSE parsing — the standard says events are separated by blank
    // lines; data lines start with "data: ". Multi-line data values are joined
    // with "\n".
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Drain complete events (terminated by a blank line) from the buffer.
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (!rawEvent.trim()) continue;

        let eventName = "message";
        const dataLines: string[] = [];
        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
        }
        if (!dataLines.length) continue;

        let payload: Record<string, unknown> = {};
        try {
          payload = JSON.parse(dataLines.join("\n"));
        } catch {
          // Some daemons emit raw text — wrap as text payload so we don't lose it.
          payload = { data: dataLines.join("\n") };
        }

        if (eventName === "stdout") {
          const text = String(payload.data ?? "");
          stdout += text;
          onEvent({ type: "stdout", text });
        } else if (eventName === "stderr") {
          const text = String(payload.data ?? "");
          stderr += text;
          onEvent({ type: "stderr", text });
        } else if (eventName === "exit") {
          exitCode = Number(payload.exit_code ?? 0);
          if (typeof payload.cwd === "string") cwd = payload.cwd;
          onEvent({
            type: "exit",
            text: "",
            exitCode,
            cwd,
          });
        } else {
          onEvent({ type: "info", text: String(payload.data ?? "") });
        }
      }
    }

    if (cwd) this.cwd = cwd;
    return { stdout, stderr, exitCode, cwd };
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
