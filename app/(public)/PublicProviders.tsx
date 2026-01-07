'use client';

import React from 'react';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import LiteStoreProvider from '@/providers/LiteStoreProvider';
import { LiteInitialReduxState } from '@/types/reduxTypes';
import { AuthSyncWrapper } from './AuthSyncWrapper';

interface PublicProvidersProps {
    children: React.ReactNode;
    initialState?: LiteInitialReduxState;
}

/**
 * Public Providers - Unified & Optimized
 * 
 * Lightweight providers for all public routes:
 * - ReactQueryProvider: Data fetching with caching
 * - LiteStoreProvider: Lightweight Redux (no sagas/socket/entities)
 * - AuthSyncWrapper: Syncs Supabase auth to Redux (delayed, non-blocking)
 * - NextThemesProvider: Theme management
 * - TooltipProvider: Tooltip support
 * - Toaster: Toast notifications
 * 
 * Auth flow:
 * 1. Page renders immediately with empty Redux user state
 * 2. AuthSyncWrapper checks auth after 100ms delay
 * 3. Redux user slice is populated
 * 4. Components reading from Redux re-render with user data
 * 
 * NOT included (lazy load when needed):
 * - GoogleAPIProvider: Use LazyGoogleAPIProvider wrapper
 */
export function PublicProviders({ children, initialState }: PublicProvidersProps) {
    return (
        <ReactQueryProvider>
            <LiteStoreProvider initialState={initialState}>
                <AuthSyncWrapper>
                    <NextThemesProvider 
                        attribute="class" 
                        defaultTheme="dark"
                        enableSystem={true}
                        storageKey="theme"
                    >
                        <TooltipProvider delayDuration={200}>
                            {children}
                            <Toaster />
                        </TooltipProvider>
                    </NextThemesProvider>
                </AuthSyncWrapper>
            </LiteStoreProvider>
        </ReactQueryProvider>
    );
}
