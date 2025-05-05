// hooks/use-database-admin.ts
import { useState, useCallback, useRef } from 'react'
import {
    getFunctions,
    getPermissions,
    executeSqlQuery
} from '@/actions/admin/database'

// Type definitions
interface QueryHistoryItem {
    query: string;
    result: any;
    timestamp: Date;
    executionTime: number;
}

export const useDatabaseAdmin = () => {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    // Add cache for query results
    const [queryCache, setQueryCache] = useState<Record<string, QueryHistoryItem>>({})
    
    // Add query timeout handling
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [isTimeout, setIsTimeout] = useState(false)
    
    // Clear any existing timeout when component unmounts
    const clearQueryTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
            timeoutRef.current = null
        }
    }, [])

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

    const executeQuery = async (query: string, useCache = true, timeoutMs = 30000) => {
        // Check cache first if enabled
        if (useCache && queryCache[query]) {
            return queryCache[query].result
        }
        
        clearQueryTimeout()
        setIsTimeout(false)
        
        try {
            setLoading(true)
            setError(null)
            
            // Set up timeout for long-running queries
            const timeoutPromise = new Promise((_, reject) => {
                timeoutRef.current = setTimeout(() => {
                    setIsTimeout(true)
                    reject(new Error(`Query execution timed out after ${timeoutMs/1000} seconds`))
                }, timeoutMs)
            })
            
            const startTime = performance.now()
            
            // Race between query execution and timeout
            const data = await Promise.race([
                executeSqlQuery(query),
                timeoutPromise
            ]) as any
            
            const executionTime = performance.now() - startTime
            
            // Cache the result
            const historyItem: QueryHistoryItem = {
                query,
                result: data,
                timestamp: new Date(),
                executionTime
            }
            
            setQueryCache(prev => ({
                ...prev,
                [query]: historyItem
            }))
            
            clearQueryTimeout()
            return data
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred'
            setError(errorMessage)
            throw err
        } finally {
            setLoading(false)
        }
    }
    
    const clearCache = () => {
        setQueryCache({})
    }
    
    const cancelQuery = () => {
        clearQueryTimeout()
        setLoading(false)
        setError('Query execution cancelled by user')
    }

    return {
        loading,
        error,
        isTimeout,
        fetchFunctions,
        fetchPermissions,
        executeQuery,
        clearCache,
        cancelQuery,
        queryCache
    }
}
