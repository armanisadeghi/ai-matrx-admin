/**
 * lib/sync/index.ts
 *
 * Public entry point for the sync engine. Slice authors import `definePolicy`;
 * the store wires in `createSyncMiddleware`; `app/Providers.tsx` calls
 * `bootSync`; `app/layout.tsx` renders `<SyncBootScript />`.
 *
 * Nothing else should be imported from deeper paths (`lib/sync/engine/*`,
 * `lib/sync/persistence/*`, etc.) outside the engine itself — those are
 * implementation detail.
 */

export { definePolicy } from "./policies/define";
export { createSyncMiddleware } from "./engine/middleware";
export { bootSync } from "./engine/boot";
export { SyncBootScript } from "./components/SyncBootScript";
export { deriveIdentity, identityEquals, GUEST_UNKNOWN_KEY } from "./identity";
export { REHYDRATE_ACTION_TYPE, isRehydrateAction } from "./engine/rehydrate";
export { syncPolicies } from "./registry";
export { logger as syncLogger } from "./logger";

export type {
    PresetName,
    PolicyConfig,
    Policy,
    PrePaintDescriptor,
    PrePaintResult,
    SystemFallback,
    IdentityKey,
    SyncActionMeta,
} from "./types";
export type { SyncMessage } from "./messages";
export type { RehydrateAction } from "./engine/rehydrate";
