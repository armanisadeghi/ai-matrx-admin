'use client';

// DeferredShellData — fires after first paint, never blocks rendering.
// Calls Supabase directly from the browser — no API route middleman.

import { useEffect, useRef } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { setUser } from '@/lib/redux/slices/userSlice';
import { setModulePreferences, type UserPreferences } from '@/lib/redux/slices/userPreferencesSlice';
import { setContextMenuRows } from '@/lib/redux/slices/contextMenuCacheSlice';
import { hydrateModels, type AIModel } from '@/lib/redux/slices/modelRegistrySlice';
import { setUnreadTotal } from '@/features/sms/redux/smsSlice';
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

        async function load() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const shellData = await getSSRShellData(supabase, user.id);
                const userData = mapUserData(user, undefined, shellData.is_admin);

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
                    dispatch(setUnreadTotal(shellData.sms_unread_total));
                }
            } catch (err) {
                console.error('[DeferredShellData]', err);
                // Non-critical — store stays empty, page still works
            }
        }

        load();
    }, [dispatch]);

    return null;
}
