'use client';

// EntitySystemProvider — Wrapper for routes that need the entity system.
// Triggers on-demand schema loading and entity slice injection on mount.
// Shows a loading skeleton until the entity system is ready.

import { useEffect, useRef } from 'react';
import { useEntitySystem } from '@/lib/redux/entity/useEntitySystem';

const LOUD_STYLE = 'color: red; font-size: 14px; font-weight: bold; background: #fff3f3; padding: 2px 6px; border: 2px solid red;';

interface EntitySystemProviderProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

function DefaultFallback() {
    return (
        <div className="flex items-center justify-center h-full w-full min-h-[200px]">
            <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Loading data system...</p>
            </div>
        </div>
    );
}

export function EntitySystemProvider({
    children,
    fallback,
}: EntitySystemProviderProps) {
    const { isInitialized, isLoading, error, initialize } = useEntitySystem();
    const loadStartRef = useRef<number>(0);

    useEffect(() => {
        loadStartRef.current = performance.now();
        const route = typeof window !== 'undefined' ? window.location.pathname : 'server';
        console.log(
            '\n\n%c ============================================== ',
            LOUD_STYLE
        );
        console.log(
            '%c  [EntitySystemProvider] FULL ENTITY SYSTEM LOADING  ',
            LOUD_STYLE
        );
        console.log(
            `%c  Route: ${route}`,
            LOUD_STYLE
        );
        console.log(
            '%c ============================================== \n\n',
            LOUD_STYLE
        );
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (isInitialized && loadStartRef.current > 0) {
            const elapsed = (performance.now() - loadStartRef.current).toFixed(0);
            const route = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
            console.log(
                `%c [EntitySystemProvider] Entity system READY in ${elapsed}ms | Route: ${route}`,
                LOUD_STYLE
            );
        }
    }, [isInitialized]);

    if (error) {
        return (
            <div className="flex items-center justify-center h-full w-full min-h-[200px]">
                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm text-destructive">Failed to load data system</p>
                    <p className="text-xs text-muted-foreground">{error}</p>
                    <button
                        onClick={initialize}
                        className="text-xs text-primary hover:underline"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!isInitialized || isLoading) {
        return <>{fallback ?? <DefaultFallback />}</>;
    }

    return <>{children}</>;
}
