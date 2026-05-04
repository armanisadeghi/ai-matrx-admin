import { createClient } from '@supabase/supabase-js';

// SUPABASE_SECRET_KEY (sb_secret_*) is the current admin key.
// The legacy JWT-based SUPABASE_SERVICE_ROLE_KEY is deprecated — do not reintroduce it.
// Docs: https://supabase.com/docs/guides/getting-started/api-keys

// Simple client for scripts and non-request contexts
export const getScriptSupabaseClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
    );
};

// Admin client for migrations (uses the secret key)
export const getAdminSupabaseClient = () => {
    const serviceKey = process.env.SUPABASE_SECRET_KEY;
    if (!serviceKey) {
        throw new Error('SUPABASE_SECRET_KEY is required for admin operations');
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey
    );
};
