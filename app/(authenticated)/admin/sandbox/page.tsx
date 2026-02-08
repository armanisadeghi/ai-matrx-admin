'use client'

import { useEffect, useState, useCallback } from 'react'
import {
    Container,
    RefreshCw,
    AlertCircle,
    Square,
    Trash2,
    Timer,
    Users,
    Activity,
    Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { createClient } from '@/utils/supabase/client'
import type { SandboxInstance, SandboxStatus } from '@/types/sandbox'

const STATUS_BADGE_MAP: Record<SandboxStatus, { variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'info' | 'default'; label: string }> = {
    creating: { variant: 'info', label: 'Creating' },
    starting: { variant: 'info', label: 'Starting' },
    ready: { variant: 'success', label: 'Ready' },
    running: { variant: 'success', label: 'Running' },
    shutting_down: { variant: 'warning', label: 'Shutting Down' },
    stopped: { variant: 'secondary', label: 'Stopped' },
    failed: { variant: 'destructive', label: 'Failed' },
    expired: { variant: 'secondary', label: 'Expired' },
}

export default function AdminSandboxPage() {
    const [instances, setInstances] = useState<SandboxInstance[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [deleteTarget, setDeleteTarget] = useState<SandboxInstance | null>(null)

    const fetchAllInstances = useCallback(async () => {
        try {
            const supabase = createClient()

            let query = supabase
                .from('sandbox_instances')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100)

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            const { data, error: fetchError } = await query

            if (fetchError) {
                setError(fetchError.message)
                return
            }

            setInstances((data as SandboxInstance[]) || [])
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [statusFilter])

    useEffect(() => {
        fetchAllInstances()
        const interval = setInterval(fetchAllInstances, 15000)
        return () => clearInterval(interval)
    }, [fetchAllInstances])

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await fetchAllInstances()
        setIsRefreshing(false)
    }

    const handleForceStop = async (instance: SandboxInstance) => {
        try {
            const resp = await fetch(`/api/sandbox/${instance.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'stop' }),
            })
            if (resp.ok) {
                await fetchAllInstances()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to stop')
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        try {
            const resp = await fetch(`/api/sandbox/${deleteTarget.id}`, { method: 'DELETE' })
            if (resp.ok || resp.status === 204) {
                setInstances((prev) => prev.filter((i) => i.id !== deleteTarget.id))
                setDeleteTarget(null)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete')
        }
    }

    const activeCount = instances.filter((i) =>
        ['creating', 'starting', 'ready', 'running'].includes(i.status)
    ).length
    const uniqueUsers = new Set(instances.map((i) => i.user_id)).size
    const failedCount = instances.filter((i) => i.status === 'failed').length

    const statusFilters = ['all', 'running', 'ready', 'creating', 'stopped', 'failed', 'expired']

    return (
        <div className="min-h-screen bg-textured">
            <div className="p-4 border-b border-border bg-textured">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Container className="w-6 h-6 text-orange-500" />
                        <div>
                            <h1 className="text-lg font-semibold">Sandbox Administration</h1>
                            <p className="text-sm text-muted-foreground">
                                Monitor and manage all sandbox instances
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <div className="p-4 max-w-7xl mx-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <Server className="w-8 h-8 text-green-500" />
                            <div>
                                <p className="text-2xl font-semibold">{activeCount}</p>
                                <p className="text-xs text-muted-foreground">Active Instances</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <Activity className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="text-2xl font-semibold">{instances.length}</p>
                                <p className="text-xs text-muted-foreground">Total Instances</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <Users className="w-8 h-8 text-purple-500" />
                            <div>
                                <p className="text-2xl font-semibold">{uniqueUsers}</p>
                                <p className="text-xs text-muted-foreground">Unique Users</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                            <div>
                                <p className="text-2xl font-semibold">{failedCount}</p>
                                <p className="text-xs text-muted-foreground">Failed</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {error && (
                    <Card className="border-destructive">
                        <CardContent className="flex items-center gap-2 p-4">
                            <AlertCircle className="w-4 h-4 text-destructive" />
                            <p className="text-sm text-destructive">{error}</p>
                        </CardContent>
                    </Card>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                    {statusFilters.map((s) => (
                        <Button
                            key={s}
                            variant={statusFilter === s ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatusFilter(s)}
                        >
                            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                        </Button>
                    ))}
                </div>

                {loading ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            Loading sandbox instances...
                        </CardContent>
                    </Card>
                ) : instances.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No sandbox instances found for the selected filter.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Sandbox ID</TableHead>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Expires</TableHead>
                                    <TableHead>Stop Reason</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {instances.map((instance) => {
                                    const statusConfig = STATUS_BADGE_MAP[instance.status]
                                    const isActive = ['ready', 'running'].includes(instance.status)

                                    return (
                                        <TableRow key={instance.id}>
                                            <TableCell className="font-mono text-xs">
                                                {instance.sandbox_id}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs truncate max-w-[120px]">
                                                {instance.user_id.slice(0, 8)}...
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusConfig.variant}>
                                                    {statusConfig.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {new Date(instance.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {instance.expires_at
                                                    ? new Date(instance.expires_at).toLocaleString()
                                                    : '--'}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {instance.stop_reason?.replace(/_/g, ' ') || '--'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {isActive && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleForceStop(instance)}
                                                        >
                                                            <Square className="w-3 h-3 mr-1" />
                                                            Stop
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setDeleteTarget(instance)}
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Sandbox</DialogTitle>
                        <DialogDescription>
                            This will permanently remove this sandbox instance. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
