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
     * Write strategy for persisted presets.
     *   - "sync": write through synchronously after `next()` (boot-critical).
     *   - "debounced": debounce writes ~100ms + pagehide flush (warm-cache, Phase 2+).
     *   - "none": does not persist.
     */
    writeStrategy: "sync" | "debounced" | "none";
}

export const PRESETS: Record<PresetName, PresetCapabilities> = {
    volatile: {
        allowsBroadcast: false,
        requiresBroadcast: false,
        persists: false,
        allowsPrePaint: false,
        writeStrategy: "none",
    },
    "ui-broadcast": {
        allowsBroadcast: true,
        requiresBroadcast: true,
        persists: false,
        allowsPrePaint: false,
        writeStrategy: "none",
    },
    "boot-critical": {
        allowsBroadcast: true,
        requiresBroadcast: true,
        persists: true,
        allowsPrePaint: true,
        writeStrategy: "sync",
    },
};

export function getPreset(name: PresetName): PresetCapabilities {
    return PRESETS[name];
}
