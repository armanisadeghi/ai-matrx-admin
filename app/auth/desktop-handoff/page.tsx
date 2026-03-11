'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

/**
 * Desktop App Auth Handoff
 *
 * This page is loaded inside the embedded iframe/webview in the Matrx Local
 * desktop application. It establishes the user's Supabase session in the web
 * app without requiring any third-party OAuth (Google, GitHub, Apple), which
 * would be rejected by those providers when run inside a non-standard browser.
 *
 * Flow:
 *  1. Desktop app loads this page in its iframe with ?redirect=/some/path
 *  2. This page renders and posts { type: 'MATRX_HANDOFF_READY' } to the parent
 *  3. Desktop app receives READY, reads its own Supabase session, and posts back:
 *     { type: 'MATRX_HANDOFF_TOKENS', access_token: '...', refresh_token: '...' }
 *  4. This page calls supabase.auth.setSession() with those tokens
 *  5. Session cookies are written; page navigates to ?redirect destination
 *
 * Security:
 *  - Messages are validated by type prefix and origin (MATRX_HANDOFF_*)
 *  - Tokens are Supabase JWTs already owned by the authenticated desktop user
 *  - No third-party credentials are exchanged
 *  - The page does nothing without a valid token message — it just shows a loader
 */

type PageState = 'waiting' | 'authenticating' | 'success' | 'error';

interface HandoffTokenMessage {
    type: 'MATRX_HANDOFF_TOKENS';
    access_token: string;
    refresh_token: string;
}

function isHandoffMessage(data: unknown): data is HandoffTokenMessage {
    return (
        typeof data === 'object' &&
        data !== null &&
        (data as Record<string, unknown>).type === 'MATRX_HANDOFF_TOKENS' &&
        typeof (data as Record<string, unknown>).access_token === 'string' &&
        typeof (data as Record<string, unknown>).refresh_token === 'string'
    );
}

export default function DesktopHandoffPage() {
    const router = useRouter();
    const [pageState, setPageState] = useState<PageState>('waiting');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const handledRef = useRef(false);

    useEffect(() => {
        const supabase = createClient();

        async function handleTokenMessage(event: MessageEvent) {
            // Ignore duplicate calls (StrictMode double-fire, etc.)
            if (handledRef.current) return;

            if (!isHandoffMessage(event.data)) return;

            handledRef.current = true;
            setPageState('authenticating');

            const { access_token, refresh_token } = event.data;

            const { error } = await supabase.auth.setSession({
                access_token,
                refresh_token,
            });

            if (error) {
                console.error('[desktop-handoff] setSession failed:', error.message);
                setPageState('error');
                setErrorMessage(error.message);
                return;
            }

            setPageState('success');

            // Navigate to the requested destination, defaulting to the home page
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect') ?? '/';

            // Small delay so the user sees the success state briefly
            setTimeout(() => {
                router.replace(redirect);
            }, 400);
        }

        window.addEventListener('message', handleTokenMessage);

        // Signal to the parent (desktop app) that we are ready to receive tokens
        window.parent.postMessage({ type: 'MATRX_HANDOFF_READY' }, '*');

        return () => {
            window.removeEventListener('message', handleTokenMessage);
        };
    }, [router]);

    return (
        <div className="min-h-dvh w-full flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4 text-center px-6">
                {pageState === 'waiting' || pageState === 'authenticating' ? (
                    <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {pageState === 'waiting'
                                ? 'Connecting to Matrx Local...'
                                : 'Signing you in...'}
                        </p>
                    </>
                ) : pageState === 'success' ? (
                    <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
                            <ShieldCheck className="h-7 w-7 text-success" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Signed in. Redirecting...
                        </p>
                    </>
                ) : (
                    <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                            <AlertTriangle className="h-7 w-7 text-destructive" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                                Sign-in failed
                            </p>
                            <p className="text-xs text-muted-foreground max-w-xs">
                                {errorMessage || 'Could not establish session. Please restart Matrx Local and try again.'}
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
