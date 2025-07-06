'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { DatabaseEnum, CreateEnumRequest, UpdateEnumRequest, EnumUsage } from '@/types/enum-types'

/**
 * Fetches all database enums
 */
export async function getDatabaseEnums(): Promise<DatabaseEnum[]> {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .rpc('get_database_enums')

        if (error) throw error

        return data
    } catch (error) {
        console.error('Error fetching database enums:', error)
        throw new Error('Failed to fetch database enums')
    }
}

/**
 * Fetches a single enum by schema and name
 */
export async function getEnumByName(schema: string, name: string): Promise<DatabaseEnum | null> {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .rpc('get_enum_by_name', { 
                p_schema: schema,
                p_name: name 
            })

        if (error) throw error

        return data
    } catch (error) {
        console.error('Error fetching enum:', error)
        throw new Error('Failed to fetch enum')
    }
}

/**
 * Searches enums based on filter criteria
 */
export async function searchEnums({ schema, name, hasValue }: { 
    schema?: string, 
    name?: string, 
    hasValue?: string 
}): Promise<DatabaseEnum[]> {
    try {
        const supabase = await createClient()

        // Get all enums first
        const { data, error } = await supabase.rpc('get_database_enums')

        if (error) throw error

        // Apply filters client-side for now
        let filteredData = data

        if (schema) {
            filteredData = filteredData.filter(enumType => 
                enumType.schema.toLowerCase().includes(schema.toLowerCase())
            )
        }

        if (name) {
            filteredData = filteredData.filter(enumType => 
                enumType.name.toLowerCase().includes(name.toLowerCase())
            )
        }

        if (hasValue) {
            filteredData = filteredData.filter(enumType => 
                enumType.values.some(value => 
                    value.toLowerCase().includes(hasValue.toLowerCase())
                )
            )
        }

        return filteredData
    } catch (error) {
        console.error('Error searching enums:', error)
        throw new Error('Failed to search enums')
    }
}

/**
 * Creates a new enum type
 */
export async function createEnum(request: CreateEnumRequest): Promise<boolean> {
    try {
        const supabase = await createClient()

        // Validate enum values
        if (!request.values.length) {
            throw new Error('Enum must have at least one value')
        }

        // Validate schema and name (basic SQL injection protection)
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(request.schema)) {
            throw new Error('Invalid schema name')
        }
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(request.name)) {
            throw new Error('Invalid enum name')
        }

        // Build CREATE TYPE query with proper escaping
        const values = request.values.map(value => `'${value.replace(/'/g, "''")}'`).join(', ')
        const query = `CREATE TYPE ${request.schema}.${request.name} AS ENUM (${values});`

        console.log('Creating enum with query:', query)

        const { data, error } = await supabase
            .rpc('execute_safe_query', {
                query
            })

        console.log('Raw response from execute_safe_query:', { data, error })

        if (error) {
            console.error('Supabase error:', error)
            throw error
        }

        // Check if the execution was actually successful
        if (data && typeof data === 'object' && 'success' in data && data.success === false) {
            console.error('Query execution failed:', data)
            throw new Error(data.error || 'Query execution failed')
        }

        console.log('Enum created successfully, data:', data)

        // Add description if provided
        if (request.description) {
            const escapedDescription = request.description.replace(/'/g, "''")
            const commentQuery = `COMMENT ON TYPE ${request.schema}.${request.name} IS '${escapedDescription}';`
            console.log('Adding description with query:', commentQuery)
            
            const { error: commentError } = await supabase.rpc('execute_safe_query', { query: commentQuery })
            if (commentError) {
                console.error('Error adding description:', commentError)
                // Don't fail the whole operation if description fails
            }
        }

        revalidatePath('/administration/database/enums')
        return true
    } catch (error) {
        console.error('Error creating enum:', error)
        throw new Error(`Failed to create enum: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
}

/**
 * Updates an existing enum type
 */
export async function updateEnum(request: UpdateEnumRequest): Promise<boolean> {
    try {
        const supabase = await createClient()

        // Add new values
        if (request.valuesToAdd && request.valuesToAdd.length > 0) {
            for (const value of request.valuesToAdd) {
                const query = `ALTER TYPE ${request.schema}.${request.name} ADD VALUE '${value}';`
                const { error } = await supabase.rpc('execute_safe_query', { query })
                if (error) throw error
            }
        }

        // Note: PostgreSQL doesn't support renaming enum values directly
        // This would require more complex operations (dropping and recreating)
        if (request.valuesToRename && request.valuesToRename.length > 0) {
            throw new Error('Renaming enum values is not supported in PostgreSQL')
        }

        // Update description if provided
        if (request.description !== undefined) {
            const commentQuery = request.description 
                ? `COMMENT ON TYPE ${request.schema}.${request.name} IS '${request.description}';`
                : `COMMENT ON TYPE ${request.schema}.${request.name} IS NULL;`
            await supabase.rpc('execute_safe_query', { query: commentQuery })
        }

        revalidatePath('/administration/database/enums')
        return true
    } catch (error) {
        console.error('Error updating enum:', error)
        throw new Error('Failed to update enum')
    }
}

/**
 * Deletes an enum type
 */
export async function deleteEnum(schema: string, name: string): Promise<boolean> {
    try {
        const supabase = await createClient()

        // Check if enum is in use
        const usage = await getEnumUsage(schema, name)
        if (usage.length > 0) {
            throw new Error(`Cannot delete enum '${name}' because it is used by ${usage.length} column(s)`)
        }

        const query = `DROP TYPE ${schema}.${name};`

        const { data, error } = await supabase
            .rpc('execute_safe_query', {
                query
            })

        if (error) throw error

        revalidatePath('/administration/database/enums')
        return true
    } catch (error) {
        console.error('Error deleting enum:', error)
        throw new Error('Failed to delete enum')
    }
}

/**
 * Gets enum usage information
 */
export async function getEnumUsage(schema: string, name: string): Promise<EnumUsage[]> {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .rpc('get_enum_usage', { 
                p_schema: schema,
                p_name: name 
            })

        if (error) throw error

        return data || []
    } catch (error) {
        console.error('Error fetching enum usage:', error)
        throw new Error('Failed to fetch enum usage')
    }
} 