# Idle Mischief — When No One Is Watching

> Inspired by *Toy Story*: when the user looks away, the UI elements come alive. The moment they return — everything snaps back, perfectly composed.

## Status
- **Phase:** v0.1 — initial implementation, dev-gated.
- **Mount:** `IdleMischiefProvider` is mounted globally inside `app/Providers.tsx`. Renders the orchestrator (no DOM) plus a Wand2 dev trigger that's only visible in `NODE_ENV=development` or when admin debug-mode is on.
- **Visibility on prod for real users:** none. The dev button is gated; the orchestrator does nothing visible until a queued act fires, and acts are disabled if `prefers-reduced-motion: reduce` or `NEXT_PUBLIC_DISABLE_MISCHIEF=1` is set.

## Why this exists
AI Matrx is becoming an *ambient* AI — present in sidebars, floating windows, bubble overlays, mid-page panels. Personality, not just polish, makes ambient interfaces feel alive. This feature gives the UI a quiet, secret life that emerges only when no one's watching, and disappears the instant attention returns.

## Architecture

Three-layer system, all under `features/idle-mischief/`:

1. **Detection** — `hooks/useIdleDetection.ts` listens to mouse/keyboard/scroll/touch and tracks idle seconds. `visibilitychange` pauses (does not reset) the clock.
2. **Acts** — `acts/Act01Tremor.ts` … `acts/Act07Carnival.ts`. Each act is an imperative function: `() => () => void`. Call to play; the returned function is its cleanup. Acts use `motion`'s `animate()` API directly on real DOM elements found via `utils/targets.ts`.
3. **Restoration** — `utils/snapBack.ts` keeps a `WeakMap` of original transforms/opacities so the orchestrator can roll real DOM back to baseline in one frame. Portal-mounted overlays (eyes, snowflakes, walking legs) just unmount.

The orchestrator (`components/MischiefStage.tsx`) is the only stateful piece. It:

- Watches `idleSeconds × settings.speed` against `ACT_QUEUE` thresholds (8s → 14s → 22s → 32s → 45s → 60s → 90s).
- Plays one act at a time. When the act ends naturally, advances the playhead.
- On any user activity (idleSeconds drops to 0), fires snap-back of the running act.
- On `triggerAct(id)` from Redux, plays that specific act immediately (manual override path used by the dev panel and Cmd+Shift+M shortcut).

### The 7 Acts

| # | Act | Threshold | Effect |
|---|---|---:|---|
| 1 | Tremor | 8s | Tiny ~1px jitter on a single random visible button (1.4s) |
| 2 | Wiggle | 14s | Up to 6 visible buttons gently float and bob (4s) |
| 3 | Eyes | 22s | Two sidebar icons morph into a pair of cartoon eyes that blink and track the cursor (5s) |
| 4 | Walking Sidebar | 32s | The sidebar grows SVG legs and walks a sine-wave path across the viewport, then rubber-bands home (5.5s) |
| 5 | Snow | 45s | 70 snowflakes fall from the top of the viewport (6s) |
| 6 | Tower Collapse | 60s | All open WindowPanels topple like blocks, then bounce back into place (3.5s) |
| 7 | Carnival | 90s | Wiggle + Eyes + Snow simultaneously (6.5s) |

## How acts target real UI

- **Windows** → `WindowPanel.tsx` carries `data-mischief-window={id}` on its root. `findWindowEls()` queries that attribute.
- **Sidebar** → `Sidebar.tsx` carries `data-mischief-sidebar=""` on the root `<aside>`. `findSidebar()` queries that attribute (with a fallback to `aside.shell-sidebar`).
- **Buttons / icons** → discovered live via `findButtons()` / `findSidebarIcons()` filtered to in-viewport, visible elements. No data attributes needed.

## Dev controls

- **Wand2 button** (bottom-right, dev only): single-click → start Act 1. Shift-click → open dev panel.
- **Dev panel**: jump to any act, change speed (0.25x–4x), toggle loop, hard "snap back now."
- **Keyboard shortcut**: `Cmd+Shift+M` (Mac) / `Ctrl+Shift+M` — same as single-click on the button.

## Disable paths
- OS reduced-motion preference → fully disabled.
- `settings.enabled = false` (set via dev panel) → fully disabled.
- `NEXT_PUBLIC_DISABLE_MISCHIEF=1` env var → fully disabled (intended for Playwright/CI).

## Files

- `IdleMischiefProvider.tsx` — global mount; wires keyboard shortcut and renders stage + dev button
- `state/idleMischiefSlice.ts` — RTK slice (status, currentAct, manualTrigger nonce, settings)
- `hooks/useIdleDetection.ts` — activity listeners + idle tick
- `hooks/useReducedMotion.ts` — `prefers-reduced-motion` watcher
- `components/MischiefStage.tsx` — orchestrator
- `components/MischiefDevButton.tsx` — Wand2 trigger
- `components/MischiefDevPanel.tsx` — full dev panel
- `acts/Act01Tremor.ts` … `acts/Act07Carnival.ts` — choreography
- `acts/index.ts` — id → player map
- `utils/targets.ts` — DOM target discovery
- `utils/snapBack.ts` — original-state remembering + cleanup registry
- `utils/throttle.ts` — leading-edge throttle for activity events
- `constants.ts` — schedule, durations, throttle interval
- `types.ts` — shared types

## Edits to existing files
- `app/Providers.tsx` → mounts `<IdleMischiefProvider />`
- `lib/redux/rootReducer.ts` → registers `idleMischief` slice
- `features/window-panels/WindowPanel.tsx` → adds `data-mischief-window={id}` (no behavior change)
- `features/shell/components/sidebar/Sidebar.tsx` → adds `data-mischief-sidebar=""` (no behavior change)

## Change Log
- 2026-05-05: Initial implementation. 7 acts, dev panel, keyboard shortcut, reduced-motion gate.
