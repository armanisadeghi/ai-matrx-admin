/**
 * lib/sync/policies/presets.ts
 *
 * Preset capability descriptors. Phase 1 supports three presets; Phase 2 adds
 * `warm-cache`, Phase 11 adds `live-data`.
 *
 * These descriptors drive the validation rules in `definePolicy()` and the
 * branching in the middleware (broadcast vs. persist vs. debounce).
 *
 * Keep this file declarative — no side effects, no imports from engine/.
 */

import type { PresetName } from "../types";

/**
 * Capabilities for a single preset. All flags intentionally explicit so a
 * reader can answer "does this preset broadcast?" without chasing code.
 */
export interface PresetCapabilities {
    /** Whether this preset may declare `broadcast.actions`. */
    allowsBroadcast: boolean;
    /** Whether this preset MUST declare at least one broadcast action. */
    requiresBroadcast: boolean;
    /** Whether this preset persists state (and thus accepts storageKey/partialize/serialize/deserialize). */
    persists: boolean;
    /** Whether this preset may declare `prePaint` descriptors. */
    allowsPrePaint: boolean;
    /**
     * Whether this preset may declare `remote.fetch` / `remote.write`.
     * Phase 2: `warm-cache` only. `boot-critical` is deliberately excluded —
     * its sync write-through doesn't tolerate async I/O.
     */
    allowsRemote: boolean;
    /**
     * Whether this preset may declare `staleAfter`. Staleness only makes
     * sense when paired with `remote.fetch` (without it there's no recovery
     * path). So `allowsStaleAfter` implies `allowsRemote`.
     */
    allowsStaleAfter: boolean;
    /**
     * Write strategy for persisted presets.
     *   - "sync": write through synchronously after `next()` (boot-critical).
     *   - "debounced": debounce writes ~150ms + pagehide flush (warm-cache).
     *   - "none": does not persist.
     */
    writeStrategy: "sync" | "debounced" | "none";
    /**
     * Which persistence tier this preset targets.
     *   - "none": no persistence.
     *   - "localStorage": synchronous, small payloads (boot-critical).
     *   - "idb": async, larger payloads, fallback to localStorage (warm-cache).
     */
    storageTier: "none" | "localStorage" | "idb";
}

export const PRESETS: Record<PresetName, PresetCapabilities> = {
    volatile: {
        allowsBroadcast: false,
        requiresBroadcast: false,
        persists: false,
        allowsPrePaint: false,
        allowsRemote: false,
        allowsStaleAfter: false,
        writeStrategy: "none",
        storageTier: "none",
    },
    "ui-broadcast": {
        allowsBroadcast: true,
        requiresBroadcast: true,
        persists: false,
        allowsPrePaint: false,
        allowsRemote: false,
        allowsStaleAfter: false,
        writeStrategy: "none",
        storageTier: "none",
    },
    "boot-critical": {
        allowsBroadcast: true,
        requiresBroadcast: true,
        persists: true,
        allowsPrePaint: true,
        allowsRemote: false,
        allowsStaleAfter: false,
        writeStrategy: "sync",
        storageTier: "localStorage",
    },
    "warm-cache": {
        allowsBroadcast: true,
        // Peer hydration requires at least one broadcast action so responders
        // know what to offer. Enforced in validator.
        requiresBroadcast: true,
        persists: true,
        allowsPrePaint: false,
        allowsRemote: true,
        allowsStaleAfter: true,
        writeStrategy: "debounced",
        storageTier: "idb",
    },
};

export function getPreset(name: PresetName): PresetCapabilities {
    return PRESETS[name];
}
