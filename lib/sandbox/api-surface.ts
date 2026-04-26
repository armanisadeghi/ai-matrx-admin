/**
 * Client-side capability cache for the sandbox orchestrator.
 *
 * `GET /api-surface` returns the authoritative route list for a tier (it
 * includes `{path:path}` catchalls, which `/openapi.json` does not). Use this
 * helper anywhere the UI needs to feature-detect — Source Control panel,
 * Ports tab, PTY enablement — so a tier rollback degrades gracefully instead
 * of producing 404s.
 *
 * The descriptor is small (~3 KB) and stable per orchestrator deploy. We
 * cache it in memory for the page session and back the in-memory cache with
 * sessionStorage so a hard navigation reuses the previous fetch.
 *
 * This module is browser-friendly — it talks to /api/sandbox/api-surface,
 * not directly to the orchestrator.
 */

import type { SandboxTier } from "@/types/sandbox";

export interface ApiSurfaceRoute {
    path: string;
    methods: string[];
    name: string;
    kind: "http" | "websocket";
}

export interface ApiSurface {
    service: string;
    version: string;
    tier: SandboxTier;
    routes: ApiSurfaceRoute[];
    /** Fast lookup by route name. Built locally on first access. */
    byName: Set<string>;
    /** Fast lookup by path pattern. */
    byPath: Set<string>;
}

const memoryCache = new Map<SandboxTier, Promise<ApiSurface>>();
const STORAGE_KEY_PREFIX = "matrx:sandbox:api-surface:";
const STORAGE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StoredSurface {
    fetchedAt: number;
    surface: Omit<ApiSurface, "byName" | "byPath">;
}

function readStored(tier: SandboxTier): ApiSurface | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY_PREFIX + tier);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredSurface;
        if (!parsed?.surface || Date.now() - parsed.fetchedAt > STORAGE_TTL_MS) {
            return null;
        }
        return hydrate(parsed.surface);
    } catch {
        return null;
    }
}

function writeStored(tier: SandboxTier, surface: ApiSurface): void {
    if (typeof window === "undefined") return;
    try {
        const stored: StoredSurface = {
            fetchedAt: Date.now(),
            surface: {
                service: surface.service,
                version: surface.version,
                tier: surface.tier,
                routes: surface.routes,
            },
        };
        window.sessionStorage.setItem(
            STORAGE_KEY_PREFIX + tier,
            JSON.stringify(stored),
        );
    } catch {
        /* storage may be full or disabled; ignore */
    }
}

function hydrate(
    raw: Omit<ApiSurface, "byName" | "byPath">,
): ApiSurface {
    const byName = new Set<string>();
    const byPath = new Set<string>();
    for (const route of raw.routes) {
        if (route.name) byName.add(route.name);
        if (route.path) byPath.add(route.path);
    }
    return { ...raw, byName, byPath };
}

/**
 * Fetch (or return cached) capability descriptor for the given tier. Resolves
 * to `null` only when the orchestrator is unreachable — callers should treat
 * `null` as "feature support unknown, fall back to safe behaviour".
 */
export async function fetchApiSurface(
    tier: SandboxTier,
): Promise<ApiSurface | null> {
    const cached = memoryCache.get(tier);
    if (cached) return cached;

    const fromStorage = readStored(tier);
    if (fromStorage) {
        const ready = Promise.resolve(fromStorage);
        memoryCache.set(tier, ready);
        return ready;
    }

    const promise = (async () => {
        const resp = await fetch(
            `/api/sandbox/api-surface?tier=${encodeURIComponent(tier)}`,
            { method: "GET" },
        );
        if (!resp.ok) {
            throw new Error(
                `api-surface ${tier} failed (${resp.status}): ${await resp
                    .text()
                    .catch(() => resp.statusText)}`,
            );
        }
        const raw = (await resp.json()) as Omit<ApiSurface, "byName" | "byPath">;
        const surface = hydrate(raw);
        writeStored(tier, surface);
        return surface;
    })();

    // Cache the promise itself so concurrent callers share the in-flight fetch.
    memoryCache.set(tier, promise);
    try {
        return await promise;
    } catch (err) {
        memoryCache.delete(tier); // allow a retry on next call
        if (process.env.NODE_ENV === "development") {
            console.warn(`[api-surface] ${tier} fetch failed:`, err);
        }
        return null;
    }
}

/**
 * Invalidate the cached descriptor for a tier (e.g. after a deploy). Pass no
 * argument to invalidate every tier.
 */
export function invalidateApiSurface(tier?: SandboxTier): void {
    if (tier) {
        memoryCache.delete(tier);
        if (typeof window !== "undefined") {
            try {
                window.sessionStorage.removeItem(STORAGE_KEY_PREFIX + tier);
            } catch {
                /* ignore */
            }
        }
        return;
    }
    memoryCache.clear();
    if (typeof window !== "undefined") {
        try {
            for (const key of Object.keys(window.sessionStorage)) {
                if (key.startsWith(STORAGE_KEY_PREFIX)) {
                    window.sessionStorage.removeItem(key);
                }
            }
        } catch {
            /* ignore */
        }
    }
}

/**
 * Convenience: does the tier expose a route with this `name`? Names come from
 * the orchestrator's FastAPI route registration (e.g. `proxy_pty`,
 * `proxy_fs`, `proxy_git`). Returns `false` only when the descriptor is
 * loaded and the route is missing — `null` (descriptor unreachable) returns
 * the `defaultIfUnknown` value so callers can pick fail-open or fail-closed.
 */
export async function hasRouteName(
    tier: SandboxTier,
    name: string,
    defaultIfUnknown = true,
): Promise<boolean> {
    const surface = await fetchApiSurface(tier);
    if (!surface) return defaultIfUnknown;
    return surface.byName.has(name);
}
