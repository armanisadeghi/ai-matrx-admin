/**
 * In-memory cache for compiled dynamic tool renderers.
 *
 * Components are cached by tool_name + version. The cache has a configurable
 * TTL (default 30 minutes) after which entries are considered stale and will
 * be re-fetched on next access.
 *
 * The cache is session-scoped (lives in the browser tab). A full page refresh
 * clears it, which is fine since compilation is fast (~10-50ms).
 */

import type { CacheEntry, CompiledToolRenderer } from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_CACHE_SIZE = 200; // max entries before eviction

// ---------------------------------------------------------------------------
// Cache store
// ---------------------------------------------------------------------------

const cache = new Map<string, CacheEntry>();

/** Tracks which tools are currently being fetched (dedup in-flight requests) */
const inflight = new Map<string, Promise<CompiledToolRenderer | null>>();

/** Set of tool_names known to have NO dynamic component in the database */
const negativeLookupCache = new Set<string>();
const NEGATIVE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const negativeLookupTimestamps = new Map<string, number>();

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

function cacheKey(toolName: string, version?: string): string {
    return version ? `${toolName}@${version}` : toolName;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a compiled renderer from cache.
 * Returns null if not cached or if the entry has expired.
 */
export function getCachedRenderer(
    toolName: string
): CompiledToolRenderer | null {
    // Check all entries for this tool (any version)
    for (const [key, entry] of cache) {
        if (key === toolName || key.startsWith(`${toolName}@`)) {
            const age = Date.now() - entry.fetchedAt;
            if (age < DEFAULT_TTL_MS) {
                return entry.compiled;
            }
            // Stale — remove
            cache.delete(key);
        }
    }
    return null;
}

/**
 * Store a compiled renderer in cache.
 */
export function setCachedRenderer(compiled: CompiledToolRenderer): void {
    const key = cacheKey(compiled.toolName, compiled.version);

    // Evict oldest entries if at capacity
    if (cache.size >= MAX_CACHE_SIZE) {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        for (const [k, entry] of cache) {
            if (entry.fetchedAt < oldestTime) {
                oldestTime = entry.fetchedAt;
                oldestKey = k;
            }
        }
        if (oldestKey) cache.delete(oldestKey);
    }

    cache.set(key, {
        compiled,
        fetchedAt: Date.now(),
        version: compiled.version,
    });

    // Clear negative lookup if it existed
    negativeLookupCache.delete(compiled.toolName);
    negativeLookupTimestamps.delete(compiled.toolName);
}

/**
 * Invalidate cache for a specific tool (e.g. after admin updates the code).
 */
export function invalidateCachedRenderer(toolName: string): void {
    for (const key of cache.keys()) {
        if (key === toolName || key.startsWith(`${toolName}@`)) {
            cache.delete(key);
        }
    }
    negativeLookupCache.delete(toolName);
    negativeLookupTimestamps.delete(toolName);
}

/**
 * Clear the entire cache.
 */
export function clearRendererCache(): void {
    cache.clear();
    inflight.clear();
    negativeLookupCache.clear();
    negativeLookupTimestamps.clear();
}

// ---------------------------------------------------------------------------
// Negative lookup cache (tool has no dynamic component)
// ---------------------------------------------------------------------------

/**
 * Check if we already know this tool has no dynamic component.
 */
export function isKnownNoDynamic(toolName: string): boolean {
    if (!negativeLookupCache.has(toolName)) return false;

    const ts = negativeLookupTimestamps.get(toolName) || 0;
    if (Date.now() - ts > NEGATIVE_TTL_MS) {
        negativeLookupCache.delete(toolName);
        negativeLookupTimestamps.delete(toolName);
        return false;
    }

    return true;
}

/**
 * Record that a tool has no dynamic component in the database.
 */
export function setNoDynamic(toolName: string): void {
    negativeLookupCache.add(toolName);
    negativeLookupTimestamps.set(toolName, Date.now());
}

// ---------------------------------------------------------------------------
// In-flight deduplication
// ---------------------------------------------------------------------------

/**
 * Get an existing in-flight fetch promise for a tool.
 */
export function getInflight(
    toolName: string
): Promise<CompiledToolRenderer | null> | null {
    return inflight.get(toolName) || null;
}

/**
 * Register an in-flight fetch promise.
 */
export function setInflight(
    toolName: string,
    promise: Promise<CompiledToolRenderer | null>
): void {
    inflight.set(toolName, promise);
    // Auto-clean when done
    promise.finally(() => {
        inflight.delete(toolName);
    });
}

// ---------------------------------------------------------------------------
// Stats (for debugging / admin)
// ---------------------------------------------------------------------------

export function getCacheStats(): {
    size: number;
    maxSize: number;
    negativeLookups: number;
    inflight: number;
} {
    return {
        size: cache.size,
        maxSize: MAX_CACHE_SIZE,
        negativeLookups: negativeLookupCache.size,
        inflight: inflight.size,
    };
}
