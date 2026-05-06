/**
 * lazy-bundle-guard
 *
 * Detects when a window-panel core file (WindowPanel, OverlaySurface,
 * windowRegistry) is parsed during the initial app boot bundle instead of
 * a lazy chunk.
 *
 * Mechanism — exploits the JS event-loop ordering:
 *   1. This module sets `bootInProgress = true` synchronously when first
 *      imported, then schedules a setTimeout(0) macrotask that flips it
 *      false at the end of the current event-loop turn.
 *   2. Any module that calls `assertLazyLoaded()` queues a microtask that
 *      checks the flag. Microtasks run BEFORE the next macrotask.
 *
 * Boot-bundle case (BAD): everything parses in one synchronous turn.
 *   - Guard schedules its macrotask.
 *   - WindowPanel asserts → microtask queued.
 *   - Sync turn ends → microtasks run → flag is still `true` → ERROR.
 *   - Macrotask runs → flag flips to false (too late, already errored).
 *
 * Lazy-chunk case (GOOD): chunk loads in a later event-loop turn.
 *   - Boot completed, macrotask already fired, flag is `false`.
 *   - WindowPanel parses, asserts → microtask queued.
 *   - Microtask runs → flag is `false` → silent.
 *
 * Hard requirement: this module MUST be imported by the boot bundle so
 * its macrotask is scheduled DURING boot (not later). `app/Providers.tsx`
 * adds a side-effect import of this file. Without that, a lazy chunk
 * would load this module fresh and false-positive itself (since its own
 * macrotask wouldn't have fired yet).
 *
 * Why we need this: window-panel files transitively pull in 100+
 * `componentImport: () => import(...)` lazy references plus the full
 * tray-preview JSX. Static-importing any of them from a route would
 * collapse all those lazy chunks into the route bundle — silent
 * regression that the existing `pnpm check:bundle` size-gate may not
 * always notice (depends on threshold).
 */

// HMR-resistant boot tracking. `bootInProgress` is per-module-instance, so
// HMR re-evaluating this file would reset it and false-positive every
// edit. Persist the post-boot state on `window` so HMR re-evaluations
// pick up the already-flipped value. Also dedupe reports per session so
// the dev console isn't buried by repeat firings on every file save.
declare global {
    interface Window {
        __WP_BOOT_DONE__?: boolean;
        __WP_LEAK_REPORTED__?: Set<string>;
    }
}

let bootInProgress: boolean;

if (typeof window === "undefined") {
    // SSR — never asserts, value doesn't matter.
    bootInProgress = false;
} else if (window.__WP_BOOT_DONE__) {
    // Already finished boot in a previous module instance (HMR re-eval).
    bootInProgress = false;
} else {
    bootInProgress = true;
    setTimeout(() => {
        bootInProgress = false;
        window.__WP_BOOT_DONE__ = true;
    }, 0);
}

/**
 * Assert that the calling module has been parsed in a lazy chunk, not in
 * the initial app boot bundle. Call once at module top-level.
 *
 * In dev: logs a loud red banner + stack trace.
 * In prod: logs a single console.error so it surfaces in error tracking.
 *
 * SSR: silently returns — module evaluation on the server is expected
 * (Server Components, prerendering).
 */
export function assertLazyLoaded(moduleId: string): void {
    if (typeof window === "undefined") return;

    queueMicrotask(() => {
        if (!bootInProgress) return;

        // Dedupe per session. Without this, every re-evaluation (HMR, Fast
        // Refresh, route remount) re-fires for the same moduleId.
        const reported = (window.__WP_LEAK_REPORTED__ ??= new Set());
        if (reported.has(moduleId)) return;
        reported.add(moduleId);

        const message =
            `${moduleId} was parsed during initial app boot. ` +
            `Window-panel files MUST be loaded via the registry's ` +
            `lazy componentImport — never statically imported from a ` +
            `route, layout, provider, or any module in the boot graph. ` +
            `This collapses 100+ lazy chunks into the route bundle. ` +
            `See features/window-panels/FEATURE.md → "Bundle invariant". ` +
            `(Reported once per session per moduleId.)`;

        if (process.env.NODE_ENV === "development") {
            console.error(
                "%c[WINDOW-PANELS BUNDLE LEAK]",
                "background:#b91c1c;color:white;padding:6px 10px;font-size:13px;font-weight:bold;border-radius:3px;",
                "\n" + message,
            );
            // eslint-disable-next-line no-console
            console.trace("eager import stack:");
        } else {
            console.error("[WINDOW-PANELS BUNDLE LEAK] " + message);
        }
    });
}
