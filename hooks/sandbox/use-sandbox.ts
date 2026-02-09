'use client'

import { useCallback, useRef, useState } from 'react'
import type {
    SandboxInstance,
    SandboxListResponse,
    SandboxCreateRequest,
    SandboxExecRequest,
    SandboxExecResponse,
    SandboxActionRequest,
} from '@/types/sandbox'

export function useSandboxInstances(projectId?: string) {
    const [instances, setInstances] = useState<SandboxInstance[]>([])
    const [loading, setLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [total, setTotal] = useState(0)
    const hasFetchedOnce = useRef(false)

    const fetchInstances = useCallback(
        async (opts?: { status?: string; limit?: number; offset?: number }) => {
            // Only show full loading state on initial fetch
            if (!hasFetchedOnce.current) {
                setLoading(true)
            } else {
                setRefreshing(true)
            }
            setError(null)
            try {
                const params = new URLSearchParams()
                if (projectId) params.set('project_id', projectId)
                if (opts?.status) params.set('status', opts.status)
                if (opts?.limit) params.set('limit', String(opts.limit))
                if (opts?.offset) params.set('offset', String(opts.offset))

                const resp = await fetch(`/api/sandbox?${params}`)
                if (!resp.ok) {
                    const body = await resp.json()
                    throw new Error(body.error || 'Failed to fetch instances')
                }

                const data: SandboxListResponse = await resp.json()
                setInstances(data.instances)
                setTotal(data.pagination.total)
                hasFetchedOnce.current = true
                return data
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error'
                setError(msg)
                return null
            } finally {
                setLoading(false)
                setRefreshing(false)
            }
        },
        [projectId]
    )

    const createInstance = useCallback(
        async (req: SandboxCreateRequest): Promise<{ instance: SandboxInstance | null; error: string | null }> => {
            setError(null)
            try {
                const resp = await fetch('/api/sandbox', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        project_id: req.project_id || projectId,
                        config: req.config,
                        ttl_seconds: req.ttl_seconds,
                    }),
                })

                if (!resp.ok) {
                    const body = await resp.json()
                    throw new Error(body.error || 'Failed to create sandbox')
                }

                const { instance } = await resp.json()
                setInstances((prev) => [instance, ...prev])
                setTotal((prev) => prev + 1)
                return { instance: instance as SandboxInstance, error: null }
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error'
                setError(msg)
                return { instance: null, error: msg }
            }
        },
        [projectId]
    )

    const stopInstance = useCallback(async (id: string) => {
        setError(null)
        try {
            const resp = await fetch(`/api/sandbox/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'stop' } satisfies SandboxActionRequest),
            })

            if (!resp.ok) {
                const body = await resp.json()
                throw new Error(body.error || 'Failed to stop sandbox')
            }

            const { instance } = await resp.json()
            setInstances((prev) => prev.map((i) => (i.id === id ? instance : i)))
            return instance as SandboxInstance
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            setError(msg)
            return null
        }
    }, [])

    const extendInstance = useCallback(async (id: string, additionalSeconds = 3600) => {
        setError(null)
        try {
            const resp = await fetch(`/api/sandbox/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'extend',
                    ttl_seconds: additionalSeconds,
                } satisfies SandboxActionRequest),
            })

            if (!resp.ok) {
                const body = await resp.json()
                throw new Error(body.error || 'Failed to extend sandbox')
            }

            const { instance } = await resp.json()
            setInstances((prev) => prev.map((i) => (i.id === id ? instance : i)))
            return instance as SandboxInstance
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            setError(msg)
            return null
        }
    }, [])

    const deleteInstance = useCallback(async (id: string) => {
        setError(null)
        try {
            const resp = await fetch(`/api/sandbox/${id}`, { method: 'DELETE' })

            if (!resp.ok && resp.status !== 204) {
                const body = await resp.json()
                throw new Error(body.error || 'Failed to delete sandbox')
            }

            setInstances((prev) => prev.filter((i) => i.id !== id))
            setTotal((prev) => prev - 1)
            return true
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error'
            setError(msg)
            return false
        }
    }, [])

    const execCommand = useCallback(
        async (id: string, req: SandboxExecRequest): Promise<SandboxExecResponse | null> => {
            setError(null)
            try {
                const resp = await fetch(`/api/sandbox/${id}/exec`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(req),
                })

                if (!resp.ok) {
                    const body = await resp.json()
                    throw new Error(body.error || 'Command execution failed')
                }

                return (await resp.json()) as SandboxExecResponse
            } catch (err) {
                const msg = err instanceof Error ? err.message : 'Unknown error'
                setError(msg)
                return null
            }
        },
        []
    )

    return {
        instances,
        loading,
        refreshing,
        error,
        total,
        fetchInstances,
        createInstance,
        stopInstance,
        extendInstance,
        deleteInstance,
        execCommand,
    }
}
