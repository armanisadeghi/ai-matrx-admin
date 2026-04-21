# Phase 0 — Theme: Union of Capabilities

> Read-only. Produced 2026-04-20. Phase 1 theme migration must preserve every capability catalogued here (Constitution VIII — union-of-capabilities target). Regressions must be explicitly flagged + justified, not accidental.

Sources audited (all files read in full on 2026-04-20):

- `hooks/useTheme.ts` — 74 lines, `useSyncExternalStore` variant
- `styles/themes/ThemeProvider.tsx` — 87 lines, Redux+Context variant (also exports a second `useTheme`)
- `features/shell/components/ThemeScript.tsx` — 44 lines, server component (exists but **not rendered anywhere**)
- Inline `<script>` block in `app/layout.tsx` lines 40–45
- `app/layout.tsx` `<html>` attributes (lines 25–31)
- `styles/themes/themeSlice.ts` — Redux state (the canonical source of truth today)

---

## 1. Capabilities the current system delivers

Each row: **C-n — capability**, where implemented today, and whether Phase 1 preserves it.

### Persistence & reading

| ID  | Capability | Implemented in | Phase 1 disposition |
|-----|------------|----------------|---------------------|
| C-1 | Persist mode across reloads via `localStorage` (key `'theme'`) | `hooks/useTheme.ts` (`applyTheme`), `ThemeProvider.tsx` (implicit via cookie path) | **Preserved**, key renamed to `'matrx:theme'` with one-shot migration of the legacy key. |
| C-2 | Persist mode via `cookie` (`theme=<mode>;path=/;max-age=31536000`) | `hooks/useTheme.ts:15`, `ThemeProvider.tsx:46` | **Phase 1 regression, Phase 3 restoration.** Phase 1 stops writing the cookie; server still reads it if present but falls back to `"dark"`. No user-visible behavior change because localStorage via SyncBootScript is the pre-paint source. D8 (Phase 3) formalizes the cookie write as a sync-engine concern. Justified: keeping parallel cookie writes during Phase 1 would violate Constitution II (one canonical implementation) for 4–6 weeks. |
| C-3 | Read cookie server-side into `<html data-theme={theme}>` (SSR handoff) | `app/layout.tsx:23,27` | **Preserved in Phase 1** (layout unchanged at the server-read level); becomes first-class via D8 in Phase 3. |
| C-4 | Read DOM state (`document.documentElement.classList.contains('dark')`) as initial hook snapshot on client mount | `hooks/useTheme.ts:7–10,52–57` | **Dropped.** No consumer reads from the hook; the only two callers (`DeferredSingletons`, `ThemeProvider`'s own export) are being removed. Canonical read becomes `useAppSelector((s) => s.theme.mode)`. No regression. |

### Pre-paint / FOUC prevention

| ID  | Capability | Implemented in | Phase 1 disposition |
|-----|------------|----------------|---------------------|
| C-5 | Apply `.dark` class on `<html>` before first paint based on stored preference | Inline `<script>` in `app/layout.tsx:40–45` | **Preserved** via `SyncBootScript` + `prePaint` descriptor (policy A15). |
| C-6 | Fallback chain when no stored preference: **localStorage → cookie → `matchMedia('(prefers-color-scheme: light)')` → default dark** | Inline script in `app/layout.tsx:43` | **Partial regression in the descriptor as currently specified — needs a design fix.** See §3 below. |
| C-7 | `suppressHydrationWarning` on `<html>` to accept the server/client theme mismatch | `app/layout.tsx:30,41` | **Preserved.** |
| C-8 | Set `data-theme` attribute on `<html>` for CSS-attribute selectors that may key off it | `app/layout.tsx:27`, `hooks/useTheme.ts:14`, `ThemeProvider.tsx:47` | **Preserved** via an additional `PrePaintDescriptor` of `kind: "attribute"` (the shape already supports this). Needs to be added to `themePolicy.prePaint` — currently the design doc only specifies the `classToggle` form. See §3. |

### Runtime mutation

| ID  | Capability | Implemented in | Phase 1 disposition |
|-----|------------|----------------|---------------------|
| C-9  | `setMode(mode: 'light' \| 'dark')` Redux action | `themeSlice.ts:21–23` | **Preserved verbatim.** |
| C-10 | `toggleMode()` Redux action | `themeSlice.ts:18–20` | **Preserved verbatim.** |
| C-11 | Side-effect on mode change: write cookie + `data-theme` attr + `.dark` class | `ThemeProvider.tsx:44–50`, `useTheme.ts:12–17` | **Partially preserved.** `.dark` + `data-theme` become responsibilities of the sync engine's pre-paint + runtime rehydrate path (driven by `setMode`/`toggleMode` being in `broadcast.actions`). Cookie write: dropped in Phase 1 (see C-2). |
| C-12 | `setTheme(v)` updater-function form (`setTheme(prev => ...)`) | `hooks/useTheme.ts:59–65` | **Dropped — no consumers.** Grep: zero call sites use the function form. |
| C-13 | Return `systemTheme` from the hook | `hooks/useTheme.ts:71` | **Dropped — no consumers.** |
| C-14 | Return `resolvedTheme` (alias for `theme`) from the hook | `hooks/useTheme.ts:70` | **Dropped — no consumers.** |

### Cross-surface coherence

| ID  | Capability | Implemented in | Phase 1 disposition |
|-----|------------|----------------|---------------------|
| C-15 | Multiple hook instances share a single source of truth (module-level external store) | `hooks/useTheme.ts:20–40` | **Preserved by construction** — Redux is the single source of truth after migration; every consumer selects from it. |
| C-16 | Cross-tab sync (toggle in tab A → all open tabs update) | **Not implemented today.** | **Gained in Phase 1** via `ui-broadcast` behavior of `boot-critical` preset. |
| C-17 | Peer hydration on new tab (instant theme without reading localStorage) | **Not implemented today.** | **Gained in Phase 1.** |

### System-preference handling

| ID  | Capability | Implemented in | Phase 1 disposition |
|-----|------------|----------------|---------------------|
| C-18 | First-visit system preference detection: `matchMedia('(prefers-color-scheme: light)')` removes `.dark` class | Inline script, lines 43; `ThemeProvider.tsx:37–41` | **Regression risk — descriptor as currently specified does not support this.** See §3. |
| C-19 | Live reaction to OS dark-mode toggle when user has no explicit preference | **Not implemented today** — the matchMedia check runs once on first script execution; no MQ subscription. | **Not a regression.** Matches current behavior. |

### Default & safety

| ID  | Capability | Implemented in | Phase 1 disposition |
|-----|------------|----------------|---------------------|
| C-20 | Default mode = `'dark'` when everything else fails | `themeSlice.ts:11`, `hooks/useTheme.ts:21,35`, inline script final `else` branch | **Preserved.** |
| C-21 | Try/catch around every localStorage access (private mode / quota) | `hooks/useTheme.ts:16`, inline script `catch(e){}` | **Preserved** via `lib/sync/persistence/local-storage.ts` adapter. |

---

## 2. Capabilities that are NOT being dropped but are being consolidated

- The `hooks/useTheme.ts` module-level external store and the `ThemeProvider` Context both solved the "multi-consumer consistency" problem. Redux already provides this for free. The consolidation is pure win — fewer layers, same guarantee (C-15).
- The `ThemeScript.tsx` component (44 lines, never imported) and the inline script in `app/layout.tsx` (5-line minified duplicate) both solve the pre-paint problem. One `SyncBootScript` generated from the policy registry replaces both. Pure win.

---

## 3. Design gaps in `PrePaintDescriptor` that Phase 1 must close

These are real holes in the descriptor shape as specified in `phase-1-plan.md` §5.4 at the moment this audit is being written. They need to be resolved before the Phase 1 code lands.

### Gap G-1 — System-preference fallback (C-18)

**Problem**: The current inline script honours `matchMedia('(prefers-color-scheme: light)')` on first visit when no `theme` value is stored. The descriptor shape as specified has no way to express "if no stored value, consult a media query to decide."

**Proposed extension** to `PrePaintDescriptor` (`classToggle` variant), additive, backwards compatible:

```ts
type PrePaintDescriptor =
  | {
      kind: "classToggle";
      target: "html" | "body";
      className: string;
      fromKey: string;
      whenEquals: string;
      // NEW: fallback when storage is empty or malformed.
      systemFallback?: {
        mediaQuery: string;       // e.g. "(prefers-color-scheme: dark)"
        applyWhenMatches: boolean;  // true = add class when MQ matches, false = remove
      };
    }
  | { kind: "attribute"; /* ... unchanged ... */ };
```

For theme:

```ts
prePaint: {
  kind: "classToggle",
  target: "html",
  className: "dark",
  fromKey: "mode",
  whenEquals: "dark",
  systemFallback: {
    mediaQuery: "(prefers-color-scheme: dark)",
    applyWhenMatches: true,
  },
}
```

### Gap G-2 — Multiple descriptors per policy (C-8 alongside C-5)

**Problem**: `themePolicy` needs to both (a) toggle `.dark` class AND (b) set `data-theme` attribute. The current shape allows only one `prePaint` descriptor.

**Proposed extension**: accept either a single descriptor or an array:

```ts
interface PolicyConfig<TState> {
  // ...
  prePaint?: PrePaintDescriptor | readonly PrePaintDescriptor[];
}
```

For theme:

```ts
prePaint: [
  {
    kind: "classToggle",
    target: "html",
    className: "dark",
    fromKey: "mode",
    whenEquals: "dark",
    systemFallback: { mediaQuery: "(prefers-color-scheme: dark)", applyWhenMatches: true },
  },
  {
    kind: "attribute",
    target: "html",
    attribute: "data-theme",
    fromKey: "mode",
    allowed: ["light", "dark"],
    default: "dark",
  },
]
```

### Gap G-3 — Default for empty storage in `classToggle`

**Problem**: `classToggle` has `whenEquals` but no `default`. When storage is empty and `systemFallback` is absent, behavior is undefined in the current spec.

**Proposed resolution**: define the semantics explicitly — if storage empty and no `systemFallback`, the class is **removed** (i.e., descriptor is a no-op). Document in the descriptor's TSDoc.

---

## 4. Capabilities explicitly flagged as Phase 1 regressions (transient)

- **Cookie write on mode change (C-2, C-11).** Dropped in Phase 1. Restored formally in Phase 3 (D8). Duration of regression: Phase 1 → Phase 3. User-visible impact: none (localStorage drives pre-paint; server only reads cookie as a best-effort hint that is overridden by SyncBootScript within the same frame).

No other regressions.

---

## 5. Consumers to migrate in Phase 1

Exhaustive list. Grep command used: `grep -rEn "useTheme|ThemeProvider|ThemeScript|preferencesMiddleware" app/ components/ features/ hooks/ lib/ styles/ providers/ --include='*.ts' --include='*.tsx'`

Top-level consumers (excluding the files being deleted themselves):

- `app/DeferredSingletons.tsx` — imports `useTheme` from `hooks/useTheme.ts`. Migration: replace with `useAppSelector((s) => s.theme.mode)`.
- `app/Providers.tsx` — wraps app in `<ThemeProvider>`. Migration: remove the wrapper entirely.
- `lib/redux/middleware/preferencesMiddleware.ts` itself — standalone deletion.
- `app/layout.tsx` — inline script + `className="dark"` — edited per Phase 1 plan.

Anything else discovered at deletion time gets added to `phase-1-verification.md`'s CHANGELOG section.

---

## 6. Open questions for Arman

1. Gaps G-1, G-2, G-3 need the descriptor extensions above before Phase 1 code lands. I'll edit `phase-1-plan.md` §5.4 to reflect them as part of the "Phase 1 deltas" step. **Confirm** these extensions are acceptable or propose alternatives.
2. `data-theme` attribute (C-8) — do any CSS selectors in the codebase actually key off `[data-theme="..."]`? If yes, G-2 must ship. If no, we can drop the attribute entirely and simplify to a single `classToggle` descriptor. Quick grep answer, flagging for confirmation.
3. Cookie-write regression (C-2) — acceptable for Phase 1→3 window? The alternative is a tiny `cookieMirror` side-effect hook in Phase 1 just for `boot-critical` policies, but that's one extra feature-scope creeping into Phase 1.

---

## 7. TL;DR

The current theme system has **21 catalogued capabilities**. Phase 1 preserves 16, gains 2 (cross-tab sync, peer hydration), drops 3 unused (`resolvedTheme`, `systemTheme`, `setTheme` updater form), and deliberately regresses 1 (cookie write, restored in Phase 3). Three descriptor-shape gaps (G-1, G-2, G-3) must be resolved in the design doc before Phase 1 code lands.
