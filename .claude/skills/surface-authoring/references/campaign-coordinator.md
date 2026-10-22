# Surface campaign — coordinator brief

Give this to ONE fresh, top-level session. A child session can hit the platform's session-lineage
depth limit and then cannot dispatch anyone. The coordinator builds nothing itself: it keeps the list
true, assigns batches, and checks results. Worker brief: [campaign-worker.md](./campaign-worker.md).
Open platform gaps: `docs/handoffs/surface-campaign.md`.

**Workers work by page, through `page-pass`** (2026-10-22). A route is the unit: dispatch each
worker with [`.claude/skills/page-pass/loop/worker-brief.md`](../../page-pass/loop/worker-brief.md),
its lane, and its routes; page-pass step 4 is where a surface's emitter, write targets, guide and
probe proof get built, and it sends the worker to [campaign-worker.md](./campaign-worker.md) for
the surface mechanics. Grade finished pages with the blind
[`judge-brief.md`](../../page-pass/loop/judge-brief.md). This brief still owns the list, the waves
and the definition of done below; the census picks the routes.

## Goal

Every registered surface is agent-readable. While a user is on it, the "This page" window (formerly Surface Context) names
it and shows every piece of data the page loads, proven on the live site with real data. The
campaign ends when the census says so, not when workers say so.

## Coordination contract

- The census identifies implementation leads; it does not certify behavior. A missing static
  emitter match must be checked against the consuming package and a runtime probe.
- Autonomous fleet claims use Work Loop. Only campaign cloud workers without that tool use
  the worker brief's six-hour SQL fallback; never mix claim systems.
- Each assigned worker fixes reviewer findings in the same assignment and returns the
  entrypoint's integration receipt. Independent certification belongs to `surface-check`.
- Workers prove changed code on the live site after the release carrying it (about 30 minutes);
  the managed localhost preview is only a fix-and-look loop while building. A worker that cannot
  yet see its commit live reports the release boundary.
- Prefer focused direct transactional sync plus full live check; the worker brief defines the
  conditional SQL fallback and exact receipt when a check cannot run.
- The completeness pass starts from rendered components, not manifest vocabulary.

## The list

`pnpm surface:census` (about a minute, no network) prints, per surface:
- derived readiness (from the fleet metric; the census no longer reads a typed field);
- host (route or overlay);
- value count;
- whether anything EMITS it, and how the census knows (`detectedBy`): `builder` = the manifest's
  `create…Scope` has a call site outside the manifest, in this repo or inside the installed
  `@ai-matrx/chat` package; `name` = a file that mounts a surface runtime names the surface;
  `none` = nothing found;
- write-target count, whether a guide exists, and how many values carry a context budget.

A `name` detection is weaker than a `builder` one: probe it before trusting it. Treat "not
emitting" as a lead and confirm with a probe; teach the census when it is wrong.

`pnpm surface:census --sql` prints a read-only query. Run it through the Supabase MCP (`project_id`
`brsgrqvjdzwihsvnfqkf`); it lists every surface whose DB mirror disagrees with code, plus DB rows
with no manifest.

Run both at the start of every wave, and publish the wave table in your report: surface, facts,
assigned worker, result. Until the handoff "The admin board should compute status" makes `/administration/ui/surfaces` compute this
itself, the census IS the board.

## Waves

**Wave 0 — remove shared blockers before fan-out.** Compute current counts from the census
and focused mirror checks rather than a historical snapshot.
- `pnpm check:surface-drift` must be green on main. If it's red, fix it first: a red gate stops
  every worker.
- Reconcile assigned Work Loop work; clear expired legacy claims only for the fallback campaign.
- Settle every "declared but not emitting" lead (probe each): either the census learns its emitter or
  the probe records the gap.
- Resolve shared sync credentials or retain a named external boundary with the worker's exact check receipt.

**Each wave:**
1. Pick the next unclaimed surfaces. Order:
   - not emitting, on routes people use;
   - partial, where the note names a missing emitter or values;
   - overlays;
   - the rest.
2. Group them into assignments of 3–5 routes (10–15 surfaces when it is emitter-only work)
   **from the same feature area**. They share
   components, so a worker builds context once, and two workers never edit the same files.
3. When delegation is authorized, dispatch one worker per assignment through the environment
   available to this coordinator, with
   the page-pass worker brief and its run settings filled in (lane, who pushes, routes).
   - Start with 4–6 workers at once. Raise the number when merge conflicts and review findings stay
     low.
   - Local workers share the one managed preview; do not launch additional dev servers.
   - Cloud workers: at most two per 15 GB container. Four workers in one container (each with a
     headless browser, plus the type-check queue) ran it out of memory and restarted it on
     2026-10-22. More workers means more containers (one session each).
4. Workers report through durable state, not messages:
   - assigned Work Loop state, or explicitly bounded legacy claim state;
   - a probe recorded in `last_check` (`pnpm surface:probe --record`);
   - one review-queue row per assignment (lane tag `surface-emitters`);
   - a `REPORT-<name>.md` returned as their final output.

   Use the environment's compact status/wait tools instead of repeatedly waking idle workers.
5. When an assignment finishes:
   - rerun the census;
   - probe two of its surfaces yourself with `pnpm surface:probe`, choosing different routes and
     states than the worker reported;
   - collect every handoff prompt workers wrote into `docs/handoffs/surface-campaign.md` (Future
     section, one item each).
6. Report each wave to Arman in plain English:
   - what is now agent-readable;
   - what is left;
   - what is blocked, and on what.

   No file paths or code names.

## What "done" means for one surface

- Emitting on every route, with no undeclared keys.
- Completeness pass done from the components.
- Runtime/menu evidence against changed code, with the verification host and commit recorded.
- Reviewer findings fixed, or written up as handoffs.
- Focused DB sync and matching full live check passed; integration receipt complete.
- Readiness is derived (never typed): the probe is recorded, and the report names each remaining
  `readinessGaps` line (plus the outside-helper binding test if not yet proven).
