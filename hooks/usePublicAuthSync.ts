// hooks/usePublicAuthSync.ts
// Single source of truth for auth sync on public routes
'use client';

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setUser, clearUser } from '@/lib/redux/slices/userSlice';
import { createClient } from '@/utils/supabase/client';

/**
 * Syncs Supabase auth state to Redux.
 * 
 * Call this ONCE at the top level (PublicProviders).
 * All other components read from Redux - no redundant auth checks.
 * 
 * Features:
 * - Delayed start (100ms) to not block initial render
 * - Checks admin status from database
 * - Dispatches to Redux user slice
 * - Non-blocking, runs after hydration
 */
export function usePublicAuthSync() {
    const dispatch = useDispatch();
    const hasRun = useRef(false);

    useEffect(() => {
        // Only run once
        if (hasRun.current) return;
        hasRun.current = true;

        const syncAuth = async () => {
            const startTime = performance.now();
            
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                
                if (user) {
                    // Check admin status
                    let isAdmin = false;
                    try {
                        const { data: adminData } = await supabase
                            .from('admins')
                            .select('user_id')
                            .eq('user_id', user.id)
                            .maybeSingle();
                        isAdmin = !!adminData;
                    } catch {
                        // Admin check failed, default to false
                    }

                    // Dispatch to Redux
                    dispatch(setUser({
                        id: user.id,
                        email: user.email || null,
                        phone: user.phone || null,
                        emailConfirmedAt: user.email_confirmed_at || null,
                        lastSignInAt: user.last_sign_in_at || null,
                        appMetadata: {
                            provider: user.app_metadata?.provider || null,
                            providers: user.app_metadata?.providers || [],
                        },
                        userMetadata: {
                            avatarUrl: user.user_metadata?.avatar_url || null,
                            fullName: user.user_metadata?.full_name || null,
                            name: user.user_metadata?.name || null,
                            preferredUsername: user.user_metadata?.preferred_username || null,
                            picture: user.user_metadata?.picture || null,
                        },
                        identities: user.identities?.map(i => ({
                            provider: i.provider || null,
                            id: i.id || null,
                            user_id: i.user_id || null,
                            avatar_url: i.identity_data?.avatar_url || null,
                            email: i.identity_data?.email || null,
                            email_verified: i.identity_data?.email_verified || null,
                            full_name: i.identity_data?.full_name || null,
                            picture: i.identity_data?.picture || null,
                            provider_id: i.identity_data?.provider_id || null,
                            sub: i.identity_data?.sub || null,
                            name: i.identity_data?.name || null,
                        })) || [],
                        isAdmin,
                        accessToken: null, // Session token handled separately if needed
                        tokenExpiresAt: null,
                    }));

                    console.log(`[PERF] Auth sync completed at: ${performance.now().toFixed(2)}ms (took ${(performance.now() - startTime).toFixed(2)}ms, admin: ${isAdmin})`);
                } else {
                    dispatch(clearUser());
                    console.log(`[PERF] Auth sync: No user (took ${(performance.now() - startTime).toFixed(2)}ms)`);
                }
            } catch (error) {
                console.error('Auth sync error:', error);
                dispatch(clearUser());
            }
        };

        // Delay to ensure page renders first
        const timer = setTimeout(syncAuth, 100);
        return () => clearTimeout(timer);
    }, [dispatch]);
}
