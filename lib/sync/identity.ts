/**
 * lib/sync/identity.ts
 *
 * Identity key derivation + reactive identity source. Wraps the existing
 * fingerprint service — does NOT reinvent identity (Constitution II, one
 * canonical implementation).
 *
 * Every persisted record + every broadcast message carries an `identityKey`
 * of the form `auth:{userId}` or `guest:{fingerprintId}`. This scopes all
 * caches so an identity swap cannot leak data.
 *
 * Phase 1 surface: `deriveIdentity()` from a user id + cached fingerprint.
 * Phase 4 surface (this file): `attachStore()`, `getIdentity()`,
 * `getIdentityContext()`, `onIdentityChange()` — replaces the imperative
 * `lib/globalState.ts` and `app/Providers.tsx::setGlobalUserId` patterns.
 * The Redux store is the single source of truth; non-React consumers
 * read synchronously via `getIdentityContext()` instead of from a
 * mutable global cache.
 *
 * A future phase (11) wires a Supabase auth-state listener that drives
 * identity changes automatically on sign-in/out — Phase 4 keeps the
 * existing boot-time seed pattern but routes it through Redux preloaded
 * state, not through `setGlobalUserId`.
 */

import { getCachedFingerprint } from "@/lib/services/fingerprint-service";
import type { IdentityKey } from "./types";

export type IdentitySource = {
    /** Signed-in user id, if any. Null/undefined → guest. */
    userId?: string | null;
    /**
     * Cached fingerprint for guests. If omitted, we consult the fingerprint
     * service synchronously; if that also returns null, the identity is a
     * safe sentinel `guest:unknown` which still isolates from every real
     * identity (no message with a real id will ever match it).
     */
    fingerprintId?: string | null;
};

const GUEST_UNKNOWN = "unknown";

/**
 * Produce the `IdentityKey` for the current identity source.
 *
 * Deterministic + synchronous — callers can use this from `bootSync`'s
 * awaited localStorage pass without introducing async gates (R1).
 */
export function deriveIdentity(source: IdentitySource = {}): IdentityKey {
    if (source.userId) {
        return { type: "auth", userId: source.userId, key: `auth:${source.userId}` };
    }
    const fp = source.fingerprintId ?? getCachedFingerprint() ?? GUEST_UNKNOWN;
    return { type: "guest", fingerprintId: fp, key: `guest:${fp}` };
}

/** Stable equality check used when deciding whether to purge caches on swap. */
export function identityEquals(a: IdentityKey, b: IdentityKey): boolean {
    return a.key === b.key;
}

/** Sentinel used when no fingerprint has been generated yet. Exported for tests. */
export const GUEST_UNKNOWN_KEY: `guest:${typeof GUEST_UNKNOWN}` = `guest:${GUEST_UNKNOWN}`;

// ───────────────────────────────────────────────────────────────────────────
// Reactive identity source (Phase 4 PR 4.C)
// ───────────────────────────────────────────────────────────────────────────
//
// The identity reactor is **store-aware** but **store-agnostic**: we expect
// a Redux-like object with `getState()` + `subscribe(cb)`. We do NOT import
// `AppStore` from `@/lib/redux/store` here because that file imports this
// module — a circular dependency that Turbopack resolves at runtime as
// undefined. Using a duck-typed `IdentityStore` interface avoids the cycle.
//
// State shape expected: `state.userAuth.id`, `state.userAuth.accessToken`,
// `state.userAuth.isAdmin`, `state.userProfile.fingerprintId`. After Phase 4
// the slice split makes these the canonical fields.

interface IdentityStore {
    getState: () => {
        userAuth?: {
            id?: string | null;
            accessToken?: string | null;
            isAdmin?: boolean;
        };
        userProfile?: {
            fingerprintId?: string | null;
        };
    };
    subscribe: (listener: () => void) => () => void;
}

let storeRef: IdentityStore | null = null;
let lastIdentityKey: string | null = null;
const identitySubscribers = new Set<(next: IdentityKey) => void>();

/**
 * Wire the store into the identity reactor. Called once from
 * `providers/StoreProvider.tsx::getOrCreateClientStore` after store
 * creation. Idempotent — subsequent calls re-subscribe but the
 * subscription set is keyed by store identity so the older subscription
 * naturally releases when the older store is garbage collected.
 *
 * Replaces: `lib/globalState.ts::setGlobalUserIdAndToken` (deleted) +
 * `app/Providers.tsx::setGlobalUserId` (deleted) — both were imperative
 * mutable globals that the user code had to remember to update on auth
 * changes. Reactive source means non-React consumers always see the
 * current Redux state.
 */
export function attachStore(store: IdentityStore): void {
    storeRef = store;
    // Seed lastIdentityKey from the initial state so we don't fire a
    // spurious onIdentityChange on the first dispatch.
    lastIdentityKey = computeIdentityKey(store);

    store.subscribe(() => {
        const next = computeIdentityKey(store);
        if (next !== lastIdentityKey) {
            lastIdentityKey = next;
            const identity = getIdentity();
            identitySubscribers.forEach((cb) => cb(identity));
        }
    });
}

function computeIdentityKey(store: IdentityStore): string {
    const s = store.getState();
    return deriveIdentity({
        userId: s.userAuth?.id ?? null,
        fingerprintId: s.userProfile?.fingerprintId ?? null,
    }).key;
}

/**
 * Get the live `IdentityKey`. Pre-attach (during the brief window between
 * module load and store creation), returns a guest sentinel that's safe
 * to use — no real identity will ever match it.
 */
export function getIdentity(): IdentityKey {
    if (!storeRef) return deriveIdentity();
    const s = storeRef.getState();
    return deriveIdentity({
        userId: s.userAuth?.id ?? null,
        fingerprintId: s.userProfile?.fingerprintId ?? null,
    });
}

/**
 * Snapshot helper for non-React consumers (entity sagas, server-side
 * util functions). Returns `userId`, `accessToken`, `isAdmin` from the
 * current Redux state.
 *
 * Replaces: `lib/globalState.ts::getGlobalUserIdAndToken` and the
 * `getGlobalUserId` / `getGlobalIsAdmin` / `getGlobalAccessToken`
 * primitive getters (all deleted).
 */
export function getIdentityContext(): {
    userId: string | null;
    accessToken: string | null;
    isAdmin: boolean;
} {
    if (!storeRef) {
        return { userId: null, accessToken: null, isAdmin: false };
    }
    const s = storeRef.getState();
    return {
        userId: s.userAuth?.id ?? null,
        accessToken: s.userAuth?.accessToken ?? null,
        isAdmin: s.userAuth?.isAdmin ?? false,
    };
}

/**
 * Subscribe to identity changes. Returns an unsubscribe function. Used
 * by sync-engine internals that need to react to sign-in/out without
 * holding a Redux subscription themselves.
 */
export function onIdentityChange(cb: (next: IdentityKey) => void): () => void {
    identitySubscribers.add(cb);
    return () => {
        identitySubscribers.delete(cb);
    };
}

/**
 * Test-only: detach the store + reset subscribers. Each Jest test that
 * calls `attachStore` should call this in `afterEach` to avoid leaking
 * subscriptions across tests.
 */
export function __resetIdentityForTesting(): void {
    storeRef = null;
    lastIdentityKey = null;
    identitySubscribers.clear();
}
