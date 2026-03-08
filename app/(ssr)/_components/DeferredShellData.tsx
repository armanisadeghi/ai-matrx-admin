'use client';

// DeferredShellData — fires after first paint, never blocks rendering.
// Calls Supabase directly from the browser — no API route middleman.

import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { setUser } from '@/lib/redux/slices/userSlice';
import { setModulePreferences, type UserPreferences } from '@/lib/redux/slices/userPreferencesSlice';
import { setContextMenuRows } from '@/lib/redux/slices/contextMenuCacheSlice';
import { hydrateModels, type AIModel } from '@/lib/redux/slices/modelRegistrySlice';
// smsSlice imported lazily — avoids pulling the full SMS feature into the shell bundle
import { supabase } from '@/utils/supabase/client';
import { getSSRShellData } from '@/utils/supabase/ssrShellData';
import { mapUserData } from '@/utils/userDataMapper';
import type { ContextMenuRow } from '@/utils/supabase/ssrShellData';

export default function DeferredShellData() {
    const dispatch = useAppDispatch();
    const fetched = useRef(false);

    useEffect(() => {
        if (fetched.current) return;
        fetched.current = true;

        const t0 = performance.now();
        console.debug(`⚡DeferredShellData effect started at ${t0.toFixed(2)}ms`);

        async function load() {
            try {
                const t1 = performance.now();
                const { data: { user } } = await supabase.auth.getUser();
                console.debug(`⚡DeferredShellData getUser: ${(performance.now() - t1).toFixed(2)}ms`);
                if (!user) return;

                // Fetch session for the access token (fast local read, no network call)
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token ?? null;

                const t2 = performance.now();
                const shellData = await getSSRShellData(supabase, user.id);
                console.debug(`⚡DeferredShellData getSSRShellData: ${(performance.now() - t2).toFixed(2)}ms`);
                const userData = mapUserData(user, accessToken, shellData.is_admin);

                dispatch(setUser(userData));

                if (shellData.preferences_exists && shellData.preferences) {
                    for (const [key, value] of Object.entries(shellData.preferences)) {
                        if (key !== '_meta' && value != null) {
                            dispatch(setModulePreferences({
                                module: key as keyof UserPreferences,
                                preferences: value as Partial<UserPreferences[keyof UserPreferences]>,
                            }));
                        }
                    }
                }

                console.log("[DeferredShellData] Context Menu length: ", shellData.context_menu.length);

                if (shellData.context_menu.length > 0) {
                    dispatch(setContextMenuRows(shellData.context_menu as ContextMenuRow[]));
                }

                if (shellData.ai_models.length > 0) {
                    dispatch(hydrateModels({
                        availableModels: shellData.ai_models as AIModel[],
                        lastFetched: Date.now(),
                    }));
                }

                if (shellData.sms_unread_total > 0) {
                    const { setUnreadTotal } = await import('@/features/sms/redux/smsSlice');
                    dispatch(setUnreadTotal(shellData.sms_unread_total));
                }
                console.debug(`⚡DeferredShellData dispatches done at ${performance.now().toFixed(2)}ms (total: ${(performance.now() - t0).toFixed(2)}ms)`);
            } catch (err) {
                console.error('[DeferredShellData]', err);
            }
        }

        load();
    }, [dispatch]);

    return null;
}
