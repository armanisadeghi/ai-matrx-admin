'use client';

// LazyEntityGate — Lightweight wrapper that ensures the entity system is
// available before rendering children. Use this to wrap individual components
// (not full route trees) that need entity data on-demand.
//
// Unlike EntityPack (which wraps entire route layouts), this is designed for
// small, isolated components rendered inside non-entity routes that happen
// to need entity access (e.g. admin tools, markdown analyzers).
//
// First invocation triggers the fetch + injection. Subsequent uses detect
// that the system is already initialized and render immediately.

import { useEntitySystem } from '@/lib/redux/entity/useEntitySystem';
import { useEffect, useRef } from 'react';

const LOUD_STYLE = 'color: red; font-size: 14px; font-weight: bold; background: #fff3f3; padding: 2px 6px; border: 2px solid red;';

interface LazyEntityGateProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    label?: string;
}

function GateFallback() {
    return (
        <div className="flex items-center justify-center min-h-[100px]">
            <div className="flex items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-xs text-muted-foreground">Loading entity system...</span>
            </div>
        </div>
    );
}

export function LazyEntityGate({ children, fallback, label = 'unknown' }: LazyEntityGateProps) {
    const { isInitialized, isLoading, error, initialize } = useEntitySystem();
    const loadStartRef = useRef<number>(0);

    useEffect(() => {
        if (!isInitialized && !isLoading) {
            loadStartRef.current = performance.now();
            console.log(
                '\n\n%c ========================================== ',
                LOUD_STYLE
            );
            console.log(
                '%c  [LazyEntityGate] ENTITY SYSTEM TRIGGERED  ',
                LOUD_STYLE
            );
            console.log(
                `%c  Source: ${label}`,
                LOUD_STYLE
            );
            console.log(
                `%c  Route: ${typeof window !== 'undefined' ? window.location.pathname : 'server'}`,
                LOUD_STYLE
            );
            console.log(
                '%c ========================================== \n\n',
                LOUD_STYLE
            );
            initialize();
        }
    }, [isInitialized, isLoading, initialize, label]);

    useEffect(() => {
        if (isInitialized && loadStartRef.current > 0) {
            const elapsed = (performance.now() - loadStartRef.current).toFixed(0);
            console.log(
                `%c [LazyEntityGate] Entity system ready in ${elapsed}ms | Source: ${label}`,
                LOUD_STYLE
            );
            loadStartRef.current = 0;
        }
    }, [isInitialized, label]);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[80px] text-center">
                <div className="space-y-1">
                    <p className="text-xs text-destructive">Entity system failed to load</p>
                    <button onClick={initialize} className="text-xs text-primary hover:underline">Retry</button>
                </div>
            </div>
        );
    }

    if (!isInitialized || isLoading) {
        return <>{fallback ?? <GateFallback />}</>;
    }

    return <>{children}</>;
}
