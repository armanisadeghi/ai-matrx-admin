// app/LiteProviders.tsx
// Lightweight providers wrapper with Redux but without heavy entity/socket overhead

'use client';

import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import StoreProvider from '@/providers/StoreProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { InitialReduxState, LiteInitialReduxState } from '@/types/reduxTypes';
import { ToastProvider } from '@/providers/toast-context';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';

interface LiteProvidersProps {
    children: React.ReactNode;
    initialState?: LiteInitialReduxState;
}

/**
 * Lightweight Providers for routes that need Redux but not the full stack.
 * 
 * Includes:
 * - ReactQueryProvider for data fetching
 * - StoreProvider (same full Redux tree as the app shell)
 * - ToastProvider & Toaster for notifications
 * - TooltipProvider for tooltips
 * 
 * Excludes (compared to full Providers):
 * - SchemaProvider (entity schema)
 * - EntityProvider (entity context)
 * - GlobalBrokerRegistration
 * - FileSystemProvider(s)
 * - AudioModalProvider
 * - ModuleHeaderProvider
 * - GoogleAPIProvider
 * - PersistentComponentProvider
 * - EditorProvider
 * - And many more heavy providers...
 * 
 * Use this for:
 * - Public routes that need Redux (chat, prompts)
 * - Lite authenticated routes
 */
export function LiteProviders({ children, initialState }: LiteProvidersProps) {
    return (
        <ReactQueryProvider>
            <StoreProvider initialState={initialState as Partial<InitialReduxState> & LiteInitialReduxState}>
                <ToastProvider>
                    <TooltipProvider delayDuration={200}>
                        {children}
                        <Toaster />
                    </TooltipProvider>
                </ToastProvider>
            </StoreProvider>
        </ReactQueryProvider>
    );
}
