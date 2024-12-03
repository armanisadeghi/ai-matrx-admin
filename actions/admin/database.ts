// actions/admin/database.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getFunctions() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .rpc('get_database_functions')

        if (error) throw error

        revalidatePath('/admin/database')
        return data
    } catch (error) {
        console.error('Error fetching functions:', error)
        throw new Error('Failed to fetch database functions')
    }
}

export async function getPermissions() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .rpc('get_database_permissions')

        if (error) throw error

        revalidatePath('/admin/database')
        return data
    } catch (error) {
        console.error('Error fetching permissions:', error)
        throw new Error('Failed to fetch database permissions')
    }
}

export async function executeSqlQuery(query: string) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .rpc('execute_safe_query', {
                query
            })

        if (error) throw error

        return data
    } catch (error) {
        console.error('Error executing query:', error)
        throw new Error('Failed to execute SQL query')
    }
}

// Optional: Add a type-safe way to check if an error is from Supabase
function isSupabaseError(error: unknown): error is { message: string } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as any).message === 'string'
    )
}
