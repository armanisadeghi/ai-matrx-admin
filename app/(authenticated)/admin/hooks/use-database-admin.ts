// hooks/use-database-admin.ts
import { useState } from 'react'
import {
    getFunctions,
    getPermissions,
    executeSqlQuery
} from '@/actions/admin/database'

export const useDatabaseAdmin = () => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchFunctions = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getFunctions()
            return data
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
            return []
        } finally {
            setLoading(false)
        }
    }

    const fetchPermissions = async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await getPermissions()
            return data
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
            return []
        } finally {
            setLoading(false)
        }
    }

    const executeQuery = async (query: string) => {
        try {
            setLoading(true)
            setError(null)
            const data = await executeSqlQuery(query)
            return data
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
            throw err
        } finally {
            setLoading(false)
        }
    }

    return {
        loading,
        error,
        fetchFunctions,
        fetchPermissions,
        executeQuery
    }
}
