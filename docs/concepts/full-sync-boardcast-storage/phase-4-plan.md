# Phase 4 — `userSlice` split + reactive identity

> Phase 4 splits the existing `lib/redux/slices/userSlice.ts` into two slices: `userAuth` (volatile auth + identity context — `id`, `email`, `phone`, `emailConfirmedAt`, `lastSignInAt`, `appMetadata`, `identities`, `isAdmin`, `accessToken`, `tokenExpiresAt`, `authReady`) and `userProfile` (persistable display data — `userMetadata`, `fingerprintId`, `shellDataLoaded`). Replaces `lib/globalState.ts` (imperative `setGlobalUserIdAndToken` + getter quintet) and `app/Providers.tsx::setGlobalUserId` with a reactive identity source wired into `lib/sync/identity.ts`. Closes manifest item #7.
>
> Reference docs: `decisions.md` (D1 — split for semantics, `partialize` for transients), `phase-1-plan.md` (`lib/sync/identity.ts` design), `phase-3-verification.md` §8 (note that `setGlobalUserId` deletion was deferred from Phase 3 to here).

Status: **Planned** — Claude executes autonomously per Arman's 2026-04-26 direction ("complete a few phases yourself in full without my involvement").
Owner: Claude (execution).
Preconditions: Phase 3 complete (✅ as of `59cda04c1`).

---

## 1. Goals

- **G1** Split `userSlice` into `userAuthSlice` + `userProfileSlice` per decisions.md D1.
- **G2** `userProfileSlice` opts into the sync engine via the `boot-critical` preset, with `partialize: ["userMetadata"]` — `userMetadata` (avatar URL, names) is small and read on every page render to drive `<UserAvatar>`, `<DisplayName>`, etc., so first-paint correctness matters. `fingerprintId` is identity-derived, not persisted by this slice. `shellDataLoaded` is transient boot-timing state, excluded.
- **G3** `userAuthSlice` is `volatile` (no persistence, no broadcast) — auth secrets never touch storage. Token is server-issued each session; `authReady` is reset on every boot.
- **G4** Public selector names (`selectUser`, `selectIsAdmin`, `selectUserId`, `selectAccessToken`, `selectFingerprintId`, `selectAuthReady`, `selectShellDataLoaded`, `selectIsAuthenticated`, `selectDisplayName`, `selectProfilePhoto`, `selectUserContext`) are **preserved** but reimplemented to read from the new slices. This keeps ~50+ selector-hook consumer files unchanged.
- **G5** Direct-access consumers (`state.user.*` outside selectors — 17 files) are migrated to use selectors. Cleaner pattern; one-time fix.
- **G6** Whole-slice consumers (`state.user` returning the merged shape — 22 files) keep working via a memoized `selectUser` that composes `state.userAuth` + `state.userProfile`.
- **G7** Action consumers (5 dispatch sites for `setUser`, `setShellDataLoaded`, `setFingerprintId`, etc.) — migrated to dispatch new slices' actions. The legacy `setUser({...})` (which took `Partial<UserState>` spanning both new slices) becomes a thunk that fans out to the right slice.
- **G8** Replace `lib/globalState.ts` (9 consumers) and `app/Providers.tsx::setGlobalUserId` (1 external consumer) with `lib/sync/identity.ts` reactive identity. Imperative getters become Redux selectors. Server-side seed sites (3 layouts, server-only utilities) keep using a narrow imperative seed for SSR; client-side reads switch to selectors.
- **G9** Net-negative: target ≥ 200 lines deleted (old userSlice + globalState + parallel `lib/redux/features/user/`), ≤ 250 added (new slices + selectors + identity reactor + tests).

## 2. Explicit non-goals

- **N-G1** No new imperative globals. The replacement `lib/sync/identity.ts` is a reactive source — it observes Redux + Supabase auth-state and exposes `getIdentity()` (always fresh) plus event subscription. It does NOT recreate the old "set this once, read it imperatively" pattern.
- **N-G2** `setGlobalUserId` and `setGlobalUserIdAndToken` cannot survive — they are the imperative pattern Phase 4 deletes. SSR layouts that need the user ID + token early use Redux preloaded state (already the case for client hydration) plus a dedicated server-side `lib/auth/serverIdentity.ts` helper that doesn't leak global mutable state.
- **N-G3** `lib/redux/entity/utils/direct-schema.ts` (a non-React utility that calls `getGlobalUserId()`) is migrated to receive `userId` as a parameter. Refactor scope is limited to passing identity in — no broader entity-system rewrite.
- **N-G4** No changes to slice shape semantics. Every field in the old `UserState` lands somewhere in the new pair. No fields renamed, dropped, or moved into different sub-objects.
- **N-G5** No reactive Supabase auth-state listener wired up in this phase. That work belongs to Phase 11 / a dedicated auth-listener feature; Phase 4 keeps the existing imperative seed-on-page-load pattern but routes it through `setIdentity` instead of `setGlobalUserId`.
- **N-G6** The dead parallel slice at `lib/redux/features/user/userSlice.ts` (older `MatrixUser` variant, not mounted in the slim reducer map) is grep-verified dead and deleted as a bonus, but verifying its deadness happens in PR 4.B before deletion.

## 3. Success criteria

1. **State shape**: `RootState.userAuth` + `RootState.userProfile` exist. `RootState.user` no longer exists. `tsc --noEmit` is clean (modulo the pre-existing memory issue with full-project typecheck — narrow checks pass).
2. **Selector continuity**: every previously-exported selector still works. Same name, same return type, same memoization semantics. No consumer file outside `lib/redux/selectors/userSelectors.ts` and `lib/redux/slices/userSlice.ts` (which becomes a re-export shim during one PR cycle, then deleted) needs to change its imports.
3. **Direct-access migration**: `grep -rn "state\.user\.\(id\|email\|phone\|isAdmin\|accessToken\|tokenExpiresAt\|fingerprintId\|authReady\|shellDataLoaded\|userMetadata\|appMetadata\|identities\|emailConfirmedAt\|lastSignInAt\)" app/ components/ features/ hooks/ lib/ utils/ providers/ --include='*.ts' --include='*.tsx'` returns zero matches. Either the access has moved through a selector, or both `state.userAuth.X` / `state.userProfile.X` patterns are used.
4. **Persistence**: open the app, sign in, verify `userMetadata` is written to `localStorage` under the `matrx:userProfile` key with the correct `identityKey` envelope. Hard-refresh: `userMetadata` paints from LS before the network roundtrip completes (no flicker on the user avatar in the header).
5. **No transient persistence**: `shellDataLoaded` is NOT in the persisted envelope — a stale persisted `shellDataLoaded: true` could otherwise prevent components like `AnnouncementProvider` from waiting for this turn's actual shell-data fetch. Verified via the demo route's IDB inspector AND a Jest test that reads the persisted body.
6. **Identity-swap isolation**: signing in as user A populates `matrx:userProfile:auth:userA-id`. Signing out + signing in as user B writes `matrx:userProfile:auth:userB-id`. The old envelope still exists but is not loaded for the new identity (engine's identity-scoped read).
7. **`globalState.ts` deletion**: the file is gone. `lib/sync/identity.ts` exposes `getIdentity()` (returns the live `IdentityKey` from the store) for non-React consumers. `lib/redux/entity/utils/direct-schema.ts` accepts `userId` as a parameter from its callers.
8. **`setGlobalUserId` deletion**: `app/Providers.tsx` no longer exports `setGlobalUserId` / `getGlobalUserId`. `app/EntityProviders.tsx` (its only external consumer) is updated to use the Redux selector + `setIdentity` pattern.
9. **Action consumer migration**: `DeferredShellData.tsx`, `usePublicAuthSync.ts`, and `useApiAuth.ts` (3 files dispatching `setUser` / `setShellDataLoaded` / `setFingerprintId`) — all updated to dispatch the new slices' actions. A `setUserData` thunk that takes a `Partial<UserData>` and fans out to both slices preserves the call-site ergonomics of the legacy `setUser`.
10. **Unit tests**: 102 baseline + new tests for (a) userAuth slice reducers, (b) userProfile slice reducers + persistence policy partialize behavior, (c) selectUser composite memoization, (d) `setUserData` thunk fans out correctly, (e) identity reactor reads Redux state correctly. Target: ≥ 110 total tests green under jsdom.
11. **Net-lines**: report in `phase-4-verification.md` §7. Target: deleted ≥ 200, added ≤ 250 (most new lines are tests).

## 4. Architecture — what moves where

### 4.1 Field allocation

| Field | Slice | Reason |
|---|---|---|
| `id` | userAuth | Auth identity primary |
| `email` | userAuth | Auth identity primary |
| `phone` | userAuth | Auth identity attribute |
| `emailConfirmedAt` | userAuth | Auth state |
| `lastSignInAt` | userAuth | Auth state |
| `appMetadata` | userAuth | OAuth provider context, auth-domain |
| `identities` | userAuth | Auth-domain (Supabase identity records) |
| `isAdmin` | userAuth | Authz, derived from auth context |
| `accessToken` | userAuth | Auth secret — MUST NOT persist |
| `tokenExpiresAt` | userAuth | Token lifecycle — coupled to accessToken |
| `authReady` | userAuth | Boot-time auth-resolution flag — transient by nature |
| `userMetadata` | userProfile | Display data (name, avatar) — persists for first-paint correctness |
| `fingerprintId` | userProfile | Stable per-device identifier; updates rarely; persists across sessions |
| `shellDataLoaded` | userProfile | Boot-time loading flag — transient, excluded from `partialize` |

### 4.2 New slice signatures (sketch)

```ts
// lib/redux/slices/userAuthSlice.ts
export interface UserAuthState {
  id: string | null;
  email: string | null;
  phone: string | null;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  appMetadata: { provider: string | null; providers: string[] };
  identities: Identity[];
  isAdmin: boolean;
  accessToken: string | null;
  tokenExpiresAt: number | null;
  authReady: boolean;
}

// Actions
setUserAuth(payload: Partial<UserAuthState>): UserAuthState  // marks authReady=true
setAccessToken(token: string | null): void
setTokenExpiry(ts: number | null): void
setAuthReady(ready: boolean): void
clearUserAuth(): UserAuthState  // resets to initial

// Policy: NONE (preset = 'volatile' implicit)
```

```ts
// lib/redux/slices/userProfileSlice.ts
export interface UserProfileState {
  userMetadata: {
    avatarUrl: string | null;
    fullName: string | null;
    name: string | null;
    preferredUsername: string | null;
    picture: string | null;
  };
  fingerprintId: string | null;
  shellDataLoaded: boolean;
}

// Actions
setUserMetadata(payload: Partial<UserMetadata>): void
setFingerprintId(id: string): void
setShellDataLoaded(loaded: boolean): void
clearUserProfile(): UserProfileState

// Policy:
export const userProfilePolicy = definePolicy<UserProfileState>({
  sliceName: "userProfile",
  preset: "boot-critical",
  version: 1,
  partialize: ["userMetadata"],  // fingerprintId is identity-domain; shellDataLoaded is transient
  storageKey: "matrx:userProfile",
  serialize: (s) => ({ userMetadata: s.userMetadata }),
  deserialize: (raw) => /* shape-validate; return userMetadata or initial defaults */,
});
```

### 4.3 Selector reimplementation

`lib/redux/slices/userSlice.ts` is **deleted**. Its public selector exports move to `lib/redux/selectors/userSelectors.ts`, which becomes the single source for all user-related selectors. Internal implementations rewire to read from the new slices.

```ts
// lib/redux/selectors/userSelectors.ts (rewritten)

// Primitive selectors — unchanged names, new sources
export const selectUserId = (s: RootState) => s.userAuth.id;
export const selectUserEmail = (s: RootState) => s.userAuth.email;
export const selectIsAdmin = (s: RootState) => s.userAuth.isAdmin;
export const selectAccessToken = (s: RootState) => s.userAuth.accessToken;
export const selectAuthReady = (s: RootState) => s.userAuth.authReady;
export const selectIsAuthenticated = (s: RootState) => !!s.userAuth.id;
export const selectFingerprintId = (s: RootState) => s.userProfile.fingerprintId;
export const selectShellDataLoaded = (s: RootState) => s.userProfile.shellDataLoaded;
export const selectUserMetadata = (s: RootState) => s.userProfile.userMetadata;

// Composite — memoized, reconstructs the legacy UserState shape for whole-slice consumers
export const selectUser = createSelector(
  [(s: RootState) => s.userAuth, (s: RootState) => s.userProfile],
  (auth, profile) => ({ ...auth, ...profile }),
);

// Derived — unchanged names
export const selectDisplayName = createSelector(
  selectUserMetadata,
  selectUserEmail,
  (meta, email) =>
    meta.name || meta.fullName || (email?.split("@")[0] ?? null) || "User",
);
// etc. for every named selector in the inventory
```

### 4.4 `lib/sync/identity.ts` extension

Phase 1 stub `deriveIdentity()` is preserved. Phase 4 adds:

```ts
// lib/sync/identity.ts (additions)

let storeRef: AppStore | null = null;
let lastIdentityKey: string | null = null;
const subscribers = new Set<(key: IdentityKey) => void>();

/** Wire the store after creation (called from StoreProvider). */
export function attachStore(store: AppStore): void {
  storeRef = store;
  // Subscribe to user changes and re-derive identity.
  store.subscribe(() => {
    const state = store.getState();
    const userId = state.userAuth.id;
    const fp = state.userProfile.fingerprintId;
    const next = deriveIdentity({ userId, fingerprintId: fp });
    if (next.key !== lastIdentityKey) {
      lastIdentityKey = next.key;
      subscribers.forEach((cb) => cb(next));
    }
  });
}

/** Live identity — replaces `getGlobalUserIdAndToken`. */
export function getIdentity(): IdentityKey {
  if (!storeRef) {
    return deriveIdentity();  // pre-attach: best-effort guest
  }
  const s = storeRef.getState();
  return deriveIdentity({ userId: s.userAuth.id, fingerprintId: s.userProfile.fingerprintId });
}

/** Reactive subscribe — for non-React systems (sagas, side-effects). */
export function onIdentityChange(cb: (key: IdentityKey) => void): () => void {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

/** Snapshot helper: returns user id + access token for non-React callers. */
export function getIdentityContext(): {
  userId: string | null;
  accessToken: string | null;
  isAdmin: boolean;
} {
  if (!storeRef) return { userId: null, accessToken: null, isAdmin: false };
  const s = storeRef.getState();
  return {
    userId: s.userAuth.id,
    accessToken: s.userAuth.accessToken,
    isAdmin: s.userAuth.isAdmin,
  };
}
```

### 4.5 `globalState.ts` migration sites

| Old site | New approach |
|---|---|
| `app/Providers.tsx` `setGlobalUserId` (3 layout consumers) | The 3 layouts already pass `initialReduxState.user` to `<Providers>`. After Phase 4 they pass `userAuth` + `userProfile` preloaded state instead. `setGlobalUserId` is deleted. |
| `lib/globalState.ts` `setGlobalUserIdAndToken` (3 layouts + DeferredShellData + authedLayoutData) | Server-side: each layout dispatches the user data into the preloaded state directly — no need for a global. Client-side: `attachStore(store)` is called once in `StoreProvider`; downstream needs use `getIdentityContext()` or selectors. |
| `lib/redux/entity/utils/direct-schema.ts` `getGlobalUserId()` (1 call site, L337) | Refactor: the 1 call site already has `userId` available in the entity context. Pass it as a parameter. If the call chain doesn't have it, walk up and pass through. |
| `components/layout/MatrxLayout.tsx` `getGlobalIsAdmin()` (1 site) | Replace with `useAppSelector(selectIsAdmin)`. |

### 4.6 Files deleted

- `lib/redux/slices/userSlice.ts` — replaced by 2 new slices + selector consolidation.
- `lib/globalState.ts` — replaced by `lib/sync/identity.ts` extensions.
- `app/Providers.tsx` `setGlobalUserId` / `getGlobalUserId` — internal pair, deleted in place (file remains).
- `lib/redux/features/user/userSlice.ts` + `lib/redux/features/user/userActions.ts` — confirmed-dead parallel slice (grep verified in PR 4.B).
- `utils/userDataMapper.ts` shadow selectors (lines 93–117) — confirmed unused (grep returns 0 imports), deleted.

### 4.7 Files added

- `lib/redux/slices/userAuthSlice.ts` (~80 lines)
- `lib/redux/slices/userProfileSlice.ts` (~100 lines including `userProfilePolicy` definition)
- `lib/redux/thunks/userDataThunk.ts` (~30 lines, the fan-out replacement for legacy `setUser`)
- `lib/sync/identity.ts` (additions, ~50 lines)
- Tests: `lib/redux/slices/__tests__/userAuthSlice.test.ts`, `userProfileSlice.test.ts`, `lib/sync/__tests__/identity.test.ts` (~250 lines combined)

## 5. Engineering tasks

### 5.1 Create new slices (PR 4.B step 1)

- Define `userAuthSlice` with all auth fields. `setUserAuth` reducer takes `Partial<UserAuthState>` and merges, marking `authReady=true` (mirrors legacy `setUser`).
- Define `userProfileSlice` with all profile fields. `setUserMetadata` takes `Partial<UserMetadata>` and merges. `setFingerprintId(id)` sets fingerprint AND marks the auth slice's `authReady=true` (this needs a thunk because it spans slices — see 5.4).

### 5.2 Wire `userProfilePolicy` into the sync engine (PR 4.B step 2)

- Add `userProfilePolicy` export to `userProfileSlice.ts` (same file, per A2 colocation).
- Register in `lib/sync/registry.ts` alongside `themePolicy`.
- Engine's middleware automatically picks it up. No additional wiring needed — Phase 1 boot-critical preset machinery handles localStorage write-through + REHYDRATE on boot.

### 5.3 Update `rootReducer.ts` (PR 4.B step 3)

- Remove: `import userReducer from "./slices/userSlice"` and the `user: userReducer` mount.
- Add: `import userAuthReducer from "./slices/userAuthSlice"` + `import userProfileReducer from "./slices/userProfileSlice"`.
- Mount: `userAuth: userAuthReducer, userProfile: userProfileReducer`.

### 5.4 Add `setUserData` thunk (PR 4.B step 4)

The legacy `setUser` took `Partial<UserState>` spanning both new slices. To preserve the ergonomic signature, ship a thunk:

```ts
// lib/redux/thunks/userDataThunk.ts
export const setUserData = (payload: Partial<UserData>) => (dispatch: AppDispatch) => {
  const authPart = pick(payload, [
    "id", "email", "phone", "emailConfirmedAt", "lastSignInAt",
    "appMetadata", "identities", "isAdmin", "accessToken", "tokenExpiresAt",
  ]);
  const profilePart = pick(payload, ["userMetadata", "fingerprintId"]);
  if (Object.keys(authPart).length) dispatch(setUserAuth(authPart));
  if (Object.keys(profilePart).length) dispatch(setUserMetadata(profilePart.userMetadata ?? {}));
  // ... fingerprintId handling
};
```

### 5.5 Rewrite `lib/redux/selectors/userSelectors.ts` (PR 4.B step 5)

All ~22 exported selectors are reimplemented to read from `state.userAuth` and `state.userProfile`. Names unchanged. `selectUser` uses `createSelector` to memoize the composite shape (callers who took the old `state.user` reference identity are unaffected because the composite is stable across unchanged inputs).

### 5.6 Migrate selector imports (PR 4.B step 6)

Many files currently import from `@/lib/redux/slices/userSlice` (`selectUser`, `selectIsAdmin`, etc.). Since we're deleting that file, every such import is rewritten to `@/lib/redux/selectors/userSelectors`. Mechanical sed-style migration across ~75 files.

### 5.7 Migrate direct `state.user.*` reads (PR 4.B step 7)

The 17 files identified in the audit get one-line edits each: replace `state.user.X` with the appropriate selector (`useAppSelector(selectIsAdmin)` etc.) or with `state.userAuth.X` / `state.userProfile.X` for cases where a selector hook isn't appropriate (thunks, sagas, middleware).

### 5.8 Migrate action dispatch sites (PR 4.B step 8)

| File | Old | New |
|---|---|---|
| `features/shell/components/DeferredShellData.tsx` | `dispatch(setUser({...}))` + `dispatch(setShellDataLoaded(true))` | `dispatch(setUserData({...}))` + `dispatch(setShellDataLoaded(true))` (latter from new userProfileSlice) |
| `hooks/usePublicAuthSync.ts` | `dispatch(setUser({...}))` + `dispatch(setFingerprintId(fp))` | Same with new actions |
| `hooks/useApiAuth.ts` | `dispatch(setFingerprintId(fp))` | `dispatch(setFingerprintId(fp))` from `userProfileSlice` |

### 5.9 Replace `globalState.ts` (PR 4.C — separate PR)

- Add `attachStore`, `getIdentity`, `getIdentityContext`, `onIdentityChange` to `lib/sync/identity.ts`.
- Update `providers/StoreProvider.tsx` to call `attachStore(store)` after store creation.
- Update each `lib/globalState.ts` consumer:
  - 3 layouts (`(a)`, `(authenticated)`, `(ssr)`) — drop the `setGlobalUserIdAndToken` call. The user data is already going into preloaded state via the existing `userData` flow.
  - `app/Providers.tsx` — drop both `setGlobalUserId` (its own) and `setGlobalUserIdAndToken` (from globalState). Replace with `attachStore` call (or rely on StoreProvider doing it — pick one).
  - `app/EntityProviders.tsx` — drop the `setGlobalUserId` import; if it needs identity, use `useAppSelector(selectUserId)`.
  - `features/shell/components/DeferredShellData.tsx` — drop the `setGlobalUserIdAndToken` refresh after fetch (Redux dispatch is the source of truth now).
  - `lib/auth/authedLayoutData.ts` — drop the `setGlobalUserIdAndToken` call; this server-side helper just returns data now.
  - `lib/redux/entity/utils/direct-schema.ts` — refactor to take `userId` as parameter.
  - `components/layout/MatrxLayout.tsx` — replace `getGlobalIsAdmin()` with `useAppSelector(selectIsAdmin)`.
- Delete `lib/globalState.ts`.

### 5.10 Tests

New Jest suites:

- **`lib/redux/slices/__tests__/userAuthSlice.test.ts`** (~80 lines) — every reducer (`setUserAuth`, `setAccessToken`, `setTokenExpiry`, `setAuthReady`, `clearUserAuth`); `selectIsAuthenticated`, `selectIsAdmin`, `selectAccessToken` correctness; `clearUserAuth` resets accessToken to null (security invariant).
- **`lib/redux/slices/__tests__/userProfileSlice.test.ts`** (~100 lines) — every reducer; `userProfilePolicy.partialize` includes `userMetadata` only; `userProfilePolicy.deserialize` accepts/rejects the right shapes; REHYDRATE merges into state correctly.
- **`lib/redux/__tests__/userDataThunk.test.ts`** (~50 lines) — thunk dispatches the right slice actions for partial payloads; empty payload no-ops; mixed-slice payload fans out correctly.
- **`lib/sync/__tests__/identity.test.ts`** (~70 lines) — `attachStore` subscribes to changes; `onIdentityChange` callback fires on user-id swap; `getIdentityContext` returns current state; pre-attach `getIdentity` returns guest sentinel.
- **Composite selector test in `userAuthSlice.test.ts` or new file**: `selectUser` returns the same reference for two calls with unchanged state (memoization invariant).

Total new test LoC: ~300; total tests: 102 baseline + ~30 new = **~132**.

## 6. Execution — PR shape

- **PR 4.A** — This plan doc.
- **PR 4.B** — Slices + selectors + consumer migration + tests. Lands in a single PR (≈600 LoC change) because the consumer migration is mechanical and atomicity matters (can't have `state.user` in some consumers and `state.userAuth` in others mid-PR).
- **PR 4.C** — `globalState.ts` deletion + identity reactor wiring. Separate from 4.B because it touches different code paths and can ship independently.
- **PR 4.D** — `phase-4-verification.md`.

## 7. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| `selectUser` consumer relies on reference identity (`state.user` was a stable Redux state slice; the new composite is `createSelector`-memoized but only on inputs) | Re-renders on unrelated parts of state | `createSelector` ensures the composite output is referentially stable across unchanged inputs. If consumer needs deep granularity, encourage selector-per-field migration. Survey direct-state consumers for `===` comparisons before migration. |
| Two-slice atomicity: a `setUserData` payload spanning both slices dispatches as 2 actions; an intermediate render could see partial state | Brief flash on first paint | Acceptable: the legacy `setUser` action was atomic but the post-payload state was identical; consumers don't actually depend on atomicity here. Verified in §5.4 by inspecting the 5 dispatch sites. |
| Persisted `userMetadata` from a prior session has stale fields (e.g., user changed avatar in another tab) | Brief stale render | Existing peer-hydration + REHYDRATE behavior already covers this: cross-tab sync brings the new value in <20 ms. Phase 4 inherits this from Phase 1's sync engine. |
| Server-side preloaded state for the new slices doesn't match the old `user` field shape | Hydration mismatch / typescript error | `InitialReduxState` type adds optional `userAuth` + `userProfile` fields; layouts populate both. `mapUserData` (in `userDataMapper.ts`) returns a `UserData` that's shaped for the OLD slice; refactor to return `{ userAuth, userProfile }` shape, then layouts spread accordingly. |
| `getGlobalUserId()` callers in non-React code (entity utils) break before refactor | Build failure | The grep audit identified the single caller (`direct-schema.ts:337`). Fix in same PR as deletion. |
| `direct-schema.ts:337` call chain depth makes parameter-passing painful | Migration bigger than expected | If passing `userId` upward is invasive, fall back to having `direct-schema` import `getIdentityContext` from `lib/sync/identity` — same pattern, but identity-aware reactive source instead of mutable global. Note: this is still imperative-flavored access; document why the entity layer warrants it. |
| Phase 11 (auth-state listener) hasn't shipped, so identity changes still require a page reload | Same as today | Acceptable — Phase 4 doesn't regress this. The reactive source is in place for Phase 11 to wire into. |

## 8. What gets deleted

| File | Lines |
|---|---|
| `lib/redux/slices/userSlice.ts` | 148 |
| `lib/globalState.ts` | 22 |
| `app/Providers.tsx` setGlobalUserId / getGlobalUserId pair | ~10 (lines 33-49) |
| `lib/redux/features/user/userSlice.ts` (parallel dead) | ~? (verify) |
| `lib/redux/features/user/userActions.ts` (parallel dead) | ~? (verify) |
| `utils/userDataMapper.ts` shadow selectors | ~25 (lines 93-117) |
| **Total deletion target** | **~205+ lines** |

## 9. What gets added

| File | Lines (approx) |
|---|---|
| `lib/redux/slices/userAuthSlice.ts` | 80 |
| `lib/redux/slices/userProfileSlice.ts` | 100 |
| `lib/redux/thunks/userDataThunk.ts` | 30 |
| `lib/sync/identity.ts` (additions) | 50 |
| `lib/redux/selectors/userSelectors.ts` (rewrite) | net 0 (similar size) |
| Tests | ~300 |
| **Total addition target** | **~560 lines (incl. tests); ~260 non-test** |

**Net non-test:** **+55 lines.** Marginal net add, but the architectural cleanup (split + reactive identity) is high-value. With the dead `lib/redux/features/user/userSlice.ts` deletion, this likely lands net-negative.

## 10. Definition of Done

1. New slices mounted; `state.user` is undefined.
2. All ~85 consumer files compile and test green.
3. `lib/globalState.ts` is deleted.
4. `app/Providers.tsx::setGlobalUserId` is deleted.
5. `lib/redux/entity/utils/direct-schema.ts` accepts userId as parameter.
6. `userProfilePolicy` boots from localStorage on cold start; persisted body matches `partialize` output.
7. Jest: ≥ 110 tests green under jsdom.
8. Grep verification: zero `state.user.<field>` reads in app code; zero `from "@/lib/globalState"` imports.
9. `phase-4-verification.md` documents the manual browser checklist (cold-boot persistence, identity swap, sign-in/out flow, admin UI continuity).
10. Net-lines report.
