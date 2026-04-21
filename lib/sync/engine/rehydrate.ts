/**
 * lib/sync/engine/rehydrate.ts
 *
 * The single rehydrate action emitted by the engine. Every slice that opts in
 * via `definePolicy` receives a `sync/rehydrate` action (tagged with
 * `meta.fromRehydrate` or `meta.fromBroadcast`) whose payload is the
 * deserialized slice state. Slices handle it in their reducer via
 * `extraReducers` — they don't write their own loader thunks.
 */

import type { SyncActionMeta } from "../types";

export const REHYDRATE_ACTION_TYPE = "sync/rehydrate";

/**
 * Rehydrate actions are plain objects compatible with RTK's `UnknownAction`
 * (string-indexable). Do not extend `Action<>` directly — the index signature
 * in `UnknownAction` requires any unknown key to be allowed.
 */
export interface RehydrateAction {
    type: typeof REHYDRATE_ACTION_TYPE;
    payload: {
        sliceName: string;
        state: unknown;
    };
    meta: SyncActionMeta;
    [extra: string]: unknown;
}

export function buildRehydrateAction(
    sliceName: string,
    state: unknown,
    meta: SyncActionMeta,
): RehydrateAction {
    return {
        type: REHYDRATE_ACTION_TYPE,
        payload: { sliceName, state },
        meta,
    };
}

export function isRehydrateAction(action: unknown): action is RehydrateAction {
    return (
        action !== null &&
        typeof action === "object" &&
        (action as { type?: unknown }).type === REHYDRATE_ACTION_TYPE
    );
}
