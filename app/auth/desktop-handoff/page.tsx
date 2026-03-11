'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * Desktop App Auth Handoff
 *
 * Loaded inside the embedded iframe in Matrx Local. The desktop app passes
 * the user's already-valid Supabase tokens directly in the URL:
 *
 *   /auth/desktop-handoff
 *     ?access_token=<jwt>
 *     &refresh_token=<token>
 *     &redirect=/demos/local-tools
 *
 * This page calls supabase.auth.setSession(), which writes the session into
 * the browser client AND triggers Supabase SSR to set the auth cookie via its
 * onAuthStateChange hook. We then do a hard navigation (window.location.href)
 * to the redirect target so the Next.js server sees the fresh cookie and
 * renders the authenticated route.
 *
 * Why URL params instead of postMessage:
 *   postMessage from a Tauri parent to an https:// iframe has an unpredictable
 *   origin (null / tauri://localhost / https://tauri.localhost depending on
 *   platform and build mode), making reliable origin validation impossible.
 *   URL params are simpler, work on first load with zero round-trips, and are
 *   not exposed to any third party — the Tauri webview is not a real browser.
 */

type PageState = 'working' | 'success' | 'error';

export default function DesktopHandoffPage() {
    const [pageState, setPageState] = useState<PageState>('working');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const ranRef = useRef(false);

    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;

        async function run() {
            const params = new URLSearchParams(window.location.search);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const redirect = params.get('redirect') ?? '/';

            if (!accessToken || !refreshToken) {
                setPageState('error');
                setErrorMessage('Missing auth tokens. Please close this tab and try again from Matrx Local.');
                return;
            }

            const supabase = createClient();

            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });

            if (error) {
                console.error('[desktop-handoff] setSession failed:', error.message);
                setPageState('error');
                setErrorMessage(error.message);
                return;
            }

            setPageState('success');

            // Hard navigation — the Next.js server must see the new cookie on
            // the next request. router.replace() would skip the server round-trip
            // and land on a page that has no server-side session.
            window.location.href = redirect;
        }

        run();
    }, []);

    return (
        <div className="min-h-dvh w-full flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-center px-6">
                {pageState === 'working' && (
                    <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">Signing you in...</p>
                    </>
                )}

                {pageState === 'success' && (
                    <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                            <ShieldCheck className="h-7 w-7 text-success" />
                        </div>
                        <p className="text-sm text-muted-foreground">Signed in. Loading...</p>
                    </>
                )}

                {pageState === 'error' && (
                    <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                            <AlertTriangle className="h-7 w-7 text-destructive" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">Sign-in failed</p>
                            <p className="text-xs text-muted-foreground max-w-xs">
                                {errorMessage}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
