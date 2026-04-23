/**
 * lib/sync/types.ts
 *
 * Shared types for the unified sync / broadcast / persistence engine.
 * See `docs/concepts/full-sync-boardcast-storage/decisions.md` + `phase-1-plan.md`.
 *
 * Replaces (over time): per-feature persistence wrappers, ad-hoc localStorage
 * usage, custom broadcast handling. See decisions.md §8 for the full deletion
 * manifest.
 */

/** Phase 1 supports three presets. Phase 2 adds `warm-cache`; Phase 11 adds `live-data`. */
export type PresetName = "volatile" | "ui-broadcast" | "boot-critical" | "warm-cache";

/**
 * Declarative DOM mutation applied by `SyncBootScript` before first paint.
 * MUST be JSON-serializable — no closures. The inline pre-paint script
 * interprets these without invoking policy functions.
 *
 * A policy may declare one descriptor or an array. Array order is the order
 * the descriptors execute.
 */
export type PrePaintDescriptor =
    | {
          kind: "attribute";
          target: "html" | "body";
          /** e.g. "data-theme" */
          attribute: string;
          /** Key to read from the deserialized payload, e.g. "mode" */
          fromKey: string;
          /** Whitelist of acceptable values; anything else falls through to default/systemFallback. */
          allowed: readonly string[];
          default: string;
          systemFallback?: SystemFallback;
      }
    | {
          kind: "classToggle";
          target: "html" | "body";
          className: string;
          fromKey: string;
          whenEquals: string;
          systemFallback?: SystemFallback;
      };

/**
 * When storage is empty or malformed, the pre-paint script can consult a
 * CSS media query to honour OS preferences (e.g. prefers-color-scheme).
 */
export interface SystemFallback {
    /** Standard CSS media query, e.g. "(prefers-color-scheme: dark)". */
    mediaQuery: string;
    /**
     * classToggle: true = add the class when the MQ matches; false = remove it.
     * attribute: true = set `whenMatchesValue`; false = set `default`.
     */
    applyWhenMatches: boolean;
    /**
     * Attribute variant only. Value to set when the MQ matches. If omitted,
     * `default` is used in both branches (effectively no change).
     */
    whenMatchesValue?: string;
}

/**
 * Policy configuration. One per opt-in slice, colocated with the slice file
 * and registered in `lib/sync/registry.ts`.
 *
 * Generic over the slice's state type so `partialize` keys and `serialize` /
 * `deserialize` signatures are type-checked against the real shape.
 */
export interface PolicyConfig<TState = unknown> {
    /** Unique across the registry. Typically matches the Redux slice name. */
    sliceName: string;
    preset: PresetName;
    /**
     * Schema version. Bump to invalidate cached + peer-offered data.
     *
     * WARNING: until schema-migration helpers land (Q5, Phase 2/6), incrementing
     * `version` silently discards all persisted + peer-offered data for this slice
     * on every client. Only bump when you accept that cost. Document the reason
     * in a comment on the same line.
     */
    version: number;
    broadcast?: {
        /** Exact Redux `action.type` strings that should be broadcast across tabs. */
        actions: readonly string[];
    };

    // ---- Persisted presets only (boot-critical in Phase 1, warm-cache+ later) ----

    /** Defaults to `matrx:${sliceName}`. Explicit for clarity. */
    storageKey?: string;
    /**
     * Positive allow-list of top-level state keys to persist. Unlisted keys
     * stay in memory. Absent = persist all keys.
     *
     * This is NOT an escape hatch — it is how transient UI fields (isLoading,
     * errors, AbortControllers) are excluded from storage while keeping one
     * coherent slice. When auth/security concerns differ semantically, a slice
     * split is still required (see D1).
     */
    partialize?: readonly (keyof TState)[];
    /** Transform slice state → persisted shape. Defaults to identity. */
    serialize?: (state: TState) => unknown;
    /** Transform persisted shape → partial slice state. Defaults to identity. */
    deserialize?: (raw: unknown) => Partial<TState>;

    // ---- boot-critical only ----

    /** Pre-paint DOM mutation(s). Must be declarative / JSON-serializable. */
    prePaint?: PrePaintDescriptor | readonly PrePaintDescriptor[];

    // ---- warm-cache (Phase 2) ------------------------------------------------

    /**
     * If set, the engine schedules a background refresh via `remote.fetch`
     * this many milliseconds after the last rehydrate. Absent = never
     * auto-refresh. Only legal when `remote.fetch` is also declared —
     * staleness without a recovery path would just log errors forever.
     */
    staleAfter?: number;
    /**
     * Per-policy server integration. `warm-cache` policies use these to read
     * from / write to the source of truth (typically Supabase). Legal only on
     * `warm-cache` + future `live-data` presets (validator enforces).
     *
     *   - `fetch`  — cold-boot + stale-refresh + `_sync.refresh()` call path.
     *   - `write`  — debounced write-through on broadcast-listed actions.
     *   - `debounceMs` — default 150, minimum 50. Prevents thundering herd.
     */
    remote?: {
        fetch?: FallbackFn<TState>;
        write?: WriteRemoteFn<TState>;
        debounceMs?: number;
    };
}

/**
 * Context passed to a policy's `remote.fetch`. `identity` is live (follows
 * identity swaps). `signal` aborts when the caller supersedes the read
 * (rapid re-fetch, identity swap, tab hidden).
 */
export interface FallbackContext {
    identity: IdentityKey;
    signal: AbortSignal;
    reason: "cold-boot" | "stale-refresh" | "manual";
}

/**
 * Context passed to a policy's `remote.write`. `body` is the post-reducer,
 * partialize-filtered, serialize-transformed slice state — whatever
 * `serializeBody` produced for the persistence adapter.
 */
export interface WriteContext<TState = unknown> {
    identity: IdentityKey;
    signal: AbortSignal;
    body: TState;
}

/**
 * Result of a fallback read. `null` means "no data upstream; stay on current
 * state". A partial state is merged into the slice via the policy's
 * `deserialize` hook (or shallow-assigned if `deserialize` is absent).
 */
export type FallbackFn<TState> = (
    ctx: FallbackContext,
) => Promise<Partial<TState> | null>;

/** Write sink. Errors are caught + logged; the next change retries. */
export type WriteRemoteFn<TState> = (ctx: WriteContext<TState>) => Promise<void>;

/**
 * A validated, frozen policy. Produced by `definePolicy()`; consumed by the
 * engine. Opaque to callers — they never read fields off it.
 */
export interface Policy<TState = unknown> {
    readonly config: PolicyConfig<TState>;
    /** Narrowed for internal consumption. `readonly` array for array-form prePaint. */
    readonly prePaintDescriptors: readonly PrePaintDescriptor[];
    /** Fully-qualified localStorage/IDB key for the current identity. Assigned at boot. */
    readonly storageKey: string;
    /** Set of action.type values that trigger a broadcast. O(1) lookups. */
    readonly broadcastActions: ReadonlySet<string>;
}

/**
 * Result of a pre-paint evaluation for a single descriptor. Exposed for tests
 * and observability; production code never constructs these by hand.
 */
export interface PrePaintResult {
    /** Which descriptor produced this result (index into `prePaintDescriptors`). */
    descriptorIndex: number;
    /** What source of truth produced the applied value. */
    source: "storage" | "systemFallback" | "default" | "removed";
    /** The value written to the DOM, or null for classToggle removal. */
    appliedValue: string | null;
}

/**
 * Identity key uniquely scopes all caches + broadcasts. Every message and every
 * persisted record is stamped with one of these.
 */
export type IdentityKey =
    | { type: "auth"; userId: string; key: `auth:${string}` }
    | { type: "guest"; fingerprintId: string; key: `guest:${string}` };

/**
 * Broadcast-inbound actions are tagged on `action.meta` (FSA-compliant) to
 * prevent the middleware from re-emitting them. Metadata never lives on the
 * action root.
 */
export interface SyncActionMeta {
    /** true on actions dispatched as a result of inbound broadcast. */
    fromBroadcast?: boolean;
    /** true on actions dispatched as a result of local rehydrate (boot). */
    fromRehydrate?: boolean;
}
