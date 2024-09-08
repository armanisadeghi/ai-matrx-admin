import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/matrixDb.types';

const supabaseUrl = process.env.NEXT_PUBLIC_MATRIX_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_MATRIX_SUPABASE_ANON_KEY!;

export function getSupabaseClientWithAuth(jwt?: string): SupabaseClient<Database> {
    const options = jwt ? { global: { headers: { Authorization: `Bearer ${jwt}` } } } : {};
    return createClient<Database>(supabaseUrl, supabaseAnonKey, options);
}

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]


export const supabase = getSupabaseClientWithAuth();

