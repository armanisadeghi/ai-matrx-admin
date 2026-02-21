'use client';

import React from 'react';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import LiteStoreProvider from '@/providers/LiteStoreProvider';
import { LiteInitialReduxState } from '@/types/reduxTypes';
import { PublicAuthSync } from './PublicAuthSync';

interface PublicProvidersProps {
    children: React.ReactNode;
    initialState?: LiteInitialReduxState;
}

/**
 * Minimal client boundary for public routes.
 *
 * Server-rendered children (layout shell, header markup, page content)
 * pass through as already-rendered React nodes — they are NOT converted
 * to client components. Only the provider wrappers themselves ship JS.
 *
 * Auth sync runs after a 100ms delay inside PublicAuthSync so it never
 * blocks the initial paint.
 */
export function PublicProviders({ children, initialState }: PublicProvidersProps) {
    return (
        <ReactQueryProvider>
            <LiteStoreProvider initialState={initialState}>
                <NextThemesProvider
                    attribute="class"
                    enableSystem={true}
                    storageKey="theme"
                >
                    <TooltipProvider delayDuration={200}>
                        <PublicAuthSync />
                        {children}
                    </TooltipProvider>
                </NextThemesProvider>
            </LiteStoreProvider>
        </ReactQueryProvider>
    );
}
