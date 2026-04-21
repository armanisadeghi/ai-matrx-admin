/**
 * lib/sync/identity.ts
 *
 * Identity key derivation. Wraps the existing fingerprint service — does NOT
 * reinvent identity (Constitution II, one canonical implementation).
 *
 * Every persisted record + every broadcast message carries an `identityKey`
 * of the form `auth:{userId}` or `guest:{fingerprintId}`. This scopes all
 * caches so an identity swap cannot leak data.
 *
 * Phase 1 surface: `deriveIdentity()` from a user id + cached fingerprint.
 * Phase 4 will extend this with a reactive Supabase auth-state listener +
 * identity-change events (replacing the imperative `setGlobalUserId` pattern
 * in `app/Providers.tsx`).
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
