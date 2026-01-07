// hooks/usePublicAuthSync.ts
// Single source of truth for auth sync on public routes
'use client';

import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setUser, setFingerprintId } from '@/lib/redux/slices/userSlice';
import { createClient } from '@/utils/supabase/client';
import { getFingerprint } from '@/lib/services/fingerprint-service';

/**
 * Syncs authentication state to Redux for ALL public routes.
 * 
 * For authenticated users: stores user info + access token
 * For guests: stores fingerprint ID (for API authentication)
 * 
 * Call this ONCE at the top level (PublicProviders).
 * All other components read from Redux via useApiAuth hook.
 * 
 * Features:
 * - Delayed start (100ms) to not block initial render
 * - Gets session (includes access token) for authenticated users
 * - Gets fingerprint for guests (for guest API access)
 * - Checks admin status from database
 * - Sets authReady=true when complete (either path)
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
                
                // Get session (includes access token) - not just user
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    console.error('Session error:', sessionError);
                }
                
                if (session?.user) {
                    // AUTHENTICATED USER PATH
                    const user = session.user;
                    
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

                    // Dispatch to Redux with access token (authReady set automatically)
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
                        accessToken: session.access_token,
                        tokenExpiresAt: session.expires_at || null,
                    }));
                } else {
                    // GUEST USER PATH - get fingerprint for API authentication
                    try {
                        const fingerprintId = await getFingerprint();
                        dispatch(setFingerprintId(fingerprintId));
                    } catch (fpError) {
                        console.error('Fingerprint error:', fpError);
                        // Still set a temporary fingerprint so authReady becomes true
                        dispatch(setFingerprintId(`temp_${Date.now()}_${Math.random().toString(36).substring(7)}`));
                    }
                }
                
                // Single consolidated log - route is now fully ready
                console.log(`[Public Route Ready] ${(performance.now() - startTime).toFixed(0)}ms`);
            } catch (error) {
                console.error('Auth sync error:', error);
                // Even on error, try to get fingerprint so guests can still use the site
                try {
                    const fingerprintId = await getFingerprint();
                    dispatch(setFingerprintId(fingerprintId));
                } catch {
                    dispatch(setFingerprintId(`temp_${Date.now()}_${Math.random().toString(36).substring(7)}`));
                }
            }
        };

        // Delay to ensure page renders first
        const timer = setTimeout(syncAuth, 100);
        return () => clearTimeout(timer);
    }, [dispatch]);
}
