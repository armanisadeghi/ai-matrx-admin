// lib/supabase/client.ts

import {createBrowserClient} from "@supabase/ssr";
import {SupabaseClient} from "@supabase/supabase-js";
import {Database} from '@/types/matrixDb.types';

export function getSupabaseClientWithAuth(jwt?: string): SupabaseClient<Database> {
    const options = jwt ? {global: {headers: {Authorization: `Bearer ${jwt}`}}} : {};

    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        options
    );
}

export const supabase = getSupabaseClientWithAuth();
