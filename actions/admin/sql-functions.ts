'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Fetches all SQL functions from the database
 */
export async function getSqlFunctions() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .rpc('get_database_functions')

        if (error) throw error

        return data
    } catch (error) {
        console.error('Error fetching SQL functions:', error)
        throw new Error('Failed to fetch SQL functions')
    }
}

/**
 * Fetches a single SQL function by its ID
 */
export async function getSqlFunctionById(id: string) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .rpc('get_database_function_by_id', { function_id: id })

        if (error) throw error

        return data
    } catch (error) {
        console.error('Error fetching SQL function:', error)
        throw new Error('Failed to fetch SQL function')
    }
}

/**
 * Fetches filtered SQL functions based on search parameters
 */
export async function searchSqlFunctions({ schema, name, returnType }: { 
    schema?: string, 
    name?: string, 
    returnType?: string 
}) {
    try {
        const supabase = await createClient()

        let query = supabase.rpc('get_database_functions')

        // We'll filter the results on the client side for now
        // In a real implementation, we would create a specialized RPC function
        // to handle filtering on the database side
        const { data, error } = await query

        if (error) throw error

        // Apply filters
        let filteredData = data

        if (schema) {
            filteredData = filteredData.filter(func => 
                func.schema.toLowerCase().includes(schema.toLowerCase())
            )
        }

        if (name) {
            filteredData = filteredData.filter(func => 
                func.name.toLowerCase().includes(name.toLowerCase())
            )
        }

        if (returnType) {
            filteredData = filteredData.filter(func => 
                func.returns.toLowerCase().includes(returnType.toLowerCase())
            )
        }

        return filteredData
    } catch (error) {
        console.error('Error searching SQL functions:', error)
        throw new Error('Failed to search SQL functions')
    }
}

/**
 * Creates a new SQL function
 */
export async function createSqlFunction(functionDefinition: string) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .rpc('execute_safe_query', {
                query: functionDefinition
            })

        if (error) throw error

        revalidatePath('/administration/database/sql-functions')
        return data
    } catch (error) {
        console.error('Error creating SQL function:', error)
        throw new Error('Failed to create SQL function')
    }
}

/**
 * Updates an existing SQL function
 */
export async function updateSqlFunction(functionDefinition: string) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .rpc('execute_safe_query', {
                query: functionDefinition
            })

        if (error) throw error

        revalidatePath('/administration/database/sql-functions')
        return data
    } catch (error) {
        console.error('Error updating SQL function:', error)
        throw new Error('Failed to update SQL function')
    }
}

/**
 * Deletes a SQL function
 */
export async function deleteSqlFunction(schema: string, functionName: string, argumentTypes: string) {
    try {
        const supabase = await createClient()

        // Construct the DROP FUNCTION query
        const query = `DROP FUNCTION IF EXISTS ${schema}.${functionName}(${argumentTypes});`

        const { data, error } = await supabase
            .rpc('execute_safe_query', {
                query
            })

        if (error) throw error

        revalidatePath('/administration/database/sql-functions')
        return data
    } catch (error) {
        console.error('Error deleting SQL function:', error)
        throw new Error('Failed to delete SQL function')
    }
} 