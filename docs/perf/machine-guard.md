# The machine guard — stopping the Mac's out-of-memory crashes (2026-10-17)

Arman, 2026-10-17: "absolutely do everything we can to put an end to them. If the preview is not the
problem, allow more of the right ones and make the wrong one very very very difficult."

The evidence is [preview-capacity.md](./preview-capacity.md): every jetsam report showed one or a few
runaway jobs started by agent sessions **outside** the preview (local `next build`, big node and
Python jobs, tsc, test runs) at 28–112 GB each. Nothing watched memory across the machine.

## What runs

| Piece | Where |
|---|---|
| The daemon: one instance machine-wide (flock), reads memory every `interval_seconds`, classifies every process, stops runaways, reloads itself when its source changes | `scripts/machine-guard/machine_guard.py daemon` |
| Started by the harness: `pnpm preview:start`, `pnpm preview:status`, the preview watchdog (every 30 s) and every wrapped job call `ensure` | `ensure_machine_guard` in `scripts/agent-harness/stale-sessions.sh` |
| The heavy-job wrapper: per-job real-memory ceiling enforced by a supervising watcher (macOS `ulimit`/launchd do not cap RSS), plus a machine-wide slot limit per kind | `scripts/machine-guard/job.sh <kind> -- <cmd>` |
| A raw local `next build` started by an agent is refused before a worker starts; `pnpm build:next` routes through the wrapper by itself; `build:types`, `build:profile`, `build:trace`, `pnpm test` are wrapped | `scripts/machine-guard/build-guard.cjs`, `next.config.js` `assertGuardedBuild`, `scripts/next-build-stable-env.mjs`, `package.json` |
| A detached scratch Playwright launcher (the "Resume"-pressing daemons) is closed once its agent session is gone, after the 2-minute grace instead of 180 minutes | rule 3 in `sweep_orphan_browsers` |
| Status: `pnpm machine-guard:status`, one line in `pnpm preview:status`; dry run: `pnpm machine-guard:dry-run`; tests: `pnpm machine-guard:test` | |

## Who may be stopped — only jobs provably started by an agent

A process belongs to a job when it sits under a Claude Code / Codex / Cursor-agent session's
**command shell** (ancestry), or under a detached tree whose processes carry an agent marker in their
environment (`MATRX_AGENT_JOB` from the wrapper, `CLAUDECODE=1` / `CLAUDE_CODE_SESSION_ID` from Claude
Code, `CODEX_*`). The environment is read with `KERN_PROCARGS2`; macOS hides it for platform binaries
such as `/bin/zsh`, so an unreadable environment never tags anything.

Never touched, nor anything they started:

- any process without that proof (a person's terminal, services, Docker/OrbStack);
- the agent session processes and their non-shell children (MCP servers);
- anything under `/Applications`, `~/Applications`, `/System`, `/usr/libexec`, `/usr/sbin`, `/sbin`,
  `/Library/Apple`, `/Library/Application Support` — Cursor, Chrome, the Claude desktop app and its
  browser pane — even when they were opened from an agent shell and inherited its marker;
- every browser (`ms-playwright`, Chrome, Chromium, headless shell): a watched session's browser is
  never stopped; orphans are the preview sweep's job;
- the shared preview (`MATRX_SHARED_PREVIEW`; it has its own 48 GB recycle) and its watchdog
  (`agent-dev-server.sh`), the `matrx-dev` local stack (`MATRX_STACK_LOGS`), and the guard itself.

A stop sends SIGTERM to the job's members, re-checked by pid **and** start time before each signal,
then SIGKILL to survivors after `stop_grace_seconds`. There is no name-based kill anywhere.

So the preview and the sessions always outlive a runaway build: they are never candidates, and the
critical tier stops the largest agent job first. The preview's burst walk cap stays as built.

## Tiers and knobs

Knobs: `~/.config/matrx/machine-guard.json` (only the keys you set; re-read every cycle, logged at
start). Defaults:

| Knob | Default | Meaning |
|---|---|---|
| `mode` | `enforce` | `dry-run` logs `WOULD STOP` and stops nothing |
| `interval_seconds` | 3 | sleep between cycles (one cycle reads ~2,000 processes in ~2 s) |
| `warn_available_gb` | 48 | below this (or kernel pressure ≥ 2): log the five biggest agent jobs, at most every `warn_log_every_seconds` (60) |
| `job_ceiling_gb` | 32 | any agent job tree past this for `ceiling_grace_samples` (3) cycles is stopped; past `hard_ceiling_factor` (1.5×) at once |
| `critical_available_gb` | 16 | below this (or pressure 4) for `critical_samples` (2) cycles: stop the largest agent job of at least `critical_min_victim_gb` (4), one per `pressure_cooldown_seconds` (20) |
| `stop_grace_seconds` | 10 | TERM → KILL |
| `kinds` | next-build 64 GB ×1 · test 32 ×2 · python 32 ×2 · install 16 ×2 · job 32 ×4 | wrapper ceiling and machine-wide concurrency per kind |
| `kind_patterns` | `next build` → next-build · `jest`/`vitest` → test | an unwrapped tree still gets its kind's ceiling |

A wrapper's declared ceiling covers its own subtree (the wrapper enforces it); on the whole session
tree it may only raise the ceiling, capped at the largest kind ceiling.

## How a session learns its job was stopped

- The notice is appended to the job's own stdout/stderr when that is an append-only regular file —
  which is how a Claude Code Bash command's output is captured — so it appears in the command result:
  `[machine-guard] STOPPED this command's pid … tree (… GB …) started by session … — <reason>`.
- A wrapped job prints `[machine-guard] STOPPING …` and exits 137.
- Every stop is a JSON line in `~/.local/state/matrx/machine-guard/stops.jsonl` (what, size, ceiling,
  reason, session id and pid, kind), a line in `guard.log`, and `notices/<session-id>.log`.
- `pnpm preview:status` and `pnpm machine-guard:status` show the last stops.

## Evidence (2026-10-17)

- `pnpm machine-guard:test`: 22 pass. Synthetic Mac (session, MCP helper, preview, Cursor and the
  Claude app opened from an agent shell, Chrome, Playwright, the matrx-dev stack, a person's detached
  job, the guard): only the three agent trees are jobs, no protected pid is ever a member. Mutations
  checked: removing the preview/stack env protection, treating MCP helpers as jobs, tagging unmarked
  detached trees, a grace of 1, or dropping app path + name protection each turn the suite red.
- Planted runaways, real processes, real daemon scoped to the test's children (a test home refuses an
  unscoped daemon): a tagged process allocating 1 GB is stopped at a 0.3 GB ceiling and its output file
  carries the notice; an untagged one beside it is untouched; a dry run stops nothing; the wrapper
  stops its job (exit 137); a second `solo` job waits for the slot.
- Live on the machine: the daemon (enforce) started 23:45, classifying ~160 agent jobs using ~60 GB at
  normal pressure. The build lab's running `pnpm build` was recognized as kind next-build (64 GB).
  It stopped one real job: this lane's own test command, whose tree a 0.3 GB test ceiling had wrongly
  covered; the notice landed in that command's output. That defect is fixed (declared ceilings only
  raise) and pinned by a test.
- A raw `next build` from an agent shell: refused in 6 s with the message above; under the wrapper the
  same check passes; a forged `MATRX_AGENT_JOB_SUPERVISOR` is refused (the supervisor must be a live
  ancestor running `machine_guard.py job`).
- `node --test scripts/preview-stale-sessions.test.mjs`: 14 pass (two new: a scratch launcher whose
  session pid is gone is closed at once; one whose session runs is kept). One run of nine under heavy
  load failed a timing test.

## Still open

1. ~~The preview's loader pool~~ — resolved 2026-10-18: the per-file loader rule is gone; one
   checker process lists only files with an unpublished import and the loader runs on those alone
   (0 loader workers in the preview with nothing pending). [preview-import-checker.md](./preview-import-checker.md).
2. `fseventsd` at 50 GB (10-17 event) is a system daemon; the guard never touches it.
3. The guard lives in this checkout; a session in another repo inherits it only while it runs here.
