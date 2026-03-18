'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { LogIn, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Listens to Supabase auth state changes and shows a full-screen session-expired
 * overlay when the user's session is signed out or the token can't be refreshed.
 * Mounts once inside the authenticated layout — no props needed.
 */
export default function AuthSessionWatcher() {
    const router = useRouter();
    const [sessionExpired, setSessionExpired] = useState(false);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
                // TOKEN_REFRESHED fires when refresh succeeds — only flag on SIGNED_OUT
                if (event === 'SIGNED_OUT') {
                    setSessionExpired(true);
                }
            }
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                setSessionExpired(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleSignIn = () => {
        router.push('/login');
    };

    if (!sessionExpired) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-6 max-w-sm w-full mx-4 p-8 rounded-2xl border border-border bg-card shadow-2xl text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-warning/10">
                    <AlertTriangle className="w-8 h-8 text-warning" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-semibold text-foreground">Session Expired</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Your session has timed out. Please sign in again to continue — your work is saved.
                    </p>
                </div>

                <Button
                    onClick={handleSignIn}
                    className="w-full gap-2"
                    size="lg"
                >
                    <LogIn className="w-4 h-4" />
                    Sign In Again
                </Button>
            </div>
        </div>
    );
}
