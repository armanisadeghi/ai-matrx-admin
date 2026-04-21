/**
 * lib/sync/engine/middleware.ts
 *
 * The single sync middleware. Behavior per action:
 *   1. next(action)  — state update runs first, so persist + broadcast reflect post-reducer state.
 *   2. Broadcast: if the action type is in a policy's allow-list AND meta.fromBroadcast is falsy, emit.
 *   3. Persist: for boot-critical slices whose state changed, write through synchronously.
 *   4. Incoming channel messages are re-dispatched with meta.fromBroadcast=true by `attachChannel`.
 *
 * Replaces (over time): per-feature broadcast wiring + auto-save middlewares
 * (manifest items 8–14). Delete trigger: Phase 5 for autoSave; ui-broadcast
 * migration retires legacy broadcast plumbing earlier.
 */

import type { Action, Middleware, MiddlewareAPI, Dispatch } from "@reduxjs/toolkit";
import { logger } from "../logger";
import { buildActionMessage, type ActionMessage } from "../messages";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Policy, SyncActionMeta, IdentityKey } from "../types";
import { getPreset } from "../policies/presets";
import { localStorageAdapter } from "../persistence/local-storage";
import { noopAdapter } from "../persistence/noop";
import type { PersistenceAdapter } from "../persistence/types";
import type { SyncChannel } from "../channel";
import { isRehydrateAction } from "./rehydrate";

interface ActionWithMeta {
    type: string;
    payload?: unknown;
    meta?: SyncActionMeta;
}

function hasMetaFromBroadcast(action: unknown): boolean {
    return (
        action !== null &&
        typeof action === "object" &&
        (action as { meta?: SyncActionMeta }).meta?.fromBroadcast === true
    );
}

function adapterFor(policy: Policy<any>): PersistenceAdapter {
    const caps = getPreset(policy.config.preset);
    return caps.persists ? localStorageAdapter : noopAdapter;
}

function selectSliceState(rootState: unknown, sliceName: string): unknown {
    if (rootState === null || typeof rootState !== "object") return undefined;
    return (rootState as Record<string, unknown>)[sliceName];
}

function partialize(state: unknown, keys: readonly PropertyKey[] | undefined): unknown {
    if (!keys || keys.length === 0) return state;
    if (state === null || typeof state !== "object") return state;
    const src = state as Record<PropertyKey, unknown>;
    const out: Record<PropertyKey, unknown> = {};
    for (const k of keys) out[k] = src[k];
    return out;
}

function serializeBody(policy: Policy<any>, sliceState: unknown): unknown {
    const cfg = policy.config;
    const filtered = partialize(sliceState, cfg.partialize as readonly PropertyKey[] | undefined);
    if (typeof cfg.serialize === "function") {
        try {
            return cfg.serialize(filtered as never);
        } catch (err) {
            logger.error("persist.serialize.failed", {
                sliceName: cfg.sliceName,
                meta: { error: err instanceof Error ? err.message : String(err) },
            });
            return null;
        }
    }
    return filtered;
}

export interface SyncMiddlewareContext {
    policies: readonly Policy<any>[];
    channel: SyncChannel;
    getIdentity: () => IdentityKey;
}

/**
 * Build the Redux middleware. The engine owns it; callers pass the context
 * once at store creation.
 */
export function createSyncMiddleware(ctx: SyncMiddlewareContext): Middleware {
    // Index broadcast actions → policies for O(1) lookup.
    const broadcastIndex = new Map<string, Policy<any>>();
    for (const p of ctx.policies) {
        for (const actionType of p.broadcastActions) {
            if (broadcastIndex.has(actionType)) {
                logger.warn("policy.broadcast.duplicate", {
                    meta: { actionType, sliceName: p.config.sliceName },
                });
            }
            broadcastIndex.set(actionType, p);
        }
    }

    // Track previous slice state refs so we only persist when the slice changed.
    const lastPersistedRef = new Map<string, unknown>();

    return (api: MiddlewareAPI) => (next: Dispatch) => (action: unknown) => {
        const result = next(action as Action);

        // Ignore rehydrate echoes and anything without a string type.
        if (
            action === null ||
            typeof action !== "object" ||
            typeof (action as { type?: unknown }).type !== "string"
        ) {
            return result;
        }
        const a = action as ActionWithMeta;

        // --- Broadcast ---
        const broadcastPolicy = broadcastIndex.get(a.type);
        if (broadcastPolicy && !hasMetaFromBroadcast(a)) {
            try {
                const identity = ctx.getIdentity();
                const sliceState = selectSliceState(api.getState(), broadcastPolicy.config.sliceName);
                const msg: ActionMessage = buildActionMessage(
                    identity.key,
                    broadcastPolicy.config.sliceName,
                    broadcastPolicy.config.version,
                    { type: a.type, payload: a.payload },
                );
                ctx.channel.post(msg);
                // Hint to TS — we may use sliceState below.
                void sliceState;
            } catch (err) {
                logger.error("broadcast.emit.failed", {
                    meta: { error: err instanceof Error ? err.message : String(err) },
                });
            }
        }

        // --- Persist (sync write-through for boot-critical) ---
        // Rehydrate actions flow through reducers but must NOT trigger a re-persist.
        if (!isRehydrateAction(a)) {
            for (const policy of ctx.policies) {
                const caps = getPreset(policy.config.preset);
                if (caps.writeStrategy !== "sync") continue;
                // Only write when this action actually targets the slice. A cheap heuristic:
                // the action's slice prefix matches the sliceName (RTK convention: `${sliceName}/...`)
                // OR the slice state object reference changed.
                const sliceState = selectSliceState(api.getState(), policy.config.sliceName);
                if (sliceState === undefined) continue;
                if (lastPersistedRef.get(policy.config.sliceName) === sliceState) continue;
                lastPersistedRef.set(policy.config.sliceName, sliceState);

                const body = serializeBody(policy, sliceState);
                adapterFor(policy).write(policy.storageKey, {
                    version: policy.config.version,
                    identityKey: ctx.getIdentity().key,
                    body,
                });
            }
        }

        return result;
    };
}
