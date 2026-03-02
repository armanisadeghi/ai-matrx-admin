// app/(ssr)/_components/SSRShellProviders.tsx
// Thin client boundary wrapping LiteStoreProvider for the SSR shell.
// Store is pre-populated with server-resolved user + preferences at hydration time.
// All other slices start empty and hydrate post-render via thunks or RPC.

'use client';

import LiteStoreProvider from '@/providers/LiteStoreProvider';
import { LiteInitialReduxState } from '@/types/reduxTypes';

interface SSRShellProvidersProps {
    children: React.ReactNode;
    initialState?: LiteInitialReduxState;
}

export default function SSRShellProviders({ children, initialState }: SSRShellProvidersProps) {
    return (
        <LiteStoreProvider initialState={initialState}>
            {children}
        </LiteStoreProvider>
    );
}
