// providers/LiteStoreProvider.tsx
// Lightweight Redux store provider for public/lite routes

'use client';

import { LiteAppStore, makeLiteStore } from '@/lib/redux/liteStore';
import { useRef } from 'react';
import { Provider } from 'react-redux';
import { LiteInitialReduxState } from '@/types/reduxTypes';

interface LiteStoreProviderProps {
    children: React.ReactNode;
    initialState?: LiteInitialReduxState;
}

/**
 * Lightweight Store Provider for routes that don't need the full Redux setup.
 * 
 * Benefits:
 * - No entity system initialization
 * - No socket.io middleware
 * - No Redux Saga
 * - No schema/globalCache required
 * - Faster initial render
 * 
 * Use this for:
 * - Public routes that need some Redux state (chat, prompts, etc.)
 * - Lite authenticated routes without entity requirements
 */
export default function LiteStoreProvider({ children, initialState }: LiteStoreProviderProps) {
    const storeRef = useRef<LiteAppStore | null>(null);

    if (!storeRef.current) {
        storeRef.current = makeLiteStore(initialState);
    }

    if (!storeRef.current) {
        throw new Error('Lite Redux store failed to initialize');
    }

    return <Provider store={storeRef.current}>{children}</Provider>;
}
