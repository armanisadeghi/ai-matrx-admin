'use client'

import { useState, useCallback } from 'react'
import { KeyRound, Copy, Check, Download, Loader2, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { SandboxAccessResponse } from '@/types/sandbox'

interface SshAccessPanelProps {
    sandboxId: string
    apiBasePath?: string
    disabled?: boolean
}

export function SshAccessPanel({ sandboxId, apiBasePath = '/api/sandbox', disabled = false }: SshAccessPanelProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [access, setAccess] = useState<SandboxAccessResponse | null>(null)
    const [copiedField, setCopiedField] = useState<string | null>(null)

    const handleRequestAccess = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const resp = await fetch(`${apiBasePath}/${sandboxId}/access`, { method: 'POST' })
            if (!resp.ok) {
                const body = await resp.json()
                throw new Error(body.error || 'Failed to generate SSH credentials')
            }
            const data: SandboxAccessResponse = await resp.json()
            setAccess(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [sandboxId, apiBasePath])

    const copyToClipboard = useCallback(async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedField(field)
            setTimeout(() => setCopiedField(null), 2000)
        } catch {
            const textarea = document.createElement('textarea')
            textarea.value = text
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            setCopiedField(field)
            setTimeout(() => setCopiedField(null), 2000)
        }
    }, [])

    const handleDownloadKey = useCallback(() => {
        if (!access) return
        const blob = new Blob([access.private_key], { type: 'application/x-pem-file' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `sandbox-${sandboxId}.pem`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }, [access, sandboxId])

    if (!access) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        Direct SSH Access
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                        Generate temporary SSH credentials for direct shell access to this sandbox.
                    </p>
                    {error && (
                        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-2 mb-3">
                            {error}
                        </div>
                    )}
                    <Button
                        onClick={handleRequestAccess}
                        disabled={disabled || loading}
                        size="sm"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <KeyRound className="w-4 h-4 mr-2" />
                                Request SSH Access
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-green-500/30 bg-green-500/5">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-green-600 dark:text-green-400" />
                        SSH Credentials Ready
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRequestAccess}
                        disabled={loading}
                        className="h-7 px-2 text-xs"
                    >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Regenerate'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">SSH Command</label>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono bg-zinc-950 text-green-400 rounded-md p-2.5 overflow-x-auto">
                            {access.ssh_command}
                        </code>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(access.ssh_command, 'command')}
                            className="shrink-0 h-8 w-8 p-0"
                        >
                            {copiedField === 'command' ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                                <Copy className="w-3.5 h-3.5" />
                            )}
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadKey}
                        className="text-xs"
                    >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        Download Key (.pem)
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(access.private_key, 'key')}
                        className="text-xs"
                    >
                        {copiedField === 'key' ? (
                            <>
                                <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                                Key Copied
                            </>
                        ) : (
                            <>
                                <Copy className="w-3.5 h-3.5 mr-1.5" />
                                Copy Key
                            </>
                        )}
                    </Button>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-2">
                    <p>To connect, save the key and set permissions:</p>
                    <code className="block font-mono bg-muted rounded px-2 py-1">
                        chmod 600 sandbox-{sandboxId}.pem
                    </code>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                        Credentials are temporary and expire when the sandbox is destroyed.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
