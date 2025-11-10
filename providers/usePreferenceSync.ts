// hooks/usePreferenceSync.ts
'use client';

import { useEffect } from 'react';
import { useAppSelector } from '@/lib/redux';
import { supabase } from '@/utils/supabase/client';

export function usePreferenceSync() {
    const userId = useAppSelector((state) => state.user.id);
    const preferences = useAppSelector((state) => state.userPreferences);

    useEffect(() => {
        if (!userId) return;

        return () => {
            supabase.from('user_preferences').upsert({
                user_id: userId,
                preferences,
                updated_at: new Date().toISOString(),
            });
        };
    }, []);
}

export function PreferenceSyncProvider({ children }: { children: React.ReactNode }) {
    usePreferenceSync();
    return children;
}
