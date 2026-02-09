'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    ArrowLeft,
    Square,
    Clock,
    Trash2,
    Timer,
    AlertCircle,
    Terminal,
    Send,
    Settings,
    Activity,
    HardDrive,
    Copy,
    Check,
    Shield,
    ChevronDown,
    ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppSelector } from '@/lib/redux/hooks'
import { selectIsAdmin } from '@/lib/redux/slices/userSlice'
import { SshAccessPanel } from '@/components/sandbox/ssh-access-panel'
import type { SandboxInstance, SandboxStatus, SandboxExecResponse } from '@/types/sandbox'

const CWD_MARKER = '__MATRX_CWD__='

function escapeForShell(str: string): string {
    return "'" + str.replace(/'/g, "'\\''") + "'"
}

function parseExecOutput(stdout: string): { output: string; newCwd: string | null } {
    const lines = stdout.split('\n')
    const cwdLineIndex = lines.findLastIndex(line => line.startsWith(CWD_MARKER))
    if (cwdLineIndex !== -1) {
        const newCwd = lines[cwdLineIndex].slice(CWD_MARKER.length).trim()
        const outputLines = [...lines.slice(0, cwdLineIndex), ...lines.slice(cwdLineIndex + 1)]
        // Remove trailing empty lines from the marker
        while (outputLines.length > 0 && outputLines[outputLines.length - 1] === '') {
            outputLines.pop()
        }
        return { output: outputLines.join('\n'), newCwd: newCwd || null }
    }
    return { output: stdout, newCwd: null }
}

/** Derive the effective status by checking time-based expiry.
 * The DB status may still say "ready" or "running" after TTL expires. */
function getEffectiveStatus(instance: SandboxInstance): SandboxStatus {
    if (['ready', 'running'].includes(instance.status) && instance.expires_at) {
        if (new Date(instance.expires_at).getTime() <= Date.now()) {
            return 'expired'
        }
    }
    return instance.status
}

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

interface TerminalEntry {
    type: 'command' | 'stdout' | 'stderr' | 'info'
    text: string
    exitCode?: number
    cwd?: string
}

export default function SandboxDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const isAdmin = useAppSelector(selectIsAdmin)

    const [instance, setInstance] = useState<SandboxInstance | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [commandInput, setCommandInput] = useState('')
    const [executing, setExecuting] = useState(false)
    const [terminalHistory, setTerminalHistory] = useState<TerminalEntry[]>([])
    const [commandHistory, setCommandHistory] = useState<string[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [timeRemaining, setTimeRemaining] = useState('')
    const [cwd, setCwd] = useState('/')
    const [copied, setCopied] = useState(false)
    const [adminPanelOpen, setAdminPanelOpen] = useState(false)

    const terminalRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const fetchInstance = useCallback(async () => {
        try {
            const resp = await fetch(`/api/sandbox/${id}`)
            if (!resp.ok) {
                if (resp.status === 404) {
                    setError('Sandbox instance not found')
                    return
                }
                throw new Error('Failed to fetch sandbox')
            }
            const data = await resp.json()
            setInstance(data.instance)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        fetchInstance()
        const interval = setInterval(fetchInstance, 10000)
        return () => clearInterval(interval)
    }, [fetchInstance])

    useEffect(() => {
        if (!instance?.expires_at) {
            setTimeRemaining('--')
            return
        }
        const update = () => {
            const diff = new Date(instance.expires_at!).getTime() - Date.now()
            if (diff <= 0) {
                setTimeRemaining('Expired')
                return
            }
            const h = Math.floor(diff / 3600000)
            const m = Math.floor((diff % 3600000) / 60000)
            const s = Math.floor((diff % 60000) / 1000)
            setTimeRemaining(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`)
        }
        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [instance?.expires_at])

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight
        }
    }, [terminalHistory])

    const handleExec = async () => {
        if (!commandInput.trim() || executing) return

        const cmd = commandInput.trim()
        setCommandInput('')
        setCommandHistory((prev) => [...prev, cmd])
        setHistoryIndex(-1)
        setTerminalHistory((prev) => [...prev, { type: 'command', text: cmd, cwd }])
        setExecuting(true)

        // Wrap command to persist CWD across executions
        // Falls back to / if the stored CWD is inaccessible (e.g. permission denied)
        const wrappedCommand = `cd ${escapeForShell(cwd)} 2>/dev/null || cd /; ${cmd}; __mxe=$?; echo "${CWD_MARKER}$(pwd)"; exit $__mxe`

        try {
            const resp = await fetch(`/api/sandbox/${id}/exec`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: wrappedCommand, timeout: 60 }),
            })

            if (!resp.ok) {
                const body = await resp.json()
                setTerminalHistory((prev) => [
                    ...prev,
                    { type: 'stderr', text: body.error || 'Command failed' },
                ])
                return
            }

            const result: SandboxExecResponse = await resp.json()

            // Parse stdout to extract actual output and CWD marker
            let hasVisibleOutput = false
            if (result.stdout) {
                const { output, newCwd } = parseExecOutput(result.stdout)
                if (newCwd) setCwd(newCwd)
                if (output) {
                    hasVisibleOutput = true
                    setTerminalHistory((prev) => [
                        ...prev,
                        { type: 'stdout', text: output, exitCode: result.exit_code },
                    ])
                }
            }
            if (result.stderr) {
                hasVisibleOutput = true
                setTerminalHistory((prev) => [
                    ...prev,
                    { type: 'stderr', text: result.stderr },
                ])
            }
            // Only show exit code for non-zero (failures) when there was no visible output
            if (result.exit_code !== 0 && !hasVisibleOutput) {
                setTerminalHistory((prev) => [
                    ...prev,
                    { type: 'info', text: `(exit code: ${result.exit_code})` },
                ])
            }
        } catch (err) {
            setTerminalHistory((prev) => [
                ...prev,
                { type: 'stderr', text: err instanceof Error ? err.message : 'Execution failed' },
            ])
        } finally {
            setExecuting(false)
            // Focus after React re-render completes (disabled prop changes)
            requestAnimationFrame(() => {
                inputRef.current?.focus()
            })
        }
    }

    const handleCopyTerminal = useCallback(async () => {
        const text = terminalHistory
            .map((entry) => {
                switch (entry.type) {
                    case 'command': return `$ ${entry.text}`
                    case 'stdout': return entry.text
                    case 'stderr': return `[stderr] ${entry.text}`
                    case 'info': return entry.text
                    default: return entry.text
                }
            })
            .join('\n')

        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback for older browsers
            const textarea = document.createElement('textarea')
            textarea.value = text
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }, [terminalHistory])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleExec()
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            if (commandHistory.length > 0) {
                const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex
                setHistoryIndex(newIndex)
                setCommandInput(commandHistory[commandHistory.length - 1 - newIndex])
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1
                setHistoryIndex(newIndex)
                setCommandInput(commandHistory[commandHistory.length - 1 - newIndex])
            } else {
                setHistoryIndex(-1)
                setCommandInput('')
            }
        }
    }

    const handleStop = async () => {
        try {
            const resp = await fetch(`/api/sandbox/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'stop' }),
            })
            if (resp.ok) {
                const data = await resp.json()
                setInstance(data.instance)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to stop')
        }
    }

    const handleExtend = async (seconds: number) => {
        try {
            const resp = await fetch(`/api/sandbox/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'extend', ttl_seconds: seconds }),
            })
            if (resp.ok) {
                const data = await resp.json()
                setInstance(data.instance)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to extend')
        }
    }

    const handleDelete = async () => {
        try {
            const resp = await fetch(`/api/sandbox/${id}`, { method: 'DELETE' })
            if (resp.ok || resp.status === 204) {
                router.push('/sandbox')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete')
        }
    }

    if (loading) {
        return (
            <div className="h-page flex flex-col bg-textured overflow-hidden">
                <div className="shrink-0 p-4 border-b border-border bg-textured">
                    <div className="flex items-center justify-between max-w-6xl mx-auto">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-8 w-8 rounded" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-16 rounded" />
                            <Skeleton className="h-8 w-16 rounded" />
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="max-w-6xl mx-auto space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <Card key={i}>
                                    <CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader>
                                    <CardContent><Skeleton className="h-8 w-24" /></CardContent>
                                </Card>
                            ))}
                        </div>
                        <Card>
                            <CardHeader className="pb-2"><Skeleton className="h-4 w-20" /></CardHeader>
                            <CardContent><Skeleton className="h-48 w-full rounded-md" /></CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        )
    }

    if (!instance) {
        return (
            <div className="h-page bg-textured flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                        <h3 className="text-lg font-medium mb-2">Sandbox Not Found</h3>
                        <p className="text-sm text-muted-foreground mb-4">{error || 'This sandbox does not exist.'}</p>
                        <Button onClick={() => router.push('/sandbox')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Sandboxes
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const effectiveStatus = getEffectiveStatus(instance)
    const isActive = ['ready', 'running'].includes(effectiveStatus)
    const statusConfig = STATUS_BADGE_MAP[effectiveStatus]

    return (
        <div className="h-page flex flex-col bg-textured overflow-hidden">
            <div className="shrink-0 p-4 border-b border-border bg-textured">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" onClick={() => router.push('/sandbox')}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-semibold font-mono">{instance.sandbox_id}</h1>
                                <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Created {new Date(instance.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isActive && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => handleExtend(3600)}>
                                    <Clock className="w-4 h-4 mr-1" />
                                    +1h
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleStop}>
                                    <Square className="w-4 h-4 mr-1" />
                                    Stop
                                </Button>
                            </>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteOpen(true)}
                            className="text-destructive hover:text-destructive"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-6xl mx-auto space-y-4">
                {error && !instance && (
                    <Card className="border-destructive">
                        <CardContent className="flex items-center gap-2 p-4">
                            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                            <p className="text-sm text-destructive">{error}</p>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Timer className="w-4 h-4" />
                                Time Remaining
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-mono font-semibold">{timeRemaining}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                TTL: {Math.floor(instance.ttl_seconds / 3600)}h {Math.floor((instance.ttl_seconds % 3600) / 60)}m
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Last Heartbeat
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm font-mono">
                                {instance.last_heartbeat_at
                                    ? new Date(instance.last_heartbeat_at).toLocaleString()
                                    : 'No heartbeat yet'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <HardDrive className="w-4 h-4" />
                                Storage Paths
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                                Hot: <span className="font-mono">{instance.hot_path}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Cold: <span className="font-mono">{instance.cold_path}</span>
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Terminal className="w-4 h-4" />
                                Terminal
                            </CardTitle>
                            {terminalHistory.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopyTerminal}
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-green-500" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div
                            ref={terminalRef}
                            className="bg-zinc-950 rounded-t-md p-4 min-h-48 max-h-[50vh] overflow-y-auto font-mono text-sm"
                            onClick={() => inputRef.current?.focus()}
                        >
                            {terminalHistory.length === 0 && (
                                <p className="text-zinc-500">
                                    {isActive
                                        ? 'Type a command below and press Enter...'
                                        : 'Sandbox is not running. Terminal is read-only.'}
                                </p>
                            )}
                            {terminalHistory.map((entry, i) => (
                                <div key={i} className="mb-1">
                                    {entry.type === 'command' && (
                                        <div className="text-green-400">
                                            <span className="text-blue-400 text-xs">{entry.cwd || ''}</span>
                                            <span className="text-zinc-500"> $ </span>
                                            {entry.text}
                                        </div>
                                    )}
                                    {entry.type === 'stdout' && (
                                        <pre className="text-zinc-200 whitespace-pre-wrap">{entry.text}</pre>
                                    )}
                                    {entry.type === 'stderr' && (
                                        <pre className="text-red-400 whitespace-pre-wrap">{entry.text}</pre>
                                    )}
                                    {entry.type === 'info' && (
                                        <div className="text-zinc-500 italic">{entry.text}</div>
                                    )}
                                </div>
                            ))}
                            {executing && (
                                <div className="text-zinc-500 animate-pulse">Executing...</div>
                            )}
                        </div>
                        <div className="flex items-center bg-zinc-900 rounded-b-md border-t border-zinc-800">
                            <span className="text-blue-400 font-mono text-xs pl-3 pr-1 shrink-0 max-w-[200px] truncate" title={cwd}>{cwd}</span>
                            <span className="text-green-400 font-mono text-sm pr-1 shrink-0">$</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={commandInput}
                                onChange={(e) => setCommandInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={!isActive || executing}
                                placeholder={isActive ? 'Enter command...' : 'Sandbox not running'}
                                className="flex-1 bg-transparent text-zinc-200 font-mono text-sm py-3 px-2 outline-none placeholder:text-zinc-600 disabled:opacity-50"
                                autoFocus
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleExec}
                                disabled={!isActive || executing || !commandInput.trim()}
                                className="mr-2 text-zinc-400 hover:text-zinc-200"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {isActive && (
                    <SshAccessPanel sandboxId={id} disabled={!isActive} />
                )}

                {Object.keys(instance.config).length > 0 && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-x-auto">
                                {JSON.stringify(instance.config, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                )}

                {instance.stop_reason && (
                    <Card>
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Stop reason:</span>{' '}
                                {instance.stop_reason.replace(/_/g, ' ')}
                                {instance.stopped_at && (
                                    <> at {new Date(instance.stopped_at).toLocaleString()}</>
                                )}
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Admin Details Panel */}
                {isAdmin && (
                    <Card className="border-amber-500/30 bg-amber-500/5">
                        <CardHeader className="pb-2">
                            <button
                                onClick={() => setAdminPanelOpen(!adminPanelOpen)}
                                className="flex items-center gap-2 w-full text-left"
                            >
                                <Shield className="w-4 h-4 text-amber-500" />
                                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400 flex-1">
                                    Admin Details
                                </CardTitle>
                                {adminPanelOpen ? (
                                    <ChevronDown className="w-4 h-4 text-amber-500" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-amber-500" />
                                )}
                            </button>
                        </CardHeader>
                        {adminPanelOpen && (
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-xs font-medium text-muted-foreground block mb-0.5">Instance ID</span>
                                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded break-all">{instance.id}</code>
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-muted-foreground block mb-0.5">Sandbox ID</span>
                                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded break-all">{instance.sandbox_id}</code>
                                    </div>
                                    {instance.container_id && (
                                        <div>
                                            <span className="text-xs font-medium text-muted-foreground block mb-0.5">Container ID</span>
                                            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded break-all">{instance.container_id}</code>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-xs font-medium text-muted-foreground block mb-0.5">User ID</span>
                                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded break-all">{instance.user_id}</code>
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-muted-foreground block mb-0.5">Hot Path</span>
                                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{instance.hot_path}</code>
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-muted-foreground block mb-0.5">Cold Path</span>
                                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{instance.cold_path}</code>
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-muted-foreground block mb-0.5">TTL</span>
                                        <span className="text-xs">{instance.ttl_seconds}s ({Math.floor(instance.ttl_seconds / 3600)}h {Math.floor((instance.ttl_seconds % 3600) / 60)}m)</span>
                                    </div>
                                    <div>
                                        <span className="text-xs font-medium text-muted-foreground block mb-0.5">Expires At</span>
                                        <span className="text-xs font-mono">{instance.expires_at ? new Date(instance.expires_at).toISOString() : '--'}</span>
                                    </div>
                                    {Object.keys(instance.config).length > 0 && (
                                        <div className="md:col-span-2">
                                            <span className="text-xs font-medium text-muted-foreground block mb-0.5">Config</span>
                                            <pre className="text-xs font-mono bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(instance.config, null, 2)}</pre>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                )}
                </div>
            </div>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Sandbox</DialogTitle>
                        <DialogDescription>
                            This will permanently remove this sandbox instance
                            {isActive ? ' and destroy the running container' : ''}.
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>
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
