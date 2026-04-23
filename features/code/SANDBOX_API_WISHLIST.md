# Sandbox API — Requirements for a Web-Based Code Editor

**Audience:** The team that owns the sandbox orchestrator (Python/FastAPI service behind `MATRX_ORCHESTRATOR_URL`) and the sandbox template image.

**Author:** `matrx-admin` frontend / `/code` workspace team.

**Context:** We are building a VSCode-style web code editor (`features/code/`) that uses our existing sandboxes as the execution and filesystem backend. Today the only integration point is `/api/sandbox/[id]/exec`, and the `/code` frontend currently implements filesystem operations by shelling out (`ls -lA`, `cat`, `echo … | base64 -d > …`). That works for a demo but breaks as soon as we care about binary files, large files, streaming output, git, or concurrency.

This doc is a full audit of **what we have**, **what we need**, and **what we'd love to have** — in priority order. It is designed to be handed off as a spec for the orchestrator and template teams to scope work against.

---

## 1. What we have today (as implemented in `matrx-admin`)

### 1.1 API surface (Next.js → orchestrator)

All calls go `browser → Next.js route → orchestrator`. The Next.js layer is a thin auth + DB proxy.

| Route | Upstream | Purpose |
|-------|----------|---------|
| `GET  /api/sandbox` | — | List `sandbox_instances` rows for the user. |
| `POST /api/sandbox` | `POST {ORCH}/sandboxes` with `{ user_id, config }` | Create sandbox. Enforces max 5 active per user. |
| `GET  /api/sandbox/[id]` | — | Read one row. |
| `PUT  /api/sandbox/[id]` | `DELETE {ORCH}/sandboxes/{sandbox_id}?graceful=true` (for `stop`) | `{ action: "stop" \| "extend", ttl_seconds? }`. `extend` only updates our DB — **does not call orchestrator**. |
| `DEL  /api/sandbox/[id]` | `DELETE {ORCH}/sandboxes/{sandbox_id}?graceful=false` | Soft delete row, hard stop container. |
| `POST /api/sandbox/[id]/exec` | `POST {ORCH}/sandboxes/{sandbox_id}/exec` | The only execution primitive we have. |
| `POST /api/sandbox/[id]/access` | `POST {ORCH}/sandboxes/{sandbox_id}/access` | Returns SSH key + host + port for external human use. |
| `POST /api/sandbox/cleanup` | RPC `cleanup_deleted_sandboxes` | Retention cleanup. |

**Source:** `app/api/sandbox/**/*.ts`, `hooks/sandbox/use-sandbox.ts`, `types/sandbox.ts`.

### 1.2 The `exec` primitive — the one thing we have

**Request** (`SandboxExecRequest`, `types/sandbox.ts:53-57`):

```ts
{ command: string; timeout?: number; cwd?: string }
```

**Response** (`SandboxExecResponse`, `types/sandbox.ts:59-64`):

```ts
{ exit_code: number; stdout: string; stderr: string; cwd: string }
```

**Constraints / behavior:**

- `command` max 10,000 chars.
- `timeout` clamped 1–600 seconds, default 30 at the route, default 60 in `SandboxProcessAdapter`.
- Orchestrator maintains **per-sandbox session state** — `cd foo` persists across exec calls, and the response `cwd` reflects the current directory. This is good.
- The response is a single JSON blob at end-of-command. **No streaming.** stdout/stderr are fully buffered on the server until the command exits or times out.
- No `stdin` input. No `env` override. No way to send a signal. No way to run a command in the background and attach later.

### 1.3 Database row shape (`sandbox_instances`)

From `types/database.types.ts` ~11626 and `types/sandbox.ts`:

```ts
{
  id: string;                  // our UUID — used in all /api/sandbox/[id] routes
  sandbox_id: string;          // orchestrator's native ID — used when proxying
  user_id, project_id, task_id, organization_id
  status: 'creating'|'starting'|'ready'|'running'|'shutting_down'|'stopped'|'failed'|'expired'
  container_id, hot_path, cold_path
  config: Record<string, unknown>
  ttl_seconds, expires_at, last_heartbeat_at
  stopped_at, stop_reason, deleted_at
  is_public, ssh_port
  created_at, updated_at
}
```

### 1.4 What the `/code` editor is doing to compensate

Because `exec` is our only primitive, `SandboxFilesystemAdapter` (`features/code/adapters/SandboxFilesystemAdapter.ts`) synthesizes file operations via shell:

- **List directory:** `ls -lA --time-style=long-iso <path>` + regex parsing of the output.
- **Read file:** `cat <path>` — returns `stdout` as a `string`. Binary files are corrupted.
- **Write file:** content is base64-encoded client-side, sent as `echo '<b64>' | base64 -d > <path>`. Fails for files larger than the 10,000-char command limit (~7.5KB of content after base64 bloat).
- **No stat, no mkdir, no rmdir, no rename, no copy, no watch.** Anything else the user wants has to be typed into the terminal.
- **Search** (grep, find) is not surfaced at all — would also have to go through `exec` and its output buffer.

This is the core reason we're writing this doc: the shell-over-HTTP approach does not scale to a real code editor.

---

## 2. Capability matrix — Today vs. Target

| Area | Need | Today | Gap |
|------|------|-------|-----|
| **Files — text read** | Read by path, UTF-8 | `cat` via exec | Works, but bundled into `exec` output buffer; no range reads |
| **Files — binary read** | Photos, PDFs, lockfiles, compiled artifacts | **Broken** — `stdout` is a JSON string | Need proper binary endpoint |
| **Files — write** | Create/overwrite, any size | `echo | base64 -d` via exec | **10KB command cap = ~7.5KB file cap** |
| **Files — append / patch** | Save edit as diff | None | Need a patch or byte-range write endpoint |
| **Files — list dir** | name, kind, size, mtime, permissions | `ls -lA` parsed | Fragile (filenames with spaces, locales); no sorting/filter hints |
| **Files — tree / recursive list** | For file-tree panel without N+1 | None | Needed |
| **Files — stat** | Exists, size, mtime, symlink target | None | Needed |
| **Files — mkdir / rmdir / rename / copy** | Basic file management | Shell only | Needed as API |
| **Files — watch** | Hot reload, agent observability | None | Needed (WebSocket / SSE) |
| **Files — search (grep)** | "Find in files" in the editor | Shell only, buffered | Needed as streaming API |
| **Files — search (find)** | Quick-open, path fuzzy search | Shell only | Needed as API |
| **Files — upload / download** | Drag-in a zip, download a file, export a folder | None | Needed |
| **Exec — one-shot** | Small commands | `exec` | OK |
| **Exec — streaming stdout/stderr** | Long builds, test runs, `pnpm install` | **Buffered only** — UI freezes | Critical |
| **Exec — stdin** | `git commit -m` with editor, prompts, REPLs | None | Needed |
| **Exec — env** | `NODE_ENV`, `GITHUB_TOKEN`, etc. | None | Needed |
| **Exec — kill / signal** | Cancel a stuck command | None | Critical |
| **Exec — list processes** | "What's running?" | None | Nice to have |
| **PTY — interactive terminal** | Real shell with arrow keys, ctrl-c, tmux, vim | **No** — xterm.js is client-only read-line emulation | Critical |
| **Git — preinstalled** | Unknown (not documented in this repo) | ? | Confirm |
| **Git — clone by URL** | Bring a repo into the sandbox | Shell only | Needed as first-class |
| **Git — credential helper** | GitHub OAuth token from Supabase → git push | None | Critical for any real work |
| **Git — status/diff/commit/push** | Via our UI, not a terminal | Shell only | Needed |
| **Git — SSH key mgmt** | Known hosts, deploy keys | None | Needed |
| **Lifecycle — snapshot / resume** | Close laptop, come back later | None | Nice to have |
| **Lifecycle — idle shutdown** | Cost control | TTL in our DB — unclear if orchestrator honors it | Confirm + align |
| **Lifecycle — TTL extend** | Keep working | Our route updates DB only, no orchestrator call | **Bug: drift between DB and container** |
| **Lifecycle — template selection** | Create "Node.js", "Python", "bare" variants | Not in our create body | Needed |
| **Collab — multiple editors in one sandbox** | Pair programming, multi-tab | DB has `is_public`, `organization_id` but no API | Needed long-term |

---

## 3. Requirements — What we need to ship a real editor

These are grouped by priority. "P0" = can't ship a credible code editor without it. "P1" = needed before inviting paying users. "P2" = quality-of-life and scale.

### 3.1 P0 — Must-have

#### 3.1.1 Structured filesystem API

Replace our shell-based FS synthesis with dedicated HTTP endpoints on each sandbox. Suggested shape (final shape is up to you — we just need the capabilities):

```
GET    /sandboxes/{id}/fs/list?path=/abs/path&recursive=false&depth=1
GET    /sandboxes/{id}/fs/stat?path=/abs/path
GET    /sandboxes/{id}/fs/read?path=/abs/path&encoding=utf8|base64&range=0-65535
PUT    /sandboxes/{id}/fs/write       body: { path, content, encoding, mode?, create_parents? }
POST   /sandboxes/{id}/fs/patch       body: { path, edits: [{ start, end, replacement }] }  // optional but preferred
DELETE /sandboxes/{id}/fs/delete?path=/abs/path&recursive=false
POST   /sandboxes/{id}/fs/mkdir       body: { path, parents? }
POST   /sandboxes/{id}/fs/rename      body: { from, to, overwrite? }
POST   /sandboxes/{id}/fs/copy        body: { from, to, recursive? }
```

**Requirements:**

- All paths are absolute, start with `/`.
- `list` returns `{ entries: [{ name, path, kind: "file"|"dir"|"symlink", size, mtime, mode, target? }], truncated?, nextPageToken? }`.
- `read` supports **binary** via `encoding=base64` and **range reads** for files > 1 MB.
- `write` supports **binary** via `encoding=base64`. No size cap beyond a per-sandbox disk quota. Atomic replace (write to temp + rename) so readers never see partial files.
- `patch` is a huge latency win for editor saves — even if you implement it on top of read-modify-write server-side at first, having the endpoint means we can upgrade later without client changes.
- Every mutating endpoint returns the new stat (size, mtime, checksum) so the client can drop an extra round-trip.

#### 3.1.2 Streaming `exec`

Exec with SSE or chunked transfer so we get incremental stdout/stderr:

```
POST /sandboxes/{id}/exec/stream    body: { command, cwd?, env?, stdin?, timeout? }
```

**Response:** `Content-Type: text/event-stream` with events:
- `stdout` — `{ data: string }` (or `{ data: base64, encoding: "base64" }` for non-UTF8)
- `stderr` — same
- `exit` — `{ exit_code: number, cwd: string, duration_ms: number }`

Alternatively, **WebSocket**: `wss://…/sandboxes/{id}/exec` — same event schema. WebSocket is preferable because we also want `stdin` after the command starts (see PTY below).

**Required features on exec:**

- `env: Record<string, string>` additive to the sandbox default env.
- `stdin?: string` for one-shot input.
- `timeout_sec` with a clean kill + partial output returned.
- Cancellation: a second request `DELETE /sandboxes/{id}/exec/{exec_id}?signal=SIGTERM` OR a WebSocket control frame. We need to cancel a stuck `pnpm install` without destroying the sandbox.
- Command limit raised to at least **64 KB** (to allow inline heredocs for edge cases) or removed entirely in favor of `stdin`.

#### 3.1.3 Real PTY / interactive terminal (WebSocket)

```
wss://…/sandboxes/{id}/pty?cols=120&rows=30
```

- Bidirectional: client sends keypresses, server sends raw PTY bytes.
- Resize frame: `{ type: "resize", cols, rows }`.
- Signal frame: `{ type: "signal", name: "SIGINT" }`.
- Long-lived: survives page refresh for at least 30 seconds so users don't lose their shell on reload.
- Supports `vim`, `nano`, `htop`, `git commit` (which spawns an editor), `python`, `node` REPLs.

Once this lands, `xterm.js` in the editor becomes a real terminal.

#### 3.1.4 Git workflow primitives

Even with a real PTY, we want UI-driven git operations (status bar, commit dialog, PR flow, etc.). Needed:

```
POST /sandboxes/{id}/git/clone             { url, dest, branch?, depth?, credentials_ref? }
GET  /sandboxes/{id}/git/status?cwd=...    → { branch, ahead, behind, staged[], unstaged[], untracked[], conflicted[] }
GET  /sandboxes/{id}/git/diff?cwd=...&path?=...&staged?=bool  → unified diff text or structured
POST /sandboxes/{id}/git/add               { paths[], cwd }
POST /sandboxes/{id}/git/commit            { message, cwd, author?, amend? }
POST /sandboxes/{id}/git/push              { cwd, remote?, branch?, force_with_lease? }
POST /sandboxes/{id}/git/pull              { cwd, remote?, branch?, rebase? }
POST /sandboxes/{id}/git/branch            { action: "create"|"delete"|"switch", name, cwd }
POST /sandboxes/{id}/git/stash             { action: "push"|"pop"|"list"|"drop", cwd, message? }
GET  /sandboxes/{id}/git/log?cwd=...&limit=50 → [{ sha, short, author, date, subject }]
```

These can all be implemented by the orchestrator shelling out to `git` — the win is a structured contract our UI can depend on.

#### 3.1.5 Git credential model

This is the single biggest blocker for making the editor useful. We need a way to hand the sandbox a GitHub (or GitLab/Gitea) token that `git push` will pick up, without the user pasting it into a terminal.

Proposed flow:

1. Frontend obtains a token from Supabase Auth (GitHub OAuth identity) or from our app's per-user token vault.
2. Frontend calls `POST /sandboxes/{id}/credentials` with `{ kind: "github", token, scope?: "read"|"write" }`.
3. Orchestrator writes a git credential helper config (`git config --global credential.helper …`) scoped to that sandbox's home, with the token stored in a location not visible via `/fs/read` (e.g. memfs or a secrets endpoint that redacts).
4. Credentials live for the sandbox lifetime; on stop they're shredded.
5. `POST /sandboxes/{id}/credentials/revoke` for logout.

Also: allow SSH deploy keys the same way — `{ kind: "ssh", private_key, known_hosts? }`.

#### 3.1.6 Template selection at create time

Our `POST /sandboxes` currently sends `{ user_id, config }`. We need:

```ts
{
  user_id: string,
  template: string,           // e.g. "node-22", "python-3.13", "bare"
  template_version?: string,  // optional pin
  config?: Record<string, unknown>,
  ttl_seconds?: number,
  resources?: { cpu?, memory_mb?, disk_mb? },  // optional quotas
  labels?: Record<string, string>,             // so we can tag { feature: "code-editor" }
}
```

- An endpoint to list available templates and their versions: `GET /templates`.
- `sandbox_instances` row should record `template` and `template_version` so we can migrate users when templates change.

#### 3.1.7 TTL / lifecycle correctness

Today `PUT /api/sandbox/[id] { action: "extend" }` only updates our Postgres row. The orchestrator keeps its own clock. We need:

```
POST /sandboxes/{id}/extend   { ttl_seconds }       → { new_expires_at }
POST /sandboxes/{id}/heartbeat                      → { last_heartbeat_at, idle_shutdown_at }
```

And a **documented** idle-shutdown policy (is a sandbox killed after N minutes of no exec? No network? Tell us). We want the sandbox to auto-extend while a user is actively editing, so a heartbeat endpoint the editor can ping every 60s is ideal.

### 3.2 P1 — Needed before public beta

#### 3.2.1 File watcher / change feed

```
wss://…/sandboxes/{id}/fs/watch?path=/home/agent/project&recursive=true&ignore=["node_modules",".git"]
```

- Events: `{ type: "created"|"modified"|"deleted"|"moved", path, kind, at }`.
- Debounced server-side (≥ 50ms) to avoid storms on `npm install`.
- Initial snapshot option: `?snapshot=true` sends a full tree on connect.

This unlocks:
- Auto-refresh the file tree when a build or agent writes files.
- Live reload in the editor when an external tool modifies an open file.
- Agent observability ("the agent just touched these 12 files").

#### 3.2.2 Server-side search

```
POST /sandboxes/{id}/search/content      { query, regex?, case_sensitive?, include_globs?, exclude_globs?, max_results? }
POST /sandboxes/{id}/search/paths        { pattern, max_results?, fuzzy? }
```

Stream results. Use `ripgrep` under the hood. `node_modules`, `.git`, binary files excluded by default unless overridden.

Without this, "find in files" in a 50k-file repo is impossible over HTTP.

#### 3.2.3 Bulk file operations

```
POST /sandboxes/{id}/fs/upload       multipart/form-data — zip extraction on arrival if content-type matches
GET  /sandboxes/{id}/fs/download?path=/abs/path&format=zip|tar
POST /sandboxes/{id}/fs/batch         { ops: [{ kind: "write"|"delete"|"mkdir"|"rename", … }] }
```

The batch endpoint matters because AI agents often want to apply a multi-file patch atomically.

#### 3.2.4 Process management

```
GET  /sandboxes/{id}/processes                         → [{ pid, command, cwd, started_at, cpu_pct, rss_kb }]
POST /sandboxes/{id}/processes/{pid}/signal            { signal: "SIGTERM"|"SIGKILL"|"SIGINT" }
POST /sandboxes/{id}/exec/background    { command, cwd?, env?, log_to? } → { exec_id, pid }
GET  /sandboxes/{id}/exec/{exec_id}/logs?since=...     SSE stream or paginated
```

Needed for "Run dev server in the background and show me its logs in a panel."

#### 3.2.5 Port forwarding / preview URLs

```
POST /sandboxes/{id}/ports/expose     { port, public?, auth?: "user"|"public" } → { url, token? }
GET  /sandboxes/{id}/ports             → [{ port, url, created_at }]
DELETE /sandboxes/{id}/ports/{port}
```

- `url` is something like `https://{sandbox_short_id}-{port}.sandbox.matrx.app`.
- Optional auth so only the owner or their collaborators can hit it.

This is how "see my Next.js dev server at port 3000" works inside the editor.

### 3.3 P2 — Wishlist / long-term

#### 3.3.1 Snapshot & resume

```
POST /sandboxes/{id}/snapshot          → { snapshot_id, size_mb, created_at }
POST /sandboxes                        { template: "restore", snapshot_id } → new sandbox from snapshot
GET  /snapshots?user_id=…              → list
DELETE /snapshots/{id}
```

So users can close their laptop and pick up exactly where they left off without paying for an always-on container.

#### 3.3.2 Multi-user / shared sandboxes

The DB already has `is_public` and `organization_id`. The API should expose:

```
POST /sandboxes/{id}/share             { user_ids?, org_id?, role: "viewer"|"editor" }
DELETE /sandboxes/{id}/share/{user_id}
```

And a collaboration layer on top of the PTY / file watcher so two editors can operate on one sandbox (CRDT-level integration is out of scope for the orchestrator, but the primitives — shared PTY sessions, change feeds — need to exist).

#### 3.3.3 LSP proxy

Run language servers (typescript, pyright, rust-analyzer) inside the sandbox and expose them through a WebSocket that our Monaco editor can speak LSP to:

```
wss://…/sandboxes/{id}/lsp/{language}?workspace=/home/agent/project
```

This is what makes the editor feel "smart" — jump to definition, real type errors, refactor-rename — all powered by the sandbox's filesystem, not ours.

This is a large project; flag it only so it's on the map.

#### 3.3.4 AI model integration points

You mentioned the template will include our own AI models. We'd like:

- A **well-known socket path** (e.g. `/run/matrx-ai.sock`) or HTTP endpoint inside the sandbox that the editor/agents can talk to without it being reachable from outside.
- A health endpoint: `GET /sandboxes/{id}/ai/status → { models: [{ name, loaded, endpoint }] }`.
- A way to swap or reload models without restarting the sandbox.

---

## 4. Template requirements (the image itself)

Independent of the API, we want the default template image to ship with:

**Baseline:**

- `bash`, `zsh`, `coreutils`, `findutils`, `ripgrep`, `fd-find`, `jq`, `curl`, `wget`, `unzip`, `tar`, `rsync`, `tmux`, `less`, `vim`, `nano`.
- `git ≥ 2.40` with `credential-store` helper pre-configured.
- `openssh-client` with `~/.ssh` set up and permissions correct.
- Locale: `C.UTF-8` as the default.

**Language toolchains (configurable per template variant):**

- `node` LTS (currently 22.x) via a version manager (fnm or volta) so users can `fnm use 20`.
- `pnpm` globally, also `corepack enable`.
- `python` 3.13 with `uv`.
- `go`, `rustup` + `cargo` as optional templates.

**Editor integration hooks:**

- A `/run/matrx/` directory reserved for us: control sockets, credential helpers, AI model sockets.
- `/home/agent/workspace` as the default project root (or document what it is — our adapter currently assumes `/home/agent`).
- `/home/agent/.matrx/` for per-user editor state (settings overrides, shell history we import across sessions).

**Preinstalled daemons:**

- `git-lfs` (for repos with large files).
- `sshd` on the port in `ssh_port` (already there based on the access endpoint).
- Optional: our AI model runtime, listening on a local-only port + `/run/matrx-ai.sock`.

**Security defaults:**

- Non-root user (`agent`) with passwordless sudo for a short allow-list (`apt-get`, `npm`, `pnpm` — not arbitrary).
- `/tmp` is tmpfs, capped.
- Outbound network allowed; inbound only via the port-forward endpoint.

---

## 5. Open questions for the orchestrator team

Please answer these so we can finalize the `/code` adapter design:

1. **Streaming:** Which do you prefer for `exec` — SSE or WebSocket? Is there a preferred framework pattern on your side (FastAPI + sse-starlette vs. websockets)?
2. **PTY backend:** `pty` module + asyncio, `xterm-headless` server-side, or something else?
3. **Git:** Is `git` already in the template? If yes, what version? If no, is there a reason?
4. **Credentials:** Do you have an existing secrets-mount story for sandboxes? We'd rather plug into that than design a new one.
5. **Template versioning:** How do you currently ship template updates? Is there a registry we can list from? If we pin `template_version`, how long is an old version guaranteed to be runnable?
6. **TTL extend:** Does the orchestrator honor our DB's `expires_at`, or does it have its own clock? (Related to the bug where our `extend` route doesn't proxy.)
7. **Idle shutdown:** What's the current policy? Heartbeat required?
8. **Concurrency per sandbox:** Can two `exec` requests run simultaneously against the same sandbox? Is the "session cwd" per-sandbox or per-connection?
9. **Disk quotas:** What's the default disk budget? Is it visible anywhere?
10. **File size:** Any server-side limits on individual file size (for the new FS API)?
11. **Port forwarding:** Is there already infrastructure for this, or would it be new?
12. **Snapshots:** Does the underlying runtime support checkpoint/restore (CRIU, VM snapshot, …)?
13. **Multi-sandbox routing:** Is there sticky-session routing so cwd persistence isn't broken by load balancers?
14. **Observability:** Can we get per-sandbox CPU / memory / disk metrics via the API for a "resource usage" panel in the editor?

---

## 6. Delivery order we'd suggest

If you want a pragmatic phased rollout, here's the order that unblocks the most editor work per unit of backend effort:

1. **Phase 1 — "Editor MVP":** §3.1.1 (structured FS), §3.1.2 (streaming exec with env/stdin/cancel), §3.1.7 (TTL extend proxies to orchestrator), §3.1.6 (template selection).
    - Unblocks: real save (any size, binary), live build output, run+cancel commands, pick the right image.
2. **Phase 2 — "Real terminal + Git":** §3.1.3 (PTY WebSocket), §3.1.4 + §3.1.5 (git primitives + credentials).
    - Unblocks: clone a repo, edit, commit, push — the core loop.
3. **Phase 3 — "Beta-quality editor":** §3.2.1 (watcher), §3.2.2 (ripgrep search), §3.2.3 (bulk/upload), §3.2.5 (port forwarding).
    - Unblocks: live reload, find-in-files, drag-to-upload, visit dev server.
4. **Phase 4 — "Power user":** §3.2.4 (process mgmt), §3.3.1 (snapshots), §3.3.2 (shared sandboxes), §3.3.3 (LSP).

---

## 7. On our side — what we'll build against these endpoints

For context so you can design the contracts with confidence in how they'll be used:

- `features/code/adapters/SandboxFilesystemAdapter.ts` — will be rewritten to use the structured FS endpoints. The `FilesystemAdapter` interface (`features/code/adapters/FilesystemAdapter.ts`) will grow `stat`, `mkdir`, `rename`, `delete`, `watch`, `searchContent`, `searchPaths`.
- `features/code/adapters/SandboxProcessAdapter.ts` — will gain a `stream()` method implementing the streaming exec.
- `features/code/terminal/TerminalTab.tsx` — will be rewritten against the PTY WebSocket. Our current xterm.js instance is local-only.
- A new `features/code/adapters/SandboxGitAdapter.ts` will back a Source Control panel in the activity bar.
- `features/code/runtime/agentTools.ts` — the agent tools (which let LLMs call filesystem/exec/git operations on a workspace) will expose the same endpoints to agents through a single permissions-gated interface.

---

## 8. Appendix — Reference files in `matrx-admin`

| File | What it is |
|------|------------|
| `app/api/sandbox/route.ts` | List + create routes. |
| `app/api/sandbox/[id]/route.ts` | Get/stop/extend/delete. |
| `app/api/sandbox/[id]/exec/route.ts` | The only exec primitive today. |
| `app/api/sandbox/[id]/access/route.ts` | SSH access (external, not used by the editor). |
| `types/sandbox.ts` | Request/response shapes. |
| `types/database.types.ts` (~11626) | `sandbox_instances` row. |
| `features/code/adapters/FilesystemAdapter.ts` | Interface we want the sandbox to satisfy. |
| `features/code/adapters/ProcessAdapter.ts` | Interface — `stream?` documented as v2. |
| `features/code/adapters/SandboxFilesystemAdapter.ts` | Current shell-based implementation. |
| `features/code/adapters/SandboxProcessAdapter.ts` | Current exec-based implementation. |
| `features/code/views/sandboxes/SandboxesPanel.tsx` | Sandboxes activity-bar panel. |
| `features/code/terminal/TerminalTab.tsx` | Current (fake) terminal. |
| `hooks/sandbox/use-sandbox.ts` | React hook wrapping the sandbox HTTP surface. |

---

*Last updated: when handed off. Ping the `/code` team on any of this — happy to iterate on the shapes.*
