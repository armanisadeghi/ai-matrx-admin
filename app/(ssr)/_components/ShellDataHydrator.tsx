'use client';

/**
 * Dispatches SSR shell data into the lite Redux store after Suspense resolves.
 * Renders nothing — this is a pure side-effect component.
 *
 * Streamed inside a <Suspense> boundary: the shell chrome renders immediately,
 * then this component arrives with the RPC data and hydrates the store.
 */

import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { setUser } from '@/lib/redux/slices/userSlice';
import { setModulePreferences, type UserPreferences } from '@/lib/redux/slices/userPreferencesSlice';
import { setContextMenuRows } from '@/lib/redux/slices/contextMenuCacheSlice';
import { hydrateModels, type AIModel } from '@/lib/redux/slices/modelRegistrySlice';
import { setUnreadTotal } from '@/features/sms/redux/smsSlice';
import type { ContextMenuRow } from '@/utils/supabase/ssrShellData';
import type { LiteInitialReduxState } from '@/types/reduxTypes';

interface ShellDataHydratorProps {
    initialState?: LiteInitialReduxState;
    isAdmin: boolean;
}

export default function ShellDataHydrator({ initialState }: ShellDataHydratorProps) {
    const dispatch = useAppDispatch();
    const hydrated = useRef(false);

    useEffect(() => {
        if (hydrated.current || !initialState) return;
        hydrated.current = true;

        if (initialState.user) {
            dispatch(setUser(initialState.user));
        }

        if (initialState.userPreferences) {
            const prefs = initialState.userPreferences as Record<string, unknown>;
            for (const [key, value] of Object.entries(prefs)) {
                if (key !== '_meta' && value != null) {
                    dispatch(setModulePreferences({
                        module: key as keyof UserPreferences,
                        preferences: value as Partial<UserPreferences[keyof UserPreferences]>,
                    }));
                }
            }
        }

        if (initialState.contextMenuCache) {
            const cache = initialState.contextMenuCache as { rows: ContextMenuRow[] };
            dispatch(setContextMenuRows(cache.rows));
        }

        if (initialState.modelRegistry) {
            const registry = initialState.modelRegistry as { availableModels: AIModel[]; lastFetched: number };
            dispatch(hydrateModels(registry));
        }

        if (initialState.sms) {
            const sms = initialState.sms as { unreadTotal: number };
            dispatch(setUnreadTotal(sms.unreadTotal));
        }
    }, [dispatch, initialState]);

    return null;
}
