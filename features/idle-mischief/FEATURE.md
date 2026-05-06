# Idle Mischief — When No One Is Watching

> Inspired by *Toy Story*: when the user looks away, the UI elements come alive. The moment they return — everything snaps back, perfectly composed, as if nothing ever happened.

## Status
- **Phase:** v0.2 — bulletproof state foundation, 10 acts, dev-gated.
- **Mount:** `IdleMischiefProvider` is mounted globally inside `app/Providers.tsx`. Renders the orchestrator (no DOM). All visible mischief comes from imperative animation portals.
- **Visibility on prod for real users:** none. Acts are disabled if `prefers-reduced-motion: reduce` or `NEXT_PUBLIC_DISABLE_MISCHIEF=1` is set, or if `settings.enabled` is false. The dev controls live in the admin indicator and only render for admins.

## Why this exists
AI Matrx is becoming an *ambient* AI — present in sidebars, floating windows, bubble overlays, mid-page panels. Personality, not just polish, makes ambient interfaces feel alive. This feature gives the UI a quiet, secret life that emerges only when no one's watching, and disappears the instant attention returns.

## Architecture

Four layers, all under `features/idle-mischief/`:

### 1. The hard rule: never animate a real element

**Acts MUST NEVER call `motion.animate()` (or any animator) on a real DOM element.** This is the single most important invariant in the subsystem. Why:

- `motion` v12 uses the Web Animations API (WAAPI) under the hood.
- WAAPI animations live on a separate compositor layer; they don't write to inline `style.transform` while running.
- When the animation is stopped (`controls.stop()`), motion calls `commitStyles()` then `cancel()` — meaning the **mid-animation transform gets baked into inline style** before the animation is removed.
- Even with surgical inline-style restoration, race conditions and edge cases (CSS transitions on the page that we shouldn't be cancelling, etc.) make "perfectly restore the real element" non-trivial.

The bulletproof solution: clone the element, animate the clone, hide the original. On snap-back, the clone is unmounted and the original's inline style is byte-for-byte restored. Since the real element was never animated, there is nothing to "clean up" on it beyond reverting the `visibility: hidden` we set.

`utils/cloning.ts` exposes `cloneAndHide(el)` which is the only acceptable way to operate on a real element. Every act that touches a real element goes through it.

### 2. Snapshot/restore foundation (`utils/snapshot.ts`)

For the rare cases where we DO mutate a real element (only `visibility: hidden` and `pointer-events: none`, applied by `cloneAndHide`), `snapshot(el)` captures the entire `style` attribute string verbatim, the className, parent, nextSibling, and rect. `restoreElement(el)` puts every byte back. `restoreAll()` does the same for every snapshotted element + registered portal + cleanup callback in one atomic operation.

Crucial: we do NOT cancel `document.getAnimations()` globally. That kills legitimate page animations (CSS hover transitions, focus indicators, third-party libraries) and was making the page look worse than the mischief itself. Per-element subtree cancel is fine; document-wide is destructive.

### 3. Activity-driven snap-back (`components/MischiefStage.tsx`)

While ANY act is running, the orchestrator attaches a **capture-phase, passive** listener for `pointermove`, `pointerdown`, `keydown`, `wheel`, `touchstart` on `window`. The FIRST event fires `restoreAll()` and resets state to `idle`. The listener stays attached for an additional 900ms after the first event, re-running `restoreAll()` (idempotent) on every subsequent event — defensive sweep for any motion straggler. After 900ms, detach.

If you ever see "things stay crooked after I move the mouse," run `__mischiefForceReset()` from devtools (the emergency hatch the orchestrator exposes) and report the act that left state behind.

### 4. Acts (`acts/Act*.ts`)

Each act is an imperative function: `() => () => void`. Call to play; the returned function is the natural cleanup. Acts use `motion`'s `animate()` API exclusively on **clones** (returned from `cloneAndHide()`) or on **portal nodes** (overlays, snowflakes, eyes — created from scratch and registered via `registerPortal()`). Real elements never receive an animation handle.

### The 10 Acts

Order in `ACT_QUEUE` matters — it's the play sequence as idle time grows. Snap-back instantly resets the playhead.

| # | Act | Threshold | Effect |
|---|---|---:|---|
| 1 | **Tremor** | 8s | Tiny ~1px jitter on a single random visible button (1.4s). The first taste. |
| 2 | **Roll Call** | 14s | Every visible button bounces in sequence — like soldiers calling out "Here!" — a wave traveling across the screen (4.5s). |
| 3 | **Wiggle** | 20s | 6 visible buttons gently float and rock in place (4s). |
| 4 | **Eyes** | 28s | A pair of large cartoon eyes appears at the **top-center of the viewport** (NOT inside the sidebar — they were invisible there). They track the cursor, blink twice, drift gently (6s). |
| 5 | **Liquify** | 38s | Up to 12 buttons turn to jelly — fluid skew + scale wobble. Distinct from Wiggle: this is a non-rigid distortion (4.5s). |
| 6 | **Walking Sidebar** | 48s | A `position: fixed` clone of the sidebar (escapes parent overflow:hidden) grows SVG legs and walks across the viewport. Original sidebar fades to opacity 0 during the walk (5.5s). |
| 7 | **Avalanche** | 60s | Every small icon (sidebar nav, header buttons) detaches as a fixed-position clone, falls with gravity easing, scatters horizontally, and piles up at the bottom of the screen with random tilts. Originals fade out (4.5s). |
| 8 | **Snow** | 75s | 90 snowflakes fall from the top of the viewport (6s). |
| 9 | **Tower Collapse** | 90s | All open WindowPanels topple like a stack of blocks, then bounce back (3.5s). |
| 10 | **Carnival** | 110s | Snow + Eyes + Liquify + Roll Call simultaneously (7s). |

## How acts target real UI

- **Windows** → `WindowPanel.tsx` root has `data-mischief-window={id}`. `findWindowEls()`.
- **Sidebar** → `Sidebar.tsx` root has `data-mischief-sidebar=""`. `findSidebar()` + `isSidebarOpen()`.
- **Buttons** → discovered live via `findButtons()` (random sample) or `findButtonsInOrder()` (sequence-preserving for Roll Call).
- **Icons** → `findIconLikeElements()` — small, square-ish visible buttons/anchors (under 80×80, aspect ratio between 0.5 and 2).

## Dev controls

The control surface lives **inside the existing Admin Indicator**, in the **MediumIndicator** panel — alongside the other dev tools. There is no separate floating button; open the admin indicator from the sidebar and ensure it's at medium size.

- **MischiefControls section** — collapsible row in [components/admin/controls/MediumIndicator.tsx](components/admin/controls/MediumIndicator.tsx), rendered by [components/MischiefControls.tsx](components/MischiefControls.tsx). Click the header to expand. Inside:
  - **Play row** — 10 icon buttons, one per act, in the queue's playback order. Tooltip shows the idle threshold.
  - **Snap-back button** — `RotateCcw` icon at the right of the play row. Stops whatever's running and runs `restoreAll()`.
  - **Speed slider** — 0.25x – 4x, scales both idle thresholds and act durations.
  - **Toggles** — Enabled (master kill), Loop (replay queue forever).
  - **Status badge** — header shows current act name with a pulsing dot while playing.
- **Keyboard shortcut** — `Cmd+Shift+M` / `Ctrl+Shift+M` plays Tremor.

## Disable paths
- OS reduced-motion preference → fully disabled.
- `settings.enabled = false` → fully disabled.
- `NEXT_PUBLIC_DISABLE_MISCHIEF=1` → fully disabled (Playwright/CI).

## Files

- `IdleMischiefProvider.tsx` — global mount; wires keyboard shortcut and renders the orchestrator
- `state/idleMischiefSlice.ts` — RTK slice (status, currentAct, manualTrigger nonce, settings)
- `hooks/useIdleDetection.ts` — activity listeners + idle tick
- `hooks/useReducedMotion.ts` — `prefers-reduced-motion` watcher
- `components/MischiefStage.tsx` — orchestrator (renders no DOM)
- `components/MischiefControls.tsx` — control panel embedded in MediumIndicator
- `acts/Act01Tremor.ts` … `acts/Act10Liquify.ts` — choreography (10 acts)
- `acts/index.ts` — id → player map
- `utils/snapshot.ts` — snapshot/restore foundation, portal registry, cleanup registry
- `utils/targets.ts` — DOM target discovery
- `utils/throttle.ts` — leading-edge throttle for activity events
- `constants.ts` — schedule, durations, throttle interval
- `types.ts` — shared types

## Edits to existing files
- `app/Providers.tsx` → mounts `<IdleMischiefProvider />`
- `lib/redux/rootReducer.ts` → registers `idleMischief` slice
- `components/admin/controls/MediumIndicator.tsx` → renders `<MischiefControls />` after the Debug Modules row
- `features/window-panels/WindowPanel.tsx` → adds `data-mischief-window={id}` (no behavior change)
- `features/shell/components/sidebar/Sidebar.tsx` → adds `data-mischief-sidebar=""` (no behavior change)

## Change Log
- 2026-05-05: Initial implementation. 7 acts, keyboard shortcut, reduced-motion gate.
- 2026-05-05: Removed standalone floating Wand2 button; consolidated all dev controls into a collapsible section inside the Admin Indicator's MediumIndicator panel.
- 2026-05-05: v0.2 — verbatim-style-attribute snapshot system, 10 acts, capture-phase activity listener, fixed-position clone for walking sidebar, eyes mount at top-center.
- 2026-05-05: **v0.3 — clone-everything architecture.** The previous "snapshot real element + animate it directly" approach had a fundamental WAAPI race: motion's `controls.stop()` commits the mid-animation transform to inline style before cancelling, and we couldn't reliably restore in all cases. Plus the document-wide `getAnimations().cancel()` was killing legitimate page CSS transitions and leaving the page in a worse state than the mischief itself. Both problems are now eliminated by `utils/cloning.ts::cloneAndHide()`: every act animates a fixed-position clone on `document.body`; the real element only ever has `visibility: hidden` set on it (reverted byte-for-byte by the snapshot). All 10 acts refactored. The "stays crooked after snap-back" class of bug is now architecturally impossible — the real element was never touched, so there is nothing to clean up on it beyond a one-line inline-style revert.
