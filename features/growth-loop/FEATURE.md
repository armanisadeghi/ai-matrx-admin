# Growth Loop — the map of the pipeline, and the run object that drives it

**Tier:** 2 · **Routes:** `/administration/knowledge/growth-loop` (admin
map) · `/how-it-works` (public, the long read) · `/loop` (public, above the fold) ·
`/marketing/brands/[brandId]/sites/[siteId]/growth-loop` (a site's live loop) ·
`/marketing/growth-loop/[loopRunId]` (canonical deep link, resolves to the site)

This feature is three halves. `map/` is the **map** — what the pipeline is and where it is
broken. `public/` is the **customer-facing face of that same map**. `run/` is the **run
object** — one durable loop for one site, moving through the same twelve stages. They share
ONE stage vocabulary (`map/loop-map.ts`); no other half ever names a stage of its own.


Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/marketing/growth-loop/FEATURE.md — read it before touching this feature in ANY repo.

The loop's meaning (the twelve stages, THE THREE PIPES, open gaps, autonomy, settled defaults) lives in that node and its `VISION.md`; gap campaign: `common-docs/projects/growth-loop-gaps/PLAN.md`. This file holds only the code-path rules below.

## 🚨 `map/loop-map.ts` is the single source of truth

`features/growth-loop/map/loop-map.ts` holds the stages, connections, per-pipe status and the
`G-*` gap register. **It is the ONLY place any of those statuses live** — the cross-repo docs
point here and never restate them.

Rules (also stated at the top of the file):

1. A `state` other than `"missing"` carries a `ref` an auditor can open and verify. Status
   reflects **live code**, never intent.
2. **Filling a gap = flipping its pipe state in `loop-map.ts` in the same change as the code.**
3. Never delete a gap id — close it with `status: "closed"` and an `evidence` path.
4. A scheduled Codex auditor re-derives this from live code and will re-open a gap whose
   evidence doesn't hold (`common-docs/systems/marketing/growth-loop/CODEX_OPERATOR.md`).

## Structure

| File                                                        | Role                                                                          |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `map/loop-map.ts`                                           | Pure data + helpers. No React, no imports from the app.                       |
| `components/GrowthLoopCanvas.tsx`                           | The ONE `next/dynamic({ ssr: false })` front door.                            |
| `components/GrowthLoopCanvasImpl.tsx`                       | React Flow canvas + custom stage node + detail rail.                          |
| `features/canvas/edges/rounded-orthogonal-path.ts`          | Shared rounded waypoint path builder used for collision-free fixed-map lanes. |
| `app/(admin)/administration/knowledge/growth-loop/page.tsx` | Admin route.                                                                  |
| `public/GrowthLoopStory.tsx`                                | The public page body. Server component — every word is in the server HTML.    |
| `public/GrowthLoopRing.tsx`                                 | The loop drawn as a ring. The page's ONE client island; inline SVG, no deps.  |
| `public/stage-cards.ts`                                     | The resolved public stage model, shared by the ring and the cards.            |
| `public/stage-icons.ts`                                     | Lucide icon NAME -> component, so `loop-map.ts` stays React-free.             |
| `app/(public)/how-it-works/page.tsx`                        | Public route (+ metadata / OG).                                               |
| `public/GrowthLoopGlance.tsx`                                | The above-the-fold page body. Same data, a fraction of the words.             |
| `app/(public)/loop/page.tsx`                                | Above-the-fold public route (+ metadata / OG).                                |
| `run/api.ts`                                                | Direct Supabase reads; contract-bound aidream orchestration actions.          |
| `run/hooks.ts`                                              | React Query bindings + the delta-poll of the loop's event ledger.             |
| `run/stage-doors.ts`                                        | Ref-kind → URL, and stage → "where a human does this". THE DOOR LAW.          |
| `run/components/`                                           | Workspace, stage rail, blocker card, ledger.                                  |

## The run object — rules

- **Reads go direct to Supabase.** `run/api.ts` reads the invoker-safe
  `growth.v_loop_state`, `growth.loop_stage_run`, and `growth.loop_event` under the caller's
  JWT. Actions go to aidream because they orchestrate work. Never add a fallback ladder or
  route a plain read back through Python.
- **Starting is explicit and idempotent.** One live loop per site is a DB partial unique
  index, so the button needs no guard: a second click returns the same loop.
- **The pipe defaults are aidream's, never the client's.** `pipe_policy` is omitted on start
  so `growth_loop/pipes.py default_policy()` decides — human first, AI after an hour, with
  realize/serve/crawl/measure pinned to code. Never restate that policy here or in the UI.
- **A running loop is never a spinner.** An active loop re-reads its state and delta-polls its
  ledger on the gap-free `after_seq` cursor; a settled loop stops polling entirely.
- **Every ref kind is a compile-time obligation.** `Record<StageRefKind, …>` in
  `run/stage-doors.ts` means a kind added on the server fails the build here rather than
  rendering an id nobody can open. A kind with no viewer shows its label and no id.
- **Quality is history, never a gate.** Completed attempts are re-read alongside the
  gap-free event delta because aidream scores only after it advances. The completion line
  updates in place from `Scoring…` to `<score>/100` (or a loud failure), shows the judge's
  reasoning, and links to the referenced artifact. Internal run kinds with no viewer fall
  back to that stage's working surface, so a weak score is never a dead end.
- **An unmeasurable page is an outcome, not a dead loop.** A completed measure attempt whose
  server outcome is `terminal_unmeasurable` renders the affected page through the canonical
  `web_page` `EntityRef`, explains the PageSpeed reason and quarantine expiry, and offers one
  click to the canonical `seo.release_page_measurement_quarantine` RPC. The client never
  classifies provider errors or invents a second release path.

## The public view — rules

**Two public pages, one map, deliberately different jobs.** `/how-it-works`
(`GrowthLoopStory`) is the long read — every step explained. `/loop`
(`GrowthLoopGlance`) is the above-the-fold pitch: the loop is the first thing on the
screen, it ends at the fold on a desktop, and nothing is said in a sentence that a
label can say. Neither replaces the other, and **neither may fork the data** — both
render `publicStages()` / `publicCapabilities()` / `publicStanding()` and share the
one ring (`GrowthLoopRing`, `variant="story" | "glance"`). New public face? Add a
variant, never a second copy of the stages.

Both are presentation only over the SAME `loop-map.ts`: they select, rename and derive.
Neither ever restates a stage.

- **THE HONESTY GATE.** Capability is derived from `state === "live"` ONLY (`publicCapabilities`
  / `publicStanding`). `partial` and `missing` render NOTHING — a stage with no live pipe simply
  shows no chips. The only way to make the marketing page claim a capability is to flip a pipe
  here, which rule 1 says requires a `ref` an auditor can open. **Never add a fallback.**
- **`publicInfo` is the show-publicly flag.** A stage without one never renders publicly. Its
  copy rules (no jargon, no internal stage names, one sentence, never intent) are on the type.
- **The chips say CAN, never DOES.** The code pipe means "runnable unattended", not "fires by
  itself" — writing it as "it happens automatically" contradicted Publish, whose selling point
  is that nothing goes live unapproved.
- **Ring geometry is rounded at the source.** Every coordinate in `GrowthLoopRing` goes through its `percent()` helper (3 decimals); raw trigonometry serializes differently on the server and the client and logs a hydration mismatch.
- **Public header sizing lives in ONE place:** `components/matrx/publicHeaderChrome.ts` (44px touch targets on a phone, the shell's height on a pointer).
- **What never crosses over:** file paths, `ref`s, gap ids, lanes, repo names, maturity, and the
  words "partial" / "missing".
- **No React Flow.** A fixed twelve-node ring needs no graph engine, and a pan/zoom canvas is the
  wrong product on a phone. The ring is inline SVG + real `<button>`s, so it needs no
  `next/dynamic` boundary at all; it is hidden below `md`, where the numbered cards are the
  mobile presentation of the same sequence.

## Doctrine

- **Code-splitting:** React Flow is heavy and browser-only. It is imported **statically inside
  the Impl**, which sits behind exactly one dynamic front door — per the `code-splitting` skill,
  rule 3. The surface is registered in `eslint.config.mjs`'s `reactFlowStaticImportBan` comment
  block; the two import lines carry justified disables. Never add a second boundary here.
- **Reuse-first:** the map reuses the repo's React Flow conventions (`OrchestraBuilderCanvasImpl` as the
  exemplar), semantic color tokens, and the admin route/nav registration pattern. It introduces no
  new graph library, no new state store, and no new suggestion or status system.
- **No dead ends:** every pipe entry renders its `ref` path so a reader can go straight to the
  code. When a gap gains an owner, its lane is shown on the gap card.
- **Collision-free routing:** every connection owns a unique source and target handle. The two
  cross-loop feedback connections use explicit outer lanes through the shared rounded orthogonal
  path builder; adding an unconfigured edge fails loudly instead of falling back to overlapping
  automatic geometry. Clicking a stage traces its immediate incoming and outgoing connections,
  emphasizes the connected stages, and suppresses unrelated paths.
