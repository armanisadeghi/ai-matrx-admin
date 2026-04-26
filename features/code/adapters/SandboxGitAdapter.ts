/**
 * Adapter for git operations against a sandbox.
 *
 * All methods route through /api/sandbox/[id]/git/* which proxies to the
 * orchestrator and from there into the in-container daemon (which shells out
 * to `git`). The point of having a structured adapter — rather than calling
 * `process.exec("git status")` — is that the responses are already parsed
 * JSON, so the source-control UI never has to scrape `git` output.
 *
 * The interface intentionally mirrors the matrx_agent daemon's contract one
 * to one. See `/srv/projects/matrx-sandbox/SANDBOX_CLIENT_GUIDE.md` §8 for
 * the underlying semantics.
 */

import type { SandboxAccessResponse } from "@/types/sandbox";

// `cwd` is repeated on every call because the daemon scopes git operations to
// a directory inside the sandbox. Defaults to /home/agent.
// Using `{}` as the default lets `status({cwd})` type-check while
// keeping more specific shapes (e.g. `{path?: string}`) intact when
// callers pass them explicitly.
type WithCwd<T = object> = T & { cwd?: string };

export interface GitFileChange {
  path: string;
  status: string; // "M", "A", "D", "??", etc. — matches `git status --porcelain` codes
}

export interface GitStatusResponse {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  conflicted: string[];
}

export interface GitLogEntry {
  sha: string;
  short: string;
  author: string;
  date: string;
  subject: string;
}

export interface GitDiff {
  path: string | null;
  /** Unified diff text. */
  text: string;
  staged: boolean;
}

export interface GitCloneRequest {
  url: string;
  dest: string;
  branch?: string;
  depth?: number;
  /** Reference into the credential store; opaque to the frontend. */
  credentials_ref?: string;
}

export interface GitCommitRequest {
  message: string;
  author?: { name: string; email: string };
  amend?: boolean;
}

export interface GitBranchAction {
  action: "create" | "delete" | "switch";
  name: string;
}

export interface GitStashAction {
  action: "push" | "pop" | "list" | "drop";
  message?: string;
}

export interface GitAdapterOptions {
  /** sandbox_instances.id (the UUID used by the /api/sandbox/[id] route). */
  instanceId: string;
}

export class SandboxGitAdapter {
  readonly id: string;
  constructor(public readonly opts: GitAdapterOptions) {
    this.id = `sandbox-git:${opts.instanceId}`;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const resp = await fetch(
      `/api/sandbox/${this.opts.instanceId}/git/${path}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!resp.ok) {
      const txt = await resp.text().catch(() => resp.statusText);
      throw new Error(`git ${path} failed (${resp.status}): ${txt}`);
    }
    return resp.json();
  }

  private async get<T>(
    path: string,
    query?: Record<string, string | undefined>,
  ): Promise<T> {
    const qs = query
      ? "?" +
        Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(
            ([k, v]) =>
              `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`,
          )
          .join("&")
      : "";
    const resp = await fetch(
      `/api/sandbox/${this.opts.instanceId}/git/${path}${qs}`,
    );
    if (!resp.ok) {
      const txt = await resp.text().catch(() => resp.statusText);
      throw new Error(`git ${path} failed (${resp.status}): ${txt}`);
    }
    return resp.json();
  }

  // ── Repo lifecycle ─────────────────────────────────────────────────────

  clone(req: GitCloneRequest): Promise<{ ok: boolean; path: string }> {
    return this.post("clone", req);
  }

  // ── Read ───────────────────────────────────────────────────────────────

  status(opts?: WithCwd): Promise<GitStatusResponse> {
    return this.get("status", { cwd: opts?.cwd });
  }

  diff(opts?: WithCwd<{ path?: string; staged?: boolean }>): Promise<GitDiff> {
    return this.get("diff", {
      cwd: opts?.cwd,
      path: opts?.path,
      staged: opts?.staged ? "true" : undefined,
    });
  }

  log(opts?: WithCwd<{ limit?: number }>): Promise<GitLogEntry[]> {
    return this.get("log", {
      cwd: opts?.cwd,
      limit: opts?.limit ? String(opts.limit) : undefined,
    });
  }

  // ── Mutate ─────────────────────────────────────────────────────────────

  add(opts: WithCwd<{ paths: string[] }>): Promise<{ ok: boolean }> {
    return this.post("add", opts);
  }

  commit(opts: WithCwd<GitCommitRequest>): Promise<{ sha: string }> {
    return this.post("commit", opts);
  }

  push(
    opts: WithCwd<{
      remote?: string;
      branch?: string;
      force_with_lease?: boolean;
    }> = {},
  ): Promise<{ ok: boolean }> {
    return this.post("push", opts);
  }

  pull(
    opts: WithCwd<{ remote?: string; branch?: string; rebase?: boolean }> = {},
  ): Promise<{ ok: boolean }> {
    return this.post("pull", opts);
  }

  branch(opts: WithCwd<GitBranchAction>): Promise<{ ok: boolean }> {
    return this.post("branch", opts);
  }

  stash(
    opts: WithCwd<GitStashAction>,
  ): Promise<{ ok: boolean; entries?: string[] }> {
    return this.post("stash", opts);
  }

  // ── Credentials ────────────────────────────────────────────────────────
  // Note: credentials are NOT a /git endpoint — they live at
  // /api/sandbox/[id]/credentials. We expose them here so a "Source Control"
  // UI has a single object to reach for.

  setGithubToken(
    token: string,
    scope: "read" | "write" = "write",
  ): Promise<{ ok: boolean }> {
    return this.postCredentials({ kind: "github", token, scope });
  }

  setSshKey(privateKey: string, knownHosts?: string): Promise<{ ok: boolean }> {
    return this.postCredentials({
      kind: "ssh",
      private_key: privateKey,
      known_hosts: knownHosts,
    });
  }

  revokeCredentials(): Promise<{ ok: boolean }> {
    return fetch(`/api/sandbox/${this.opts.instanceId}/credentials/revoke`, {
      method: "POST",
    }).then((r) => {
      if (!r.ok) throw new Error(`revoke failed (${r.status})`);
      return r.json();
    });
  }

  private async postCredentials<T>(body: Record<string, unknown>): Promise<T> {
    const resp = await fetch(
      `/api/sandbox/${this.opts.instanceId}/credentials`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!resp.ok) {
      const txt = await resp.text().catch(() => resp.statusText);
      throw new Error(`credentials failed (${resp.status}): ${txt}`);
    }
    return resp.json();
  }
}

// Re-export the SSH access helper near the git adapter — natural neighbor.
export type { SandboxAccessResponse };
