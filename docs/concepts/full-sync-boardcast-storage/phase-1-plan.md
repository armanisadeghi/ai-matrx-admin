# Phase 1 — Sync Engine Core + Theme Migration

> Scope lock. This doc is the contract for Phase 1. Anything outside this doc is out of scope for Phase 1 regardless of how tempting it is. New scope goes to a future phase or a new decisions entry.

Related: `decisions.md` (principles + roadmap), `phase-0-theme-capabilities.md` (union of capabilities to preserve), `phase-0-rq-audit.md` (drives Phase 7 sequencing), `phase-2-plan.md` (written before Phase 2 execution).

**Changes folded in from Phase 0 (2026-04-20):**

- **G-1** `PrePaintDescriptor` gains optional `systemFallback` ({ mediaQuery, applyWhenMatches, whenMatchesValue? }) on both `classToggle` and `attribute` variants. Honours OS dark/light preference on first visit when no stored value exists. Arman explicitly endorsed this as a best-practice improvement.
- **G-2** `PolicyConfig.prePaint` accepts `PrePaintDescriptor | readonly PrePaintDescriptor[]`. Theme policy ships both a `classToggle` for `.dark` AND an `attribute` for `data-theme` — the latter is required by 9 CSS selectors in `components/rich-text-editor/remirror-editor.css` (grep-verified).
- **G-3** Empty-storage semantics for `classToggle` are now explicit: with `systemFallback`, decide via MQ; without, remove the class. `attribute` variant uses `systemFallback` if present, else `default`. Full evaluation order documented in §5.4.
- **Manifest #24** `styles/themes/ThemeProvider.tsx` is added to the Phase 1 deletion list in `decisions.md` §8.
- **Transient regression accepted** Cookie write on mode change is dropped in Phase 1 and restored in Phase 3 (D8). localStorage via SyncBootScript is the pre-paint source; no user-visible behavior change.
- **D1.1** `jest.config.js.ts` `testEnvironment` flips from `"node"` to `"jsdom"` in Phase 1.
- **D1.5** One-shot legacy key migration (`localStorage['theme']` → `'matrx:theme'`) runs in `bootSync`; covered by `engine.boot.test.ts`.
- **D1.6** `zod` 4.3.6 is already installed — no package.json change for it.
- **D1.8 (added during PR 1.B execution)** Phase 0 undercounted legacy theme consumers (real count: 48 call sites across `hooks/useTheme` + `ThemeProvider`'s context hook + `ThemeProvider` component). PR 1.B now uses a **shim strategy** — the two `useTheme` implementations and the `ThemeProvider` component are replaced with thin adapters that route to the sync-engine-owned Redux state. Call sites migrate in a follow-up PR 1.C (mechanical) and the shim is deleted in PR 1.D. Full plan + consumer manifest: `phase-1b-shim-cleanup.md`. Constitution V/VI compliance is preserved because the migration window is explicitly named and grep-verified on close.

---

## 1. Goals

- Ship the permanent, enterprise-grade sync engine core covering three presets: `volatile`, `ui-broadcast`, `boot-critical`.
- Migrate `theme` as the first real customer of the system.
- Prove correctness with a real multi-tab demo in `(a)`.
- Delete three legacy systems (items 1–3 in the deletion manifest).
- Establish patterns, types, logging, and test approach that all future phases reuse without deviation.

## 2. Explicit non-goals

To prevent Phase 1 from bloating:

- **Not** adding IndexedDB. No `warm-cache` preset, no Dexie. Phase 2.
- **Not** touching `userSlice`, `userPreferences`, or any other slice besides `theme`.
- **Not** removing the SSR preferences fetch. Phase 3.
- **Not** building `autoSave`. Phase 5.
- **Not** touching routes outside `(a)` (the demo route lives in `(a)`, and nothing else changes).
- **Not** building a devtools UI. Phase 12.
- **Not** touching React Query. Phase 7.

## 3. Success criteria

Phase 1 is complete when all of the following pass in a clean browser:

1. **Theme persists across reloads** with zero FOUC in light or dark mode.
2. **Theme syncs across open tabs** in <20ms — toggle in tab A, see it in tabs B/C/D immediately.
3. **Peer hydration works** — open a new tab, its theme matches the existing tabs without reading localStorage.
4. **Graceful degradation** — with localStorage disabled (private mode fallback simulated), the app still boots with default theme; no crash, no console error, no UI lockup.
5. **Identity isolation** — within a single browser profile, two tabs with different `identityKey` values (swap identity at runtime via a dev-only control in the demo) must not receive each other's broadcasts or peer-hydration responses. Different browser profiles are excluded from this test because their storage/channel isolation is a browser guarantee, not code we own.
6. **All deletions from manifest items 1–3 are landed** in the same PR series as Phase 1.
7. **Unit tests** for engine, middleware, and channel pass in isolation without a real DOM.
8. **Real demo route** at `app/(a)/sync-demo/theme/` exercises every success criterion, with a clear UI for toggling and observing all tabs.

No Phase 2 work begins until every item above is green.

## 4. Architecture recap (Phase 1 surface area)

```
lib/sync/
  index.ts                  — Public API surface; only exports allowed from outside
  types.ts                  — Shared types
  messages.ts               — Zod-validated broadcast message schemas
  identity.ts               — Identity key derivation
  policies/
    define.ts               — definePolicy()
    presets.ts              — Preset definitions (Phase 1: volatile, ui-broadcast, boot-critical)
  registry.ts               — syncPolicies[] central registration
  channel.ts                — BroadcastChannel wrapper with typed pub/sub + identity gating
  persistence/
    local-storage.ts        — Synchronous localStorage adapter
    noop.ts                 — No-op adapter for volatile
  engine/
    boot.ts                 — bootSync(store, identity) — sync pre-paint + async hydration
    middleware.ts           — createSyncMiddleware() — broadcast + write-through persist (boot-critical)
    rehydrate.ts            — Rehydrate action type + reducer helper
  logger.ts                 — [sync] prefixed logger
  __tests__/
    engine.boot.test.ts
    engine.middleware.test.ts
    channel.test.ts
    persistence.local.test.ts
    policies.define.test.ts
```

External touch points:

- `app/Providers.tsx` — wires `bootSync()` before render; provides `SyncBootScript` in head.
- `app/layout.tsx` — replace inline theme script with `<SyncBootScript />`.
- `lib/redux/store.ts` — add `createSyncMiddleware(syncPolicies)` to middleware array.
- `styles/themes/themeSlice.ts` — export `themePolicy = definePolicy(...)`.
- `lib/sync/registry.ts` — import and register `themePolicy`.

## 5. Public API (Phase 1)

Entire public surface. Nothing else gets imported from outside `lib/sync/`:

```ts
// Slice-side
import { definePolicy } from "@/lib/sync";
export const themePolicy = definePolicy({ ... });

// Store wiring
import { createSyncMiddleware, syncPolicies } from "@/lib/sync";

// App boot
import { bootSync, SyncBootScript } from "@/lib/sync";
```

### 5.1 `definePolicy(config)`

```ts
type PresetName = "volatile" | "ui-broadcast" | "boot-critical";

interface PolicyConfig<TState = unknown> {
  sliceName: string;            // e.g. "theme"
  preset: PresetName;           // Phase 1 supports three
  version: number;              // bump to invalidate caches + peer offers
  broadcast?: {
    actions: readonly string[]; // exact action.type strings
  };
  // Persisted presets (boot-critical in Phase 1, warm-cache+ in later phases):
  storageKey?: string;          // defaults to `matrx:${sliceName}`; explicit for clarity
  partialize?: readonly (keyof TState)[];     // positive allow-list of keys to persist; absent = persist all
  serialize?: (state: TState) => unknown;     // defaults to identity
  deserialize?: (raw: unknown) => Partial<TState>; // defaults to identity
  // boot-critical only (pre-paint support):
  prePaint?: PrePaintDescriptor | readonly PrePaintDescriptor[]; // see §5.4; serializable, no closures
}

/**
 * Register a sync policy for a slice.
 *
 * WARNING — version bumps destroy client data.
 * Until schema-migration helpers land (Q5, Phase 2/6), incrementing `version`
 * silently discards all persisted + peer-offered data for this slice on every
 * client. Only bump `version` when you accept that cost. Document the reason
 * in a comment on the same line as the bump.
 */
function definePolicy<TState>(config: PolicyConfig<TState>): Policy<TState>;
```

Hard rules (enforced at runtime with dev warnings, throws in dev / silent no-op in prod):

- `boot-critical` MUST declare at least one broadcast action.
- `volatile` MUST NOT declare broadcast actions.
- `volatile` MUST NOT declare `storageKey`, `partialize`, `serialize`, `deserialize`, or `prePaint`.
- `sliceName` must be unique across all registered policies; duplicate registration throws at boot.
- `version` starts at `1`; bumping invalidates all persisted + peer-hydrated data for that slice.
- `partialize` keys must be top-level keys of the slice's state type (checked via TypeScript).

### 5.2 `createSyncMiddleware(policies)`

Standard RTK middleware. Behavior per action:

1. Call `next(action)` first (state update happens before the broadcast or persist step, so both reflect post-reducer state).
2. If the action type is in a broadcast allow-list AND `action.meta?.fromBroadcast` is not truthy, emit on channel.
3. If the action mutates a persisted slice:
   - `boot-critical`: write through synchronously after `next()` — no debounce. Body is the `partialize`-filtered, `serialize`-transformed state.
   - `warm-cache` and later persisted presets (Phase 2+): schedule a debounced write (~100ms) and register a `pagehide` flush. Never applied to `boot-critical`.
4. Incoming channel actions are re-dispatched with `action.meta.fromBroadcast = true` to prevent the middleware from re-emitting them. Metadata never lives on the action root.

### 5.3 `bootSync(store, identity)`

Invoked in `Providers` before children render. **The awaited portion is strictly synchronous localStorage work.** Peer hydration, IDB reads (Phase 2+), and server fallbacks are background work and never block first paint. This is the concrete expression of N5 / O4.

Lifecycle (awaited by the parent):

1. Open `BroadcastChannel("matrx-sync")`.
2. For each `boot-critical` policy: read localStorage synchronously; if present and version matches, dispatch a rehydrate action (`action.meta.fromBroadcast = true` is NOT set — this is a local rehydrate).
3. Register the channel message listener.
4. Resolve. Parent renders.

Fired in the background (NOT awaited):

- Broadcast a `HYDRATE_REQUEST` for broadcast-enabled slices. Responses arrive asynchronously and dispatch rehydrate actions as they come in. There is no 150ms deadline for first paint; there is a 2s deadline only for logging "peer hydration timed out" so the debug panel can show it.

Consequence: a new tab renders immediately from localStorage (if present) or default state. Peer data that arrives later simply updates the visible UI — a known and acceptable one-frame re-render for slices where peer state differs from local. For `theme` specifically, localStorage and peer state always agree after the first toggle in any tab, so the re-render does not occur in practice.

Subsequent phases extend the awaited portion only with other synchronous sources (cookies in Phase 3). IDB and network work is always background.

### 5.4 `<SyncBootScript />`

Server component rendered in `<head>`. Emits a single inline script that, for each `boot-critical` policy with a `prePaint` descriptor:

1. Reads `localStorage.getItem(policy.storageKey)`.
2. Parses the JSON (wrapped in try/catch; fall back to default on any error).
3. Applies DOM mutations **declaratively** based on the descriptor — the script never invokes policy functions, because functions cannot be serialized into an inline `<script>` string.

`PrePaintDescriptor` shape. A policy may declare either a single descriptor or an array; the generator emits one ordered sequence of DOM mutations per policy.

```ts
// Shared by both variants.
interface SystemFallback {
  mediaQuery: string;            // e.g. "(prefers-color-scheme: dark)"
  applyWhenMatches: boolean;     // class variant: true = add class when MQ matches;
                                 // attribute variant: true = set `whenMatchesValue`, else `default`
  whenMatchesValue?: string;     // attribute variant only; value to set when the MQ matches
}

type PrePaintDescriptor =
  | {
      // Sets an attribute on <html>/<body>. Value is resolved by reading `fromKey` from the deserialized payload,
      // falling back to `default` if the key is missing/invalid/storage empty and `systemFallback` either is absent
      // or yields no value for the current OS state.
      kind: "attribute";
      target: "html" | "body";
      attribute: string;          // e.g. "data-theme"
      fromKey: string;             // e.g. "mode"
      allowed: readonly string[];  // whitelist of acceptable values; anything else → default/systemFallback
      default: string;
      systemFallback?: SystemFallback; // G-1; optional
    }
  | {
      // Toggles a class on <html>/<body> based on payload[fromKey] matching a value.
      kind: "classToggle";
      target: "html" | "body";
      className: string;
      fromKey: string;
      whenEquals: string;
      // G-3: semantics when storage is empty or malformed.
      //   - If `systemFallback` is present: use it to decide whether to add or remove the class.
      //   - If absent: class is removed (descriptor behaves as a no-op). Document intent explicitly;
      //     do NOT leave any server-rendered class state untouched.
      systemFallback?: SystemFallback; // G-1; optional
    };
```

Empty-storage evaluation order (G-3, spelled out to remove ambiguity):

1. Try to read `localStorage[storageKey]` and JSON.parse it.
2. If parsing succeeds AND the parsed value has `fromKey` matching an allowed shape → apply the descriptor using that value.
3. Else if `systemFallback` is present → evaluate `matchMedia(mediaQuery).matches` and apply per `applyWhenMatches`.
4. Else → `classToggle`: remove the class; `attribute`: set `default`.

The generator must be idempotent: re-running the script after paint must not mutate the DOM differently than the first run.

For theme, the policy declares an **array** of two descriptors — `classToggle` for the `.dark` class AND `attribute` for `data-theme`, because 9 CSS selectors in `components/rich-text-editor/remirror-editor.css` key off `[data-theme="dark"]` (verified via grep on 2026-04-20). Both descriptors share the same `systemFallback` so OS dark-mode is honoured on first visit.

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
    systemFallback: {
      mediaQuery: "(prefers-color-scheme: dark)",
      applyWhenMatches: true,
      whenMatchesValue: "dark",
    },
  },
]
```

The inline script is generated from the registered policies at render time (a small function in `SyncBootScript.tsx` walks `syncPolicies`, keeps only `boot-critical` policies with `prePaint`, and emits a single string). No per-feature hand-written scripts, ever.

Runtime rehydration (dispatching into Redux) still uses the policy's `deserialize` function — only the pre-paint DOM mutation is restricted to declarative descriptors.

### 5.5 Channel message schema (`messages.ts`)

```ts
type SyncMessage =
  | {
      type: "ACTION";
      identityKey: string;
      sliceName: string;
      version: number;
      action: { type: string; payload?: unknown };
    }
  | {
      type: "HYDRATE_REQUEST";
      identityKey: string;
      nonce: string;
      slices: { sliceName: string; version: number }[];
    }
  | {
      type: "HYDRATE_RESPONSE";
      identityKey: string;
      nonce: string;
      slices: Record<string, unknown>; // sliceName -> state
    };
```

Validation path:

- **Development** (`process.env.NODE_ENV !== "production"`): every inbound message goes through a Zod 4 parser. Invalid = drop + `logger.warn("broadcast.invalid", { message, issues })`.
- **Production**: cheap discriminant check (`typeof msg === "object" && msg !== null && typeof msg.type === "string" && msg.type in validTypes`) plus per-branch shape assertions for the handful of fields we actually read. Invalid = drop silently (logger.debug only).

The Zod schema is the single source of truth — the cheap prod check is generated by hand from it and unit-tested to accept all Zod-valid shapes.

Identity gating: every message carries `identityKey`. Handlers drop any message whose `identityKey` does not match the local identity — dev and prod both.

## 6. Theme migration

### 6.1 Final state of `themeSlice.ts`

Existing reducers and actions are preserved. Adds:

```ts
import { definePolicy } from "@/lib/sync";
import type { ThemeState } from "./themeSlice";

export const themePolicy = definePolicy<ThemeState>({
  sliceName: "theme",
  preset: "boot-critical",
  version: 1, // Bumping destroys persisted theme — see JSDoc on definePolicy.
  broadcast: {
    actions: [
      "theme/setMode",
      "theme/toggleMode",
    ],
  },
  storageKey: "matrx:theme",
  partialize: ["mode"], // Only persist `mode`; anything else (transient UI) stays in memory.
  serialize: (state) => ({ mode: state.mode }),
  deserialize: (raw) => {
    if (raw && typeof raw === "object" && (raw as { mode?: unknown }).mode === "light") {
      return { mode: "light" as const };
    }
    return { mode: "dark" as const };
  },
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
      systemFallback: {
        mediaQuery: "(prefers-color-scheme: dark)",
        applyWhenMatches: true,
        whenMatchesValue: "dark",
      },
    },
  ],
});
```

Legacy-key migration (one-shot, at boot): the existing inline script reads from `localStorage['theme']`. `bootSync` checks for that key; if present, copies the value into `matrx:theme` (serialized through `themePolicy.serialize`) and `removeItem('theme')`. Covered by `engine.boot.test.ts` → "legacy key migration" case.

### 6.2 Registry

```ts
// lib/sync/registry.ts
import { themePolicy } from "@/styles/themes/themeSlice";

export const syncPolicies = [themePolicy] as const;
```

### 6.3 Store wiring

`lib/redux/store.ts` adds `createSyncMiddleware(syncPolicies)` to the middleware array, after `storageMiddleware`, before `entitySagaMiddleware`. Exact position to minimize action-log noise.

### 6.4 Providers

`app/Providers.tsx` awaits `bootSync(store, identity)` inside `StoreProvider`'s init, before rendering children.

### 6.5 Pre-paint

`app/layout.tsx`:

- **Delete** the inline `<script dangerouslySetInnerHTML={...}>` block (manifest item 2).
- **Delete** the hardcoded `"dark"` literal inside `className={cn("dark", ...)}` on `<html>`. The `.dark` class is now driven exclusively by `SyncBootScript`. Server-rendered `<html>` ships with no theme class; the inline `<SyncBootScript />` is the only authority.
- **Preserve** the server-side `data-theme={theme}` attribute on `<html>` (read from cookie) — it is still used by 9 CSS selectors in `components/rich-text-editor/remirror-editor.css`. The SyncBootScript's `attribute` descriptor overrides it pre-paint if localStorage disagrees.
- **Add** `<SyncBootScript />` inside `<head>`.

`features/shell/components/ThemeScript.tsx` + `hooks/useTheme.ts` (manifest item 3): deleted. `styles/themes/ThemeProvider.tsx` (manifest item 24, added Phase 0): deleted. All theme reads go through `useAppSelector((s) => s.theme.mode)`. All theme writes dispatch `setMode` / `toggleMode`.

### 6.6 `preferencesMiddleware.ts` (manifest item 1)

Dead code. Deleted outright — it's not wired into the store and not imported anywhere. Confirm with `grep -r "preferencesMiddleware"` before deletion.

## 7. Demo route

Path: `app/(a)/sync-demo/theme/page.tsx` (+ minimal `_client.tsx`).

This is a real feature in the real route group, not a test sandbox. Purpose:

- Shows live theme state from Redux.
- Toggle button dispatches `toggleMode`.
- Displays "tab ID" (random uuid per tab) and identity key.
- Shows last-received broadcast message (type + age).
- "Open new tab" button (`window.open` on the same path) — for easy peer-hydration verification.
- Shows hydration source: `localStorage` / `peer` / `default`.

The demo is permanent. It stays in the codebase as a regression check for every future phase — each phase adds to it (Phase 2: show IDB hydration source, etc.).

## 8. Testing

### 8.1 Unit tests (Jest — already installed; see `jest.config.js.ts` in the repo root)

- `engine.boot.test.ts` — boot with empty storage → default state. With populated storage → rehydrated state. With mismatched version → ignores stored state. Awaited promise resolves before any peer-request side effects.
- `engine.middleware.test.ts` — action in broadcast list → emitted on channel. Action with `meta.fromBroadcast = true` → not re-emitted. `boot-critical` writes through on action (no debounce). `warm-cache` debounce behavior is deferred to Phase 2 tests.
- `channel.test.ts` — identity-mismatched messages dropped. Malformed messages dropped with warning (dev) / silently (prod). Correct messages routed to handlers.
- `persistence.local.test.ts` — `partialize` filters keys correctly. `serialize`/`deserialize` round-trip. Invalid JSON handled. Quota-exceeded handled without crash.
- `policies.define.test.ts` — rules enforced (volatile cannot broadcast, boot-critical must broadcast, volatile cannot declare persistence fields, unique sliceName, boot-critical with `prePaint` produces valid descriptors).
- `pre-paint.test.ts` — given a registry of policies, the generated inline script string applies the expected DOM mutations (tested by running the emitted script against `jsdom` with a stubbed `localStorage`). Coverage includes: empty storage + `systemFallback` matches → applies; empty storage + no `systemFallback` → class removed / attribute set to `default`; storage present but key missing → falls through to fallback chain; storage malformed JSON → falls through; array-form policy applies each descriptor in order; descriptor is idempotent on re-execution.
- `engine.boot.test.ts` additionally covers: legacy `localStorage['theme']` → `'matrx:theme'` migration copies the value, removes the legacy key, and dispatches rehydrate once.

### 8.2 Integration test (playwright or similar if repo supports; otherwise manual checklist)

The six success criteria from §3 as runnable steps.

### 8.3 Manual verification checklist

Executed by a human before Phase 1 is closed. Saved as `phase-1-verification.md` with screenshots.

## 9. Observability (Phase 1 subset)

Full observability is Phase 12. Phase 1 installs the hooks:

- Every sync event goes through `lib/sync/logger.ts`. The logger is silent in production unless `?sync-debug=1` is in the URL or `localStorage.getItem('matrx:sync:debug') === '1'`.
- Events logged: `boot.start`, `boot.localStorage.hit/miss`, `boot.peer.request`, `boot.peer.response`, `boot.complete(ms)`, `broadcast.emit`, `broadcast.receive`, `broadcast.invalid`, `persist.write`, `persist.flush`, `identity.change`.
- Structured format: `{ event, sliceName?, ms?, meta? }`.

## 10. File-by-file change list

### Created

- `lib/sync/index.ts`
- `lib/sync/types.ts`
- `lib/sync/messages.ts`
- `lib/sync/identity.ts`
- `lib/sync/policies/define.ts`
- `lib/sync/policies/presets.ts`
- `lib/sync/registry.ts`
- `lib/sync/channel.ts`
- `lib/sync/persistence/local-storage.ts`
- `lib/sync/persistence/noop.ts`
- `lib/sync/engine/boot.ts`
- `lib/sync/engine/middleware.ts`
- `lib/sync/engine/rehydrate.ts`
- `lib/sync/logger.ts`
- `lib/sync/components/SyncBootScript.tsx`
- `lib/sync/__tests__/*.test.ts` (6 files: engine.boot, engine.middleware, channel, persistence.local, policies.define, pre-paint)
- `app/(a)/sync-demo/theme/page.tsx`
- `app/(a)/sync-demo/theme/_client.tsx`
- `docs/concepts/full-sync-boardcast-storage/phase-1-verification.md` (filled during verification)

### Modified

- `styles/themes/themeSlice.ts` — add `themePolicy` export.
- `lib/redux/store.ts` — add sync middleware to the chain (between `storageMiddleware` and `entitySagaMiddleware`).
- `app/Providers.tsx` — call `bootSync()` synchronously inside `StoreProvider` init (via `useRef` initializer — the awaited portion is now a pure sync localStorage pass, no async gate needed). Remove `<ThemeProvider>` wrapping. Remove imperative `setGlobalUserId(...)` call (superseded by `lib/sync/identity.ts`; see Phase 4 cleanup).
- `app/layout.tsx` — replace inline theme script with `<SyncBootScript />`; remove hardcoded `className="dark"`; keep server-side `data-theme` read.
- `app/DeferredSingletons.tsx` — remove `useTheme()` import; replace with `useAppSelector((s) => s.theme.mode)`.
- `jest.config.js.ts` — change `testEnvironment` from `"node"` to `"jsdom"`. Install `jest-environment-jsdom` if not transitively present (likely already via `ts-jest`). Verify the existing `utils/json/__tests__/extract-json.test.ts` still passes (it is a handrolled script — unaffected).
- `package.json` — **no change for zod** (v4.3.6 already installed). Only modify if `jest-environment-jsdom` needs explicit install.

### Deleted

- `lib/redux/middleware/preferencesMiddleware.ts` (manifest #1)
- Inline theme script block in `app/layout.tsx` (manifest #2)
- `hooks/useTheme.ts` (manifest #3)
- `features/shell/components/ThemeScript.tsx` (manifest #3)
- `styles/themes/ThemeProvider.tsx` (manifest #24, added Phase 0)
- Hardcoded `"dark"` literal in `app/layout.tsx` `<html className={cn("dark", ...)}>` — class is now sync-engine-driven.

Every deletion is preceded by a global grep for imports; any remaining consumers are migrated to `useAppSelector((s) => s.theme.mode)` + `dispatch(setMode(...))` in the same PR.

## 11. Breaking changes

None externally visible. Theme behavior is functionally identical to today: persists across reloads, no FOUC, syncs across tabs (gain from nothing → works). Components continue to use `useAppSelector` on `state.theme.mode`.

If any component currently uses `useTheme()` hook or imports `ThemeScript`, it is migrated in the same PR — no bridging code.

## 12. Rollout

- Single PR or short PR series, reviewed and merged together. No feature flags; the system either works or the PR is not merged.
- Deployed to preview; manual verification checklist executed on preview.
- Merged to production after all eight success criteria pass.

## 13. Exit criteria → Phase 2 entry criteria

Phase 2 (Dexie + `warm-cache` + `userPreferences`) begins only when:

- All eight success criteria are green in production.
- `decisions.md` § 8 manifest items 1–3 are all checked off.
- `phase-1-verification.md` is committed.
- `phase-2-plan.md` has been written and reviewed.

No code for Phase 2 exists before that plan doc is written.
