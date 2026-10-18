# Preview capacity and the machine's stability (2026-10-17)

Arman, 2026-10-17: "Update it so that it's normally maxes at 4 but that when another session
needs it, they are permitted to go up to 8, as long as they watch the memory and close it if it
raises. Even at 4, I have my system crash at least 5 times per day because of poor management and
stale sessions."

This page is the evidence behind that change: what was taking the Mac down, what now cleans it up,
and what is still open.

## What was crashing the machine

### 1. Jetsam events: the machine ran out of memory and swap

macOS writes a `JetsamEvent-*.ips` each time it runs out of memory and starts killing processes
(`/Library/Logs/DiagnosticReports/`). There were ten from 2026-10-10 to 2026-10-17. In the bad ones,
macOS killed hundreds of its own background services for `low-swap`: 220 `secinitd`, 206
`systemstatusd` and 166 `sandboxd` kills on 10-14 21:52. That is the freezing, the apps dying and the
"Browser pane is hidden" errors. Full reboots in `last reboot`: 10-17 05:56 (after a shutdown stall),
10-11, 10-10, 10-06, 09-30, 09-28, 09-27, 09-26, 09-25.

What held the memory at each event (resident size, from the jetsam report):

| Event | Largest processes | All `node` |
|---|---|---|
| 10-17 04:02 | node pid 7409 **78.8 GB** (started 17.6 min earlier, 9,693 CPU-seconds, 300 fds, in a Claude session's group) · `fseventsd` **50.2 GB** · node 52709 21.4 GB (1,024 fds, the dev-server profile) · `tsc` 10.3 GB | 297 processes, 122.8 GB |
| 10-15 21:26 | python3.13 pid 44360 **111.6 GB** · node 27.6 GB | 409 processes, 52.6 GB |
| 10-14 21:52 | Python pid 3357 **88.3 GB** · node 17.1 GB · 99 `claude` processes 26 GB | 346 processes, 43.8 GB |
| 10-11 01:52 | node **60.2 + 42.1 + 27.8 + 12.5 GB** (two of them in one Claude session's group) · two esbuild 6.9 + 5.0 GB | 665 processes, 185.5 GB |
| 10-10 22:02 | node pid 90166 **111.4 GB** (lifetime peak 118.9 GB) | 436 processes, 134.8 GB |

The pattern: **one or a few runaway jobs, 28–112 GB each** (local builds, heavy node or Python jobs
started from agent sessions), plus hundreds of leftover small processes. The shared preview has a
48 GB watchdog cap. At the 10-17 event it was the 21.4 GB process, not the 78.8 GB one. Nothing
watched memory across the whole machine, so nothing slowed new work as memory ran out.

### 2. Stale sessions piled up around the preview (measured 21:55–22:45)

- **Holds outlived their runs.** A hold was a file with up to 180 minutes on it and no owner. Any
  one live hold blocks every idle recycle of the preview. At 21:55 seven holds were live, and two
  belonged to sessions that had been silent for 25 and 37 minutes (one still had 98 minutes left).
  By 22:20 there were 16. That day the preview was restarted at 49.7 GB "even though a test run
  holds it", and the watchdog had restarted it 9 times since noon. Each restart drops every session.
- **The walk cap was full of idle holds.** The current log had 465 refusals and the previous log
  150. Four slots were taken by held hosts while a dozen more sessions waited.
- **Browser launchers outlived their sessions.** Four `node daemon.js` Playwright launchers were
  still running 7–10 hours after their agent sessions ended (parent `launchd`, cwd a `mktemp` dir,
  88–458 MB each). The code in one of them clicks "Resume this preview" every 10 seconds and scrolls
  the page to fake activity, so the walk cap could never free that slot. 29 `chrome-headless-shell`
  processes were running.
- **The preview's own workers.** 263 Turbopack loader-pool children sat in the preview's process
  group, using 9.1 GB of real memory. 258 of them were `webpack-loaders` workers.
- **The machine overall:** load average 266, 394 `node` and 50 `claude` processes, 113 GB of real
  memory in use at 21:52.

## What changed (all live on the shared preview on 2026-10-17)

| Piece | Where |
|---|---|
| Burst slots: 4 normal, up to 8 while memory is spare; extra sessions are paused first, one every 5 s, idle ones first; a session in a normal slot is never paused for memory | `utils/supabase/walkCap.ts` (`judgeMemory`, `decideWalkAdmission`, `shedForMemory`, the memory watch) |
| Six new knobs: `production_burst_cap` 8, `burst_admit_available_gb` 64, `burst_shed_available_gb` 32, `burst_admit_preview_gb` 32, `burst_shed_preview_gb` 40, `hold_idle_expire_minutes` 20 | `migrations/ops_agent_walks_burst_cap_2026_10_17.sql` (applied and ledgered; checksum `8dcace98…`) |
| The machine's memory every 2 s: free+inactive+speculative+purgeable, macOS pressure level, swap, and the preview's own real memory | `write_memory_snapshot` in `scripts/agent-harness/stale-sessions.sh`, written by the watchdog into `<state dir>/memory` |
| A hold names the process that took it and ends when that process exits, when its pid is reused, or after 20 min with no signed-in request (the walk cap touches the hold file on each one) | `cmd_hold` / `prune_holds`, `heldPreviewHosts`, `heartbeatHold` |
| Orphaned Playwright browsers (launcher gone, 2 min grace, no client on the debugging port) are closed, and so are detached Playwright launchers from temp dirs or this checkout that are older than 180 min. Nothing outside those markers is touched | `sweep_orphan_browsers` |
| Every cleanup logged | `<state dir>/cleanup.log` plus `[preview] CLEANUP:` lines in the dev log |
| `pnpm preview:status` shows machine memory, the walks (normal or extra, held, last request), the watchdog revision, browsers due to be closed, and cleanups from the last 24 h | `status_capacity` |
| `pnpm preview:sweep [--dry-run]` and `pnpm preview:monitor-repair` (replaces an old watchdog without restarting the server) | `scripts/agent-dev-server.sh` |
| The refusal page and the parked page say why: which slots are taken, whether extra slots are open and why not, and "paused to free memory" | `refusalPage`, `parkedPage` |

### Live evidence (shared preview, 2026-10-17 22:21–22:45)

- The rev-2 watchdog replaced the old one without a server restart (`cleanup.log` 22:21:03).
- Seven sessions were admitted into extra slots (one of them swapped in for an idle session while memory was tight), for example `ADMITTED s96c6068c… into an EXTRA slot —
  … 125 GB of memory is free and the preview uses 11 GB`.
- Four extra sessions were shed when the preview reached 40 GB: `SHED l8-editor… (extra slot) —
  the preview server uses 40 GB (extra slots close at 40 GB)`. The walks then went back to 4.
- Four stale holds ended. For example, `hold speed-test-census ended: its host made no signed-in
  request for 47 min`.
- One real orphaned browser was closed: `closed Playwright browser pid 18109: its launcher is gone
  (orphaned 2 min, up 02:13)`.

### Tests (forcing, deterministic clock, fail before and pass after)

- `pnpm jest utils/supabase/walkCap.test.ts`: 55 pass. The 18 new tests cover the memory judgement,
  burst admission, never growing when memory is tight, shed order, base hosts never shed, the knob
  reader, a hold whose owner is gone, and the refusal page and log. Against the old `walkCap.ts`,
  15 fail.
- `node --test scripts/preview-stale-sessions.test.mjs`: 12 pass, using real processes and a fake
  Playwright dir. They cover a hold ending with its owner, pid reuse, idle expiry, an orphan closed
  after its grace, the dry run, a client on the debugging port, detached launchers inside and
  outside scratch dirs, the memory reading, the watchdog file, and status. Against the old script,
  10 fail.
- `node --test scripts/preview-recycle.test.mjs scripts/preview-ready.test.mjs`: 42 pass, unchanged.

## Still open (outside this change)

Items 1 and 4 are answered by the machine guard (2026-10-17, [machine-guard.md](./machine-guard.md));
item 3 is measured there and needs a ruling.

1. **Nothing watches the runaway jobs that dominate every jetsam event.** These are single
   node/Python processes at 28–112 GB outside the preview: local builds and batch jobs. The new
   memory reading would let a machine-wide sentinel name the top runaway and stop it. That needs an
   owner's ruling on what it may stop.
2. **`fseventsd` reached 50.2 GB** at the 10-17 event. This usually means very heavy file churn,
   such as relinked node_modules, build caches, or many checkouts being watched.
3. **The preview's loader pool:** 258 `webpack-loaders` children using 9.1 GB. In dev,
   `next.config.js` `withPendingImportRescue` sends every file that mentions `@ai-matrx/` through a
   webpack loader, which brings back the child-process pool that the native React Compiler switch
   had removed (2026-10-15).
4. **Scratch walk daemons that auto-press Resume** defeat the walk cap. The sweep closes them only
   once they are detached and older than 180 min.
5. The preview grows from 11 GB to 47 GB in about 25 minutes when eight sessions compile different
   routes. The 40 GB shed line holds the walks at 4 from there, but the 48 GB restart still follows
   for everyone. That is the Next dev server's nature (compiled routes are never released), not a
   leak in this code.
