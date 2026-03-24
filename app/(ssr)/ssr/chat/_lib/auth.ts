// app/(ssr)/ssr/chat/_lib/auth.ts
//
// Server-side auth check for the SSR chat route.
// Returns auth status without blocking rendering — the page renders
// regardless of auth state. This just provides initial values so the
// server-rendered HTML reflects the correct UI for guest/user/admin.

import { createClient } from '@/utils/supabase/server';

export interface ChatAuthResult {
    isAuthenticated: boolean;
    isAdmin: boolean;
    userId: string | null;
}

export async function getChatAuth(): Promise<ChatAuthResult> {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return { isAuthenticated: false, isAdmin: false, userId: null };
        }

        // Check admin status from user metadata
        const isAdmin =
            user.app_metadata?.role === 'admin' ||
            user.app_metadata?.is_admin === true ||
            user.user_metadata?.role === 'admin' ||
            false;

        return {
            isAuthenticated: true,
            isAdmin,
            userId: user.id,
        };
    } catch {
        // Auth check failed — treat as guest (don't block rendering)
        return { isAuthenticated: false, isAdmin: false, userId: null };
    }
}
