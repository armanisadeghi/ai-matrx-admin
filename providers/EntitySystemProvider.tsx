'use client';

// EntitySystemProvider — Wrapper for routes that need the entity system.
// Triggers on-demand schema loading and entity slice injection on mount.
// Shows a loading skeleton until the entity system is ready.

import { useEffect } from 'react';
import { useEntitySystem } from '@/lib/redux/entity/useEntitySystem';

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

    useEffect(() => {
        initialize();
    }, [initialize]);

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
