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

        if (error) {
            console.error('Error executing query:', error)
            // Preserve the full error details for admin debugging
            const errorMessage = typeof error === 'object' && error !== null && 'message' in error
                ? (error as any).message
                : JSON.stringify(error, null, 2)
            const errorDetails = typeof error === 'object' && error !== null && 'details' in error
                ? `\n\nDetails: ${(error as any).details}`
                : ''
            const errorHint = typeof error === 'object' && error !== null && 'hint' in error
                ? `\n\nHint: ${(error as any).hint}`
                : ''
            const errorCode = typeof error === 'object' && error !== null && 'code' in error
                ? `\n\nError Code: ${(error as any).code}`
                : ''
            
            throw new Error(`SQL Query Error: ${errorMessage}${errorDetails}${errorHint}${errorCode}`)
        }

        return data
    } catch (error) {
        console.error('Error executing query:', error)
        // If it's already an Error object with our formatted message, just re-throw it
        if (error instanceof Error) {
            throw error
        }
        // Otherwise, try to preserve as much information as possible
        const errorMessage = typeof error === 'object' && error !== null
            ? JSON.stringify(error, null, 2)
            : String(error)
        throw new Error(`Failed to execute SQL query: ${errorMessage}`)
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
