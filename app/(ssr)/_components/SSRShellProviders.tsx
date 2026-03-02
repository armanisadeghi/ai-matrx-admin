// app/(ssr)/_components/SSRShellProviders.tsx
// Client boundary wrapping LiteStoreProvider for the SSR shell.
//
// Hydration strategy — all via preloadedState, zero client fetches:
//   • user, userPreferences → user session from RPC
//   • modelRegistry         → 65 AI models from RPC
//   • contextMenuCache      → all placement types from RPC
//   • sms.unreadTotal       → badge count from RPC
//
// Nothing here blocks rendering. Store is created with data already present.

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
