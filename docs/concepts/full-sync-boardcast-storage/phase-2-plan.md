# Phase 2 — Dexie Persistence + `warm-cache` + `userPreferences` Migration

> Phase 2 extends the sync engine with a second durable tier (IndexedDB via Dexie), introduces the `warm-cache` preset, adds the peer-hydration request/response protocol, and migrates the 17-module `userPreferences` slice onto the engine. It closes manifest items #4 (`useLocalStorageManager`) and #5 (three Supabase thunks).
>
> Reference docs: `decisions.md` (§§3–8), `phase-1-plan.md` (engine core), `phase-1-verification.md` (Phase 1 exit state), `phase-0-rq-audit.md` (remote-fetch patterns already inventoried).

Status: **Drafting** — awaiting Arman's review before code.
Owner: Claude (execution).
Preconditions: Phase 1 complete (✅ as of 2026-04-21).

---

## 1. Goals

- **G1** Add `warm-cache` to the preset list with real Dexie persistence behind it.
- **G2** Define and implement the peer hydration protocol (`HYDRATE_REQUEST` / `HYDRATE_RESPONSE`) left as scaffolding at the end of Phase 1.
- **G3** Introduce `fallback(ctx)` (server read) and `writeRemote(ctx, body)` (server write) as first-class policy capabilities. Both are per-policy opt-ins.
- **G4** Register `userPreferencesPolicy` so `userPreferences` is broadcast, debounced-persisted to Dexie, hydrated from peer/IDB/server at boot, and refreshed when stale.
- **G5** Delete the three Supabase thunks on `userPreferencesSlice.ts` (`savePreferencesToDatabase`, `saveModulePreferencesToDatabase`, `loadPreferencesFromDatabase`). Rewire all 10 dispatch sites to plain actions.
- **G6** Delete `hooks/common/useLocalStorageManager.ts` (262 lines) and its one live consumer (`LocalStorageAdmin.tsx` gains a native replacement reading from the sync engine's debug surface).
- **G7** Net-negative: target ≥ 300 lines removed, ≤ 700 lines added for the engine additions.

## 2. Explicit non-goals

- **N-G1** SSR preferences fetch stays in the three layouts (`(a)/layout.tsx`, `(authenticated)/layout.tsx`, `(ssr)/layout.tsx`). Removal is Phase 3 (manifest #6).
- **N-G2** `userSlice` stays intact — the split to `userProfile` / `userAuth` is Phase 4.
- **N-G3** The debug panel and observability tooling are Phase 12. Phase 2 ships structured `[sync]` logs only.
- **N-G4** `autoSave` capability (dirty-field tracking, echo suppression) is Phase 5. Phase 2's `writeRemote` is the narrow per-policy sink — it does not attempt to be a general autosave layer.
- **N-G5** Schema-migration helpers for `version` bumps (Q5) remain deferred. Bumping `version` still silently destroys cached data; documented on `definePolicy`.
- **N-G6** Live-data / Supabase Realtime subscription is Phase 11.

## 3. Success criteria

1. `userPreferencesSlice` state survives reload with **zero network fetch on warm boot** (IDB hydrate < 10ms; verified in demo).
2. Cross-tab sync of preference edits ≤ 20ms (same budget as Phase 1; broadcast path unchanged).
3. Cold boot with no IDB data fetches from Supabase via `fallback()` in < 500ms; staleness never blocks first paint.
4. Graceful degradation: IDB unavailable → engine falls back to localStorage → falls back to `initialState`; no crash.
5. Three Supabase thunks deleted. All 10 dispatch sites rewired to plain actions.
6. `useLocalStorageManager` deleted. `LocalStorageAdmin.tsx` rewritten against sync engine debug surface (or removed if not worth porting).
7. Unit tests green under jsdom; new tests cover Dexie read/write (mocked via `fake-indexeddb`), peer hydration flow, `writeRemote` debounce, `fallback` error handling, `staleAfter` scheduling.
8. Demo route `/sync-demo/theme` gains a second tab `/sync-demo/preferences` (or one combined page with a preferences panel) that exercises toggle → persist → reload → peer hydration.
9. `grep -r "useLocalStorageManager\|savePreferencesToDatabase\|saveModulePreferencesToDatabase\|loadPreferencesFromDatabase"` across `app/ components/ features/ hooks/ lib/ styles/ providers/` returns 0 matches post-PR.
10. Net-lines report per Constitution VII.

## 4. Architecture recap (Phase 2 surface area)

Phase 1 established:

- `definePolicy`, `createSyncMiddleware`, `bootSync`, `SyncBootScript`
- Presets: `volatile`, `ui-broadcast`, `boot-critical`
- Channel (`BroadcastChannel("matrx-sync")`)
- localStorage tier
- Identity scoping (`auth:{userId}` / `guest:{fingerprintId}`)

Phase 2 adds (all behind the existing `@/lib/sync` barrel):

- New file `lib/sync/persistence/idb.ts` — Dexie wrapper (`openDb`, `readSlice`, `writeSlice`, `clearIdentity`, `clearAll`).
- New file `lib/sync/engine/remoteFetch.ts` — invokes `policy.fallback`, guards with identity check + AbortController, respects `staleAfter`.
- New file `lib/sync/engine/remoteWrite.ts` — `writeRemote` scheduler; debounced (150ms default, override via `policy.remote.debounceMs`), with `pagehide` flush, retry on next change.
- Extends `lib/sync/engine/boot.ts` — IDB hydration step, peer hydration request, `staleAfter` background refresh registration.
- Extends `lib/sync/engine/middleware.ts` — `warm-cache` persist path (debounced, IDB primary), `writeRemote` hook invocation.
- Extends `lib/sync/policies/define.ts` — adds `preset: "warm-cache"` to the union; adds `staleAfter`, `remote.fetch`, `remote.write`, `remote.debounceMs` to the policy config.
- Extends `lib/sync/channel.ts` — handlers for `HYDRATE_REQUEST` / `HYDRATE_RESPONSE`.
- New registry entry `userPreferencesPolicy` in `styles/..` — no wait, in `lib/redux/slices/userPreferencesSlice.ts` (colocated per A2) — and added to `lib/sync/registry.ts`.

## 5. Public API (Phase 2 additions)

### 5.1 `warm-cache` preset — policy shape

```ts
type PresetName = "volatile" | "ui-broadcast" | "boot-critical" | "warm-cache";

interface PolicyConfig<TState> {
  // … unchanged Phase 1 fields …

  // Phase 2 additions (warm-cache + server integration).
  staleAfter?: number;                // ms; absent = never auto-refresh
  remote?: {
    fetch?: FallbackFn<TState>;        // server read
    write?: WriteRemoteFn<TState>;     // server write
    debounceMs?: number;               // default 150 for write
  };
}

type FallbackFn<T> = (ctx: FallbackContext) => Promise<Partial<T> | null>;
type WriteRemoteFn<T> = (ctx: WriteContext<T>) => Promise<void>;

interface FallbackContext {
  identity: IdentityKey;
  signal: AbortSignal;
  store: EnhancedStore;
  reason: "cold-boot" | "stale-refresh" | "manual";
}

interface WriteContext<T> {
  identity: IdentityKey;
  signal: AbortSignal;
  body: T;          // post-reducer, partialize-filtered, serialize-transformed
}
```

Hard rules (enforced in `definePolicy` validator):

- `warm-cache` MUST declare `broadcast.actions` (peer hydration requires it).
- `remote.fetch` / `remote.write` are only legal on `warm-cache` + future `live-data`. Adding them to `boot-critical` throws in dev.
- `staleAfter` is only legal with `remote.fetch` (otherwise staleness has no recovery path).
- `remote.debounceMs` ≥ 50; values below throw in dev (prevents accidental thundering-herd writes).

### 5.2 Peer hydration protocol

Messages already defined in `lib/sync/messages.ts` (Phase 1 scaffolded them). Phase 2 activates the handlers.

Flow (per `bootSync`):

1. After localStorage sync-read finishes, broadcast a `HYDRATE_REQUEST`:
   ```ts
   {
     type: "HYDRATE_REQUEST",
     identityKey,
     nonce: crypto.randomUUID(),
     slices: syncPolicies
       .filter((p) => p.broadcast)            // peer-eligible
       .map((p) => ({ sliceName: p.sliceName, version: p.version })),
   }
   ```
2. Every live tab that matches `identityKey` responds with `HYDRATE_RESPONSE` carrying *only* slices whose `version` matches. Mismatched-version slices are silently omitted (never downgrade).
3. First response wins per slice. Subsequent responses for already-hydrated slices are dropped. A 2-second dead-letter window is kept so late responders don't leak into logs.
4. Peer hydration never blocks first paint. If a response arrives after Redux has already hydrated from IDB, the engine compares `persistedAt` timestamps in the envelope and takes whichever is newer (LWW, tie-break by `identityKey` lex order — deterministic).

Gate: no response is sent if the requester's `identityKey` ≠ local identity. Documented in A8.

### 5.3 `fallback()` and `writeRemote()` contracts

**`fallback(ctx)`** — called when:
- Cold boot and both IDB and peer return nothing.
- `staleAfter` has elapsed (background; result is rehydrated asynchronously).
- `store._sync.refresh(sliceName)` is called (dev-only escape hatch; exposed only when `NODE_ENV !== "production"`).

Return contract:
- `Promise<Partial<TState>>` → engine dispatches `REHYDRATE` for that slice via the existing `deserialize` hook.
- `Promise<null>` → engine treats as "no data available; stay on current state."
- Thrown errors → caught; logged `[sync] fallback.error`; state unchanged.

**`writeRemote(ctx, body)`** — called when:
- Any broadcast-listed action mutates the slice.
- After the debounce window (`remote.debounceMs`, default 150ms).
- On `pagehide` with whatever state is currently in the slice.

Contract:
- Idempotent. Engine may call it multiple times with the same `body` — no side effects other than the network write.
- Errors caught + logged; next change triggers a fresh write. No retry storm.
- Cancelled via `AbortSignal` if the slice changes again within the debounce window or identity swaps.

### 5.4 Dexie layer

One database `matrx-sync`, one object store `slices`. Record shape:

```ts
interface IdbSliceRecord {
  key: string;                  // `${identityKey}:${sliceName}:${version}`
  identityKey: string;
  sliceName: string;
  version: number;
  body: unknown;                // serialized + partialized state
  persistedAt: number;          // epoch ms; drives LWW
}
```

Dexie schema:

```ts
const db = new Dexie("matrx-sync");
db.version(1).stores({ slices: "key, identityKey, sliceName" });
```

Compound key + two secondary indexes let the engine:
- Read one slice: `db.slices.get(key)`
- Iterate an identity: `db.slices.where("identityKey").equals(idKey).toArray()` (for identity purges per A9)
- Iterate a slice: `db.slices.where("sliceName").equals(name).toArray()` (for version-bump invalidation)

Write path uses `db.slices.put(record)` (upsert). The compound key embeds `version`, so bumping a policy's `version` leaves the old record orphaned; Phase 6 will add a reaping pass.

Failure modes:
- IDB unavailable (private browsing, disabled, quota exceeded): engine catches on `openDb`, logs `[sync] idb.unavailable`, and falls back to **localStorage** for `warm-cache` policies. Storage key pattern: `matrx:idbFallback:${sliceName}`. Writes stay debounced; reads stay sync.
- Schema upgrade: not needed in Phase 2 (schema version stays at `1`). Phase 6's migration work defines the upgrade path.

## 6. `userPreferences` migration

### 6.1 Final state of `userPreferencesSlice.ts`

Keep:
- All 17 preference interfaces.
- `_meta` field with its transient contents (`isLoading`, `error`, `lastSaved`, `hasUnsavedChanges`, `loadedPreferences`).
- `initialPreferences` constant.
- The synchronous reducers: `setPreference`, `setModulePreferences`, `resetModulePreferences`, `resetAllPreferences`, `resetToLoadedPreferences`, `clearUnsavedChanges`, `clearError`.

Delete:
- `savePreferencesToDatabase` (22 lines, 600–621)
- `saveModulePreferencesToDatabase` (44 lines, 623–666)
- `loadPreferencesFromDatabase` (23 lines, 668–690)
- The `extraReducers` cases that handle the three thunks' `pending/fulfilled/rejected` actions — replaced by the engine's `REHYDRATE` handler (mirroring `themeSlice.ts`).
- The `import { supabase } from "@/utils/supabase/client"` line (no longer needed at slice level; moved into the policy's `remote.fetch` / `remote.write`).

Add:
- `extraReducers` case handling `REHYDRATE_ACTION_TYPE` for `sliceName === "userPreferences"` (same pattern as `themeSlice.ts`).
- Export `userPreferencesPolicy` at the bottom.

### 6.2 `userPreferencesPolicy`

```ts
import { definePolicy } from "@/lib/sync/policies/define";
import { supabase } from "@/utils/supabase/client";

export const userPreferencesPolicy = definePolicy<UserPreferencesState>({
  sliceName: "userPreferences",
  preset: "warm-cache",
  version: 1,                   // bump destroys client caches (Phase 6 adds migrations)
  broadcast: {
    actions: [
      "userPreferences/setPreference",
      "userPreferences/setModulePreferences",
      "userPreferences/resetModulePreferences",
      "userPreferences/resetAllPreferences",
      "userPreferences/resetToLoadedPreferences",
      "userPreferences/clearUnsavedChanges",
      "userPreferences/clearError",
    ],
  },
  partialize: [
    "display", "prompts", "voice", "textToSpeech", "assistant",
    "email", "videoConference", "photoEditing", "imageGeneration",
    "textGeneration", "coding", "flashcard", "playground",
    "aiModels", "system", "messaging", "agentContext",
    // `_meta` intentionally excluded — transient UI/load state (A15).
  ],
  staleAfter: 60_000,           // background refresh after 1 min idle
  remote: {
    fetch: async ({ identity, signal }) => {
      if (identity.type !== "auth") return null;  // guests have no server state
      const { data, error } = await supabase
        .from("user_preferences")
        .select("preferences")
        .eq("user_id", identity.userId)
        .abortSignal(signal)
        .single();
      if (error || !data) return null;
      return data.preferences as Partial<UserPreferencesState>;
    },
    write: async ({ identity, signal, body }) => {
      if (identity.type !== "auth") return;       // guests only live in client storage
      await supabase
        .from("user_preferences")
        .upsert({ user_id: identity.userId, preferences: body })
        .abortSignal(signal);
    },
    debounceMs: 250,             // prefs edits are noisy (typing, slider drags)
  },
});
```

Note: `serialize`/`deserialize` omitted because `partialize` already defines the serialization shape and `deserialize` is identity for object-shaped state. The default is a shallow merge of the persisted body into `initialState`, preserving `_meta` as-is.

### 6.3 Consumer rewires (10 files)

Current pattern (for example from `PreferencesModal.tsx`):

```ts
const dispatch = useAppDispatch();
const prefs = useAppSelector(selectUserPreferences);
// on save:
dispatch(savePreferencesToDatabase(prefs));
```

New pattern:

```ts
const dispatch = useAppDispatch();
// on change (no "save" button needed; engine handles debounced writes):
dispatch(setPreference({ module: "display", key: "darkMode", value: true }));
```

For call sites that dispatch `saveModulePreferencesToDatabase({ module, preferences })`, the replacement is `setModulePreferences({ module, preferences })` — the reducer already exists; only the "persist" step changes (now automatic via the engine).

For `loadPreferencesFromDatabase` (the one site in `hooks/usePublicAuthSync.ts`): delete the call outright. The engine's `fallback()` handles this automatically at boot + on identity swap.

### 6.4 Dispatch site changelog (PR description table)

Each of the 10 sites gets a one-line grep verification in the PR body. Pattern from Phase 1.C: every migrated file is documented; zero consumers left unmigrated.

## 7. `useLocalStorageManager` deletion

Three consumers (from the audit):

- `app/(authenticated)/admin/components/LocalStorageAdmin.tsx` (line 37; actively uses the hook to list/clear localStorage keys). Rewrite: replace the hook with a small local component that reads `window.localStorage` directly (it's an admin tool; no need for an abstraction). ~40 lines added; 262 lines of hook deleted.
- `hooks/ai/chat/unused/useChatStorage.ts` (path contains `unused/`). Delete outright; grep confirms no consumers.
- `lib/redux/sagas/storage/storageManager.ts` (type-only import of `StorageVerification`). Inline the type into `storageManager.ts` (one interface, ~10 lines) or delete the type if unused.

## 8. Demo route extensions

Extend `app/(a)/sync-demo/theme/_client.tsx` → rename demo directory to `app/(a)/sync-demo/` with two sub-routes:

- `/sync-demo/theme` — unchanged.
- `/sync-demo/preferences` — new. Panels:
  1. Current `userPreferences` state (collapsible JSON tree).
  2. Module picker + form to mutate one field and observe:
     - Redux update
     - Debounced write to IDB (timestamp log)
     - Broadcast to peer tabs (log)
     - Server write to Supabase (log)
  3. "Clear all caches" button — dispatches identity purge, reloads.
  4. "Force refresh" button — calls `store._sync.refresh("userPreferences")`, observes `[sync] fallback.start/complete` log.
  5. "Simulate stale" button — manipulates `persistedAt` in IDB, reloads, verifies background refresh fires.

Landing page `/sync-demo/` with links to both sub-routes.

## 9. Testing

Install `fake-indexeddb` as a `devDependency` — provides jsdom-compatible IDB.

### 9.1 Unit tests (new)

All under `lib/sync/__tests__/`:

- **`persistence.idb.test.ts`** — Dexie wrapper: write/read round-trip, version mismatch skipped, identity purge wipes only that identity's records, clearAll nukes everything.
- **`persistence.warmCache.test.ts`** — Middleware: debounced write fires after N ms, `pagehide` flushes pending write, multiple rapid writes coalesce, non-listed action does not persist.
- **`peer.hydrate.test.ts`** — Two fake channels, request broadcast, response arrival (identity match → applied; identity mismatch → dropped; version mismatch → dropped).
- **`remote.fetch.test.ts`** — `fallback()` called on cold boot, on `staleAfter` elapsed, result deserialized + dispatched; errors caught + logged.
- **`remote.write.test.ts`** — Debounced write sink called after quiescence; `AbortSignal` fires on rapid re-change; errors swallowed; identity-swap cancels in-flight write.
- **`engine.boot.test.ts`** — Extend existing boot test: verify hydration order per A12 (localStorage → peer → IDB → fallback).

Target: ~8 new suites / ~60 new cases. Keeps the 92/92 baseline green.

### 9.2 Integration

Manual checklist in `phase-2-verification.md` (same format as Phase 1):

1. Toggle darkMode in prefs modal → observe Redux update → observe IDB write within 250ms via DevTools → Application → IndexedDB → matrx-sync → slices.
2. Four-tab broadcast: edit in tab 1 → tabs 2–4 reflect within one frame.
3. Close all tabs; reload one → UI renders instantly from IDB cache (Supabase fetch skipped; verified via Network tab).
4. 60-second idle → observe background `[sync] fallback.start { reason: "stale-refresh" }`.
5. Private browsing (IDB disabled) → UI still works; fallback-to-localStorage path exercised.
6. Sign out → identity swap → previous identity's IDB records purged; new identity starts clean.

## 10. Observability (Phase 2 additions)

New log events, all `[sync]`-prefixed, all structured:

- `idb.open.success` / `idb.open.error { cause }`
- `idb.hydrate { sliceName, bytes, ms }` / `idb.hydrate.miss { sliceName }`
- `idb.write { sliceName, bytes }` / `idb.write.error { sliceName, cause }`
- `peer.hydrate.request { slices }` / `peer.hydrate.response { sliceName, fromIdentity, ms }`
- `peer.hydrate.timeout { pendingSlices }` (2s logger only; not a failure)
- `fallback.start { sliceName, reason }` / `fallback.complete { sliceName, ms }` / `fallback.error { sliceName, cause }`
- `remote.write.scheduled { sliceName, debounceMs }` / `remote.write.flush { sliceName, bytes }` / `remote.write.error`
- `identity.purge { fromIdentity, toIdentity, recordsRemoved }`

Logger surface stays unchanged — this is all just new event names. Phase 12 wires these into the debug panel.

## 11. File-by-file change list

### Created

- `lib/sync/persistence/idb.ts` — Dexie wrapper (~140 LOC).
- `lib/sync/engine/remoteFetch.ts` — `fallback()` invoker + stale scheduler (~90 LOC).
- `lib/sync/engine/remoteWrite.ts` — Debounced write sink + pagehide flush (~110 LOC).
- `lib/sync/__tests__/persistence.idb.test.ts`
- `lib/sync/__tests__/persistence.warmCache.test.ts`
- `lib/sync/__tests__/peer.hydrate.test.ts`
- `lib/sync/__tests__/remote.fetch.test.ts`
- `lib/sync/__tests__/remote.write.test.ts`
- `docs/concepts/full-sync-boardcast-storage/phase-2-verification.md`
- `app/(a)/sync-demo/preferences/page.tsx` + `_client.tsx`
- `app/(a)/sync-demo/page.tsx` (landing)

### Modified

- `lib/sync/policies/define.ts` — add `warm-cache` + `remote` + `staleAfter` to the config union and validator.
- `lib/sync/engine/boot.ts` — integrate IDB hydration + peer request + stale scheduling.
- `lib/sync/engine/middleware.ts` — dispatch `warm-cache` persist path + `writeRemote` invocation.
- `lib/sync/channel.ts` — activate `HYDRATE_REQUEST` / `HYDRATE_RESPONSE` handlers (Phase 1 left them as no-ops).
- `lib/sync/registry.ts` — register `userPreferencesPolicy`.
- `lib/sync/index.ts` — export `warm-cache` types, `FallbackContext`, `WriteContext`.
- `lib/redux/slices/userPreferencesSlice.ts` — delete the three thunks + their extraReducers; add `REHYDRATE` case; export `userPreferencesPolicy`.
- 10 dispatch-site consumers — swap thunk dispatch for plain action dispatch (see §6.3).
- `app/(authenticated)/admin/components/LocalStorageAdmin.tsx` — inline the small portion of `useLocalStorageManager` it actually uses.
- `package.json` — add `dexie ^4.x` as a dependency; add `fake-indexeddb ^6.x` as a devDependency.
- `tsconfig.sync.json` — add new sync files to `include`.
- `docs/concepts/full-sync-boardcast-storage/phase-1-verification.md` — append pointer "Phase 2 landed in PR-N; see phase-2-verification.md".
- `docs/concepts/full-sync-boardcast-storage/decisions.md` — check off items #4 and #5 in the manifest (§8).

### Deleted

- `hooks/common/useLocalStorageManager.ts` (262 LOC).
- `hooks/ai/chat/unused/useChatStorage.ts` (if the whole file is just the hook usage; audit during PR).
- Three thunks (~89 LOC across 32+44+23 lines) in `userPreferencesSlice.ts` — inline deletions.

Estimated totals:
- Created: ~700 LOC (including tests).
- Deleted: ~350 LOC.
- Net: ~+350 LOC before counting the natural ~30 LOC per consumer-rewire shrink. Likely net +250 to +300 when everything lands.
- Program-level net stays negative per the 12-phase plan (Phase 5's autoSave consolidation and Phase 7's React Query removal are the big net-negatives).

## 12. Breaking changes

- `savePreferencesToDatabase`, `saveModulePreferencesToDatabase`, `loadPreferencesFromDatabase` no longer exported. Any non-repo consumer (there shouldn't be one) will break at import time — TypeScript catches this at build.
- `useLocalStorageManager` removed. Admin page is rewritten to match.
- Dexie 4.x required at the browser side. Older browsers without IDB fall back to localStorage (documented).

None of these are user-visible at runtime; the preference UX is unchanged (edit → persist → reload → state restored), just without the explicit "save" call.

## 13. Rollout

Single PR unless diff exceeds ~1500 LoC, in which case split:

- **PR 2.A — Engine additions** (~800 LoC). All `lib/sync/**` changes + tests. No consumer rewires. Behaviorally a no-op for the app (no policy uses `warm-cache` yet). Merge as a pure engine uplift.
- **PR 2.B — `userPreferences` migration + thunk deletion + `useLocalStorageManager` deletion**. The consumer-touching PR.
- **PR 2.C — Demo route + verification doc**. Short, reviewable.

Feature flag: none. The migration is atomic at the Redux level — either the policy is registered or it isn't.

## 14. Exit criteria → Phase 3 entry criteria

Phase 2 is closed when:

1. All 10 items in §3 are green.
2. `phase-2-verification.md` exists with evidence (grep results, test output, net-lines diff, manual checklist results).
3. `decisions.md` §8 manifest items #4 and #5 are checked off.
4. `pnpm jest lib/sync/` ≥ previous count (92) and all new suites pass.
5. Live dev-server boot log shows `policyCount: 2` and `[sync] idb.hydrate { sliceName: "userPreferences", ... }` on subsequent reloads.

Phase 3 entry requires:
- Phase 2 merged to `main`.
- `phase-3-plan.md` written and approved by Arman.
- Phase 3 scope focus: remove the SSR `getUserSessionData` preferences fetch from all three layouts; establish the cookie pre-paint handoff (manifest #6 + D8).

---

## Ground-truth addenda (discovered during Phase 0 audit on 2026-04-21)

Appended here as "must not forget" when writing Phase 2 code:

1. **17 modules confirmed** — `display, prompts, voice, textToSpeech, assistant, email, videoConference, photoEditing, imageGeneration, textGeneration, coding, flashcard, playground, aiModels, system, messaging, agentContext`. `partialize` list in §6.2 reflects this exactly.
2. **`_meta` transient fields** — `isLoading, error, lastSaved, hasUnsavedChanges, loadedPreferences`. All excluded from `partialize` (A15).
3. **SSR path is currently parallel across all 3 layouts** — Phase 2 must NOT remove the SSR fetch; the client-side sync engine runs *alongside* the SSR hydration during Phase 2. Phase 3 removes the server fetch. During Phase 2, the SSR-hydrated initial state is the engine's *input*, not a competitor: `resolveStoreBootstrapState` already handles merging `userPreferences` from `initialReduxState`.
4. **10 dispatch sites to rewire** (not 9 — `hooks/user-preferences/useModulePreferences.ts` was missed in the original plan). Full list:
   - `features/feedback/FeedbackButton.tsx`
   - `features/window-panels/windows/UserPreferencesWindow.tsx`
   - `components/user-preferences/PreferencesModal.tsx`
   - `components/user-preferences/PreferencesPage.tsx`
   - `components/user-preferences/VSCodePreferencesModal.tsx`
   - `components/user-preferences/PreferenceModuleWrapper.tsx`
   - `components/user-preferences/SettingsPageHeader.tsx`
   - `components/layout/SystemAnnouncementModal.tsx`
   - `hooks/user-preferences/useModulePreferences.ts`
   - `hooks/usePublicAuthSync.ts`
5. **Dexie not installed** — `pnpm add dexie` is PR 2.A's first step. `fake-indexeddb` is the test-only addition for jsdom.
6. **`idb` package stays** until Phase 6 — manifest #15 + #16. Phase 2 does not touch `lib/idb/*` or `hooks/idb/*`.
