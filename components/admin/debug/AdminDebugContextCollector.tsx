// components/admin/debug/AdminDebugContextCollector.tsx
//
// Layout-level client island. Place it once inside AdminIndicatorWrapper so it
// only renders for admins. It auto-captures:
//
//   - Current pathname + search params (on every navigation)
//   - Browser viewport and user agent
//   - console.error calls (intercepted while mounted)
//   - window onerror / unhandledrejection events
//
// Nothing here is expensive — the console intercept is a simple wrapper and
// the pathname effect only runs on navigation. Zero cost for non-admins because
// this component is a child of AdminIndicatorWrapper which returns null for them.

'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAppDispatch } from '@/lib/redux/hooks';
import { setRouteContext, appendConsoleError, type ConsoleErrorEntry } from '@/lib/redux/slices/adminDebugSlice';
import { v4 as uuidv4 } from 'uuid';

export function AdminDebugContextCollector() {
    const dispatch = useAppDispatch();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const renderCountRef = useRef(0);

    // ── Route context capture ─────────────────────────────────────────────
    useEffect(() => {
        renderCountRef.current += 1;
        const params: Record<string, string> = {};
        searchParams.forEach((value, key) => { params[key] = value; });

        dispatch(setRouteContext({
            pathname,
            searchParams: params,
            capturedAt: Date.now(),
            userAgent: navigator.userAgent,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            renderCount: renderCountRef.current,
        }));
    }, [pathname, searchParams, dispatch]);

    // ── Console error capture ─────────────────────────────────────────────
    useEffect(() => {
        const originalError = console.error.bind(console);

        console.error = (...args: unknown[]) => {
            originalError(...args);
            const message = args
                .map(a => (typeof a === 'string' ? a : a instanceof Error ? a.message : JSON.stringify(a)))
                .join(' ');
            const stack = args.find(a => a instanceof Error) instanceof Error
                ? (args.find(a => a instanceof Error) as Error).stack
                : undefined;
            dispatch(appendConsoleError({
                id: uuidv4(),
                message,
                source: 'console.error',
                stack,
                capturedAt: Date.now(),
            } satisfies ConsoleErrorEntry));
        };

        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            dispatch(appendConsoleError({
                id: uuidv4(),
                message: reason instanceof Error ? reason.message : String(reason),
                source: 'unhandledrejection',
                stack: reason instanceof Error ? reason.stack : undefined,
                capturedAt: Date.now(),
            } satisfies ConsoleErrorEntry));
        };

        const handleErrorEvent = (event: ErrorEvent) => {
            dispatch(appendConsoleError({
                id: uuidv4(),
                message: event.message,
                source: 'error-event',
                stack: event.error?.stack,
                capturedAt: Date.now(),
            } satisfies ConsoleErrorEntry));
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        window.addEventListener('error', handleErrorEvent);

        return () => {
            console.error = originalError;
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('error', handleErrorEvent);
        };
    }, [dispatch]);

    return null;
}
