/**
 * lib/sync/engine/boot.ts
 *
 * `bootSync(store, identity)` — invoked by Providers before children render.
 * The awaited portion is strictly synchronous localStorage work (R1). Peer
 * hydration and (Phase 2+) IDB reads run in the background.
 *
 * Lifecycle (awaited):
 *   1. Open the channel.
 *   2. One-shot legacy-key migration (theme only in Phase 1; list is explicit).
 *   3. For each boot-critical policy: read localStorage; if version + identity
 *      match, dispatch rehydrate with meta.fromRehydrate=true.
 *   4. Register channel message listener (translates inbound ACTION messages
 *      into local dispatches with meta.fromBroadcast=true).
 *   5. Resolve.
 *
 * Background (not awaited):
 *   - Broadcast HYDRATE_REQUEST for broadcast-enabled slices (peer hydration).
 */

import type { Store } from "@reduxjs/toolkit";
import { logger } from "../logger";
import { openSyncChannel, type SyncChannel } from "../channel";
import { localStorageAdapter, readLegacyKey, removeLegacyKey } from "../persistence/local-storage";
import { getPreset } from "../policies/presets";
import { buildRehydrateAction } from "./rehydrate";
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IdentityKey, Policy } from "../types";

/**
 * Legacy-key migrations. One-shot, executed inside `bootSync`. After Phase 1
 * every entry here is the pre-sync-engine localStorage key that the new engine
 * now owns. Adding to this list outside of a phase plan is a Constitution
 * violation.
 */
interface LegacyMigration {
    legacyKey: string;
    targetSliceName: string;
    /** Build the new record body from the raw legacy string value. Return null to skip. */
    migrate: (raw: string) => unknown | null;
}

export const LEGACY_MIGRATIONS: readonly LegacyMigration[] = [
    {
        legacyKey: "theme",
        targetSliceName: "theme",
        migrate: (raw) => (raw === "light" ? { mode: "light" } : { mode: "dark" }),
    },
];

export interface BootOptions {
    store: Store;
    identity: IdentityKey;
    policies: readonly Policy<any>[];
    /** Override for tests. Defaults to `openSyncChannel`. */
    openChannel?: (identity: IdentityKey) => SyncChannel;
}

export interface BootResult {
    channel: SyncChannel;
    /** Keys of slices that rehydrated from localStorage. */
    hydratedFromStorage: readonly string[];
    /** Number of legacy migrations that ran. */
    legacyMigrated: number;
}

function runLegacyMigrations(policies: readonly Policy<any>[], identity: IdentityKey): number {
    let migrated = 0;
    const bySlice = new Map(policies.map((p) => [p.config.sliceName, p] as const));

    for (const m of LEGACY_MIGRATIONS) {
        const raw = readLegacyKey(m.legacyKey);
        if (raw == null) continue;
        const policy = bySlice.get(m.targetSliceName);
        if (!policy) continue;

        const body = m.migrate(raw);
        if (body == null) {
            removeLegacyKey(m.legacyKey);
            continue;
        }
        localStorageAdapter.write(policy.storageKey, {
            version: policy.config.version,
            identityKey: identity.key,
            body,
        });
        removeLegacyKey(m.legacyKey);
        migrated += 1;
        logger.info("boot.legacy.migrated", {
            sliceName: m.targetSliceName,
            meta: { legacyKey: m.legacyKey },
        });
    }
    return migrated;
}

function rehydrateFromStorage(
    policies: readonly Policy<any>[],
    identity: IdentityKey,
    store: Store,
): string[] {
    const hydrated: string[] = [];
    for (const policy of policies) {
        const caps = getPreset(policy.config.preset);
        if (!caps.persists) continue;
        const record = localStorageAdapter.read(policy.storageKey);
        if (!record) {
            logger.debug("boot.localStorage.miss", { sliceName: policy.config.sliceName });
            continue;
        }
        if (record.version !== policy.config.version) {
            logger.info("boot.localStorage.versionMismatch", {
                sliceName: policy.config.sliceName,
                meta: { got: record.version, want: policy.config.version },
            });
            localStorageAdapter.remove(policy.storageKey);
            continue;
        }
        if (record.identityKey !== identity.key) {
            logger.info("boot.localStorage.identityMismatch", {
                sliceName: policy.config.sliceName,
            });
            continue;
        }

        let state: unknown = record.body;
        if (typeof policy.config.deserialize === "function") {
            try {
                state = policy.config.deserialize(record.body);
            } catch (err) {
                logger.error("boot.deserialize.failed", {
                    sliceName: policy.config.sliceName,
                    meta: { error: err instanceof Error ? err.message : String(err) },
                });
                continue;
            }
        }
        store.dispatch(
            buildRehydrateAction(policy.config.sliceName, state, { fromRehydrate: true }),
        );
        hydrated.push(policy.config.sliceName);
        logger.debug("boot.localStorage.hit", { sliceName: policy.config.sliceName });
    }
    return hydrated;
}

function attachChannelListener(
    channel: SyncChannel,
    policies: readonly Policy<any>[],
    store: Store,
): void {
    const bySlice = new Map(policies.map((p) => [p.config.sliceName, p] as const));

    channel.subscribe((msg) => {
        if (msg.type === "ACTION") {
            const policy = bySlice.get(msg.sliceName);
            if (!policy) {
                logger.debug("broadcast.unknownSlice", { meta: { sliceName: msg.sliceName } });
                return;
            }
            if (msg.version !== policy.config.version) {
                logger.debug("broadcast.versionMismatch", {
                    sliceName: msg.sliceName,
                    meta: { got: msg.version, want: policy.config.version },
                });
                return;
            }
            // Re-dispatch with meta.fromBroadcast=true so the middleware does not re-emit.
            store.dispatch({
                type: msg.action.type,
                payload: msg.action.payload,
                meta: { fromBroadcast: true },
            });
            logger.debug("broadcast.receive", {
                sliceName: msg.sliceName,
                meta: { type: msg.action.type },
            });
            return;
        }
        // HYDRATE_REQUEST / HYDRATE_RESPONSE handling lands in a follow-up commit
        // inside PR 1.A. Phase 1 requirement §5.3 step: background peer request.
        // Skeleton-only for now so the channel type stays accepted.
        logger.debug("broadcast.receive", { meta: { type: msg.type } });
    });
}

/**
 * Synchronous boot. The caller awaits the returned promise, but the work
 * inside is synchronous — the promise is already resolved. The `async`
 * signature preserves the option to add awaited sources in later phases
 * (cookies in Phase 3) without breaking callers.
 */
export async function bootSync(options: BootOptions): Promise<BootResult> {
    const started = typeof performance !== "undefined" ? performance.now() : 0;
    const { store, identity, policies } = options;
    const openChannel = options.openChannel ?? openSyncChannel;

    logger.info("boot.start", { meta: { identity: identity.key, policyCount: policies.length } });

    const channel = openChannel(identity);
    const legacyMigrated = runLegacyMigrations(policies, identity);
    const hydratedFromStorage = rehydrateFromStorage(policies, identity, store);
    attachChannelListener(channel, policies, store);

    const elapsed = typeof performance !== "undefined" ? performance.now() - started : 0;
    logger.info("boot.complete", {
        ms: elapsed,
        meta: { hydrated: hydratedFromStorage.length, legacyMigrated },
    });

    return { channel, hydratedFromStorage, legacyMigrated };
}
