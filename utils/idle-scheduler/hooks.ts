/**
 * React hooks for the IdleScheduler.
 *
 * These are intentionally thin — they just wire up registration/cleanup
 * to React's lifecycle. No state, no context, no re-renders on registration.
 *
 * Three hooks for three use cases:
 *
 * 1. useIdleTask(key, priority, callback)
 *    → "Run this callback when idle. I don't need to know when."
 *    → Fire-and-forget. Zero re-renders.
 *
 * 2. useIdleReady(priority?)
 *    → "Just tell me when idle flush is done so I can wake up."
 *    → Returns a boolean. One re-render: false → true.
 *
 * 3. useIdleGate(key, priority, callback)
 *    → "Run this callback when idle AND tell me when it's done."
 *    → Returns { ready: boolean }. Combines both patterns.
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
    registerIdleTask,
    onFlushComplete,
    type IdlePriority,
} from './idle-scheduler';

// ---------------------------------------------------------------------------
// useIdleTask — fire-and-forget deferred work
// ---------------------------------------------------------------------------

/**
 * Register a callback to execute after page idle. Zero re-renders.
 *
 * @param key   Unique identifier (for deduplication/cancellation)
 * @param priority  1 (first of last) through 5 (absolute last)
 * @param callback  The deferred work
 *
 * @example
 * ```tsx
 * useIdleTask('analytics-init', 3, () => {
 *   initializeAnalytics();
 * });
 * ```
 */
export function useIdleTask(
    key: string,
    priority: IdlePriority,
    callback: () => void | Promise<void>
): void {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        const unregister = registerIdleTask(key, priority, () => {
            return callbackRef.current();
        });
        return unregister;
    }, [key, priority]);
}

// ---------------------------------------------------------------------------
// useIdleReady — "am I allowed to wake up yet?"
// ---------------------------------------------------------------------------

/**
 * Returns `true` once the idle flush has completed.
 * Causes exactly one re-render (false → true). No work is registered.
 *
 * Use this when a component wants to stay dormant (show nothing, or a skeleton)
 * until the page is fully settled, then "turn on."
 *
 * @example
 * ```tsx
 * function HeavyWidget() {
 *   const ready = useIdleReady();
 *   if (!ready) return null; // or a skeleton
 *   return <ExpensiveComponent />;
 * }
 * ```
 */
export function useIdleReady(): boolean {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const unsubscribe = onFlushComplete(() => {
            setReady(true);
        });
        return unsubscribe;
    }, []);

    return ready;
}

// ---------------------------------------------------------------------------
// useIdleGate — register work AND get a ready signal
// ---------------------------------------------------------------------------

/**
 * Register deferred work and get a `ready` signal when it completes.
 *
 * This is the "full package" — your component stays dormant, the scheduler
 * runs your callback at the right time, and then you get notified to
 * update your UI.
 *
 * @example
 * ```tsx
 * function PrefetchedSection() {
 *   const { ready } = useIdleGate('prefetch-recommendations', 2, async () => {
 *     await prefetchRecommendations();
 *   });
 *
 *   if (!ready) return <Skeleton />;
 *   return <Recommendations />;
 * }
 * ```
 */
export function useIdleGate(
    key: string,
    priority: IdlePriority,
    callback: () => void | Promise<void>
): { ready: boolean } {
    const [ready, setReady] = useState(false);
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        const unregister = registerIdleTask(key, priority, async () => {
            await callbackRef.current();
            setReady(true);
        });
        return unregister;
    }, [key, priority]);

    return { ready };
}

// ---------------------------------------------------------------------------
// useIdleCallback — imperative registration (for dynamic/conditional work)
// ---------------------------------------------------------------------------

/**
 * Returns a `register` function you can call imperatively.
 * Useful when the deferred work depends on runtime conditions.
 *
 * @example
 * ```tsx
 * function SearchResults({ query }) {
 *   const scheduleIdle = useIdleRegister();
 *
 *   useEffect(() => {
 *     if (query) {
 *       scheduleIdle(`prefetch-${query}`, 4, () => {
 *         prefetchRelatedResults(query);
 *       });
 *     }
 *   }, [query, scheduleIdle]);
 * }
 * ```
 */
export function useIdleRegister(): (
    key: string,
    priority: IdlePriority,
    callback: () => void | Promise<void>
) => void {
    const unregisterRefs = useRef<Map<string, () => void>>(new Map());

    // Cleanup all registrations on unmount
    useEffect(() => {
        return () => {
            unregisterRefs.current.forEach((unregister) => unregister());
            unregisterRefs.current.clear();
        };
    }, []);

    return useCallback(
        (
            key: string,
            priority: IdlePriority,
            callback: () => void | Promise<void>
        ) => {
            // Cancel previous registration with same key
            unregisterRefs.current.get(key)?.();

            const unregister = registerIdleTask(key, priority, callback);
            unregisterRefs.current.set(key, unregister);
        },
        []
    );
}
