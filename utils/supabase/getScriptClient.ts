import { createClient } from '@supabase/supabase-js';

// Simple client for scripts and non-request contexts
export const getScriptSupabaseClient = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
};

// Admin client for migrations (uses service role key)
export const getAdminSupabaseClient = () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations');
    }
    
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey
    );
};
