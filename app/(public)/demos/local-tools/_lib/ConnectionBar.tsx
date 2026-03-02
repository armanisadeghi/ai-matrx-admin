'use client';

import { Activity, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { UseMatrxLocalReturn } from './useMatrxLocal';

interface ConnectionBarProps {
    hook: UseMatrxLocalReturn;
    showTransportToggle?: boolean;
}

export function ConnectionBar({ hook, showTransportToggle = true }: ConnectionBarProps) {
    const {
        baseUrl,
        setBaseUrl,
        status,
        wsConnected,
        loading,
        discover,
        cancelAll,
        cancelRequest,
        useWebSocket,
        setUseWebSocket,
        healthInfo,
        versionInfo,
        activeRequests,
        availableTools,
    } = hook;

    const [showRequests, setShowRequests] = useState(false);

    const isDiscovering = status === 'discovering';
    const isConnecting = status === 'connecting';
    const restOnline = status === 'connected' || wsConnected;

    return (
        <div className="border rounded-lg bg-card">
            <div className="flex items-center gap-3 p-3 flex-wrap">

                {/* URL input */}
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <span className="text-xs text-muted-foreground font-medium shrink-0">Engine URL</span>
                    <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        className="h-8 text-xs font-mono flex-1 min-w-0 rounded border px-2.5 bg-background"
                    />
                </div>

                {/* Recheck */}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={discover}
                    disabled={isDiscovering}
                    className="h-8 px-3 gap-1.5 shrink-0"
                    title="Scan ports 22140–22159 for the engine"
                >
                    {isDiscovering
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <RefreshCw className="w-3.5 h-3.5" />
                    }
                    <span className="text-xs">{isDiscovering ? 'Scanning…' : 'Recheck'}</span>
                </Button>

                <div className="w-px h-6 bg-border shrink-0" />

                {/* REST pill */}
                <StatusPill
                    label="REST"
                    online={restOnline}
                    checking={isDiscovering}
                />

                {/* WS pill */}
                <StatusPill
                    label="WS"
                    online={wsConnected}
                    checking={isConnecting}
                />

                {/* Transport toggle */}
                {showTransportToggle && (
                    <>
                        <div className="w-px h-6 bg-border shrink-0" />
                        <div className="flex items-center gap-0.5 shrink-0 bg-muted rounded-md p-0.5">
                            <ToggleBtn active={useWebSocket} onClick={() => setUseWebSocket(true)}>WS</ToggleBtn>
                            <ToggleBtn active={!useWebSocket} onClick={() => setUseWebSocket(false)}>REST</ToggleBtn>
                        </div>
                    </>
                )}

                {/* Active requests */}
                {activeRequests.length > 0 && (
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setShowRequests(v => !v)}
                            className="flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-md bg-orange-50 dark:bg-orange-950/30 text-orange-600 border border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
                        >
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {activeRequests.length} running
                        </button>
                        {showRequests && (
                            <div className="absolute top-full mt-1.5 right-0 z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[220px]">
                                {activeRequests.map((req) => (
                                    <div key={req.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-accent">
                                        <span className="font-mono font-medium truncate flex-1">{req.tool}</span>
                                        <span className="text-muted-foreground shrink-0">
                                            {Math.round((Date.now() - req.startedAt.getTime()) / 1000)}s
                                        </span>
                                        <button onClick={() => cancelRequest(req.id)} className="text-destructive hover:text-destructive/80 shrink-0">
                                            <XCircle className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                <div className="border-t mt-1 pt-1 px-3 pb-1">
                                    <button
                                        onClick={() => { cancelAll(); setShowRequests(false); }}
                                        className="text-xs text-destructive hover:text-destructive/80"
                                    >
                                        Cancel all
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Cancel when loading */}
                {loading && (
                    <Button size="sm" variant="destructive" onClick={cancelAll} className="h-7 px-2.5 gap-1 text-xs shrink-0">
                        <XCircle className="w-3 h-3" /> Cancel
                    </Button>
                )}
            </div>

            {/* Info strip */}
            {(healthInfo || versionInfo || availableTools.length > 0) && (
                <div className="flex items-center gap-3 px-3 pb-2.5 text-[11px] text-muted-foreground border-t pt-2">
                    {(versionInfo?.version || healthInfo?.version) && (
                        <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            v{versionInfo?.version || healthInfo?.version}
                        </span>
                    )}
                    {healthInfo && (
                        <span className={healthInfo.status === 'ok' || healthInfo.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}>
                            {healthInfo.status === 'ok' || healthInfo.status === 'healthy' ? 'Engine healthy' : `Engine: ${healthInfo.status}`}
                        </span>
                    )}
                    {availableTools.length > 0 && (
                        <span>{availableTools.length} tools available</span>
                    )}
                    <span className="ml-auto">
                        Transport: <span className="font-medium text-foreground">{useWebSocket ? 'WebSocket' : 'REST'}</span>
                    </span>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ label, online, checking }: { label: string; online: boolean; checking: boolean }) {
    return (
        <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground font-medium">{label}</span>
            {checking ? (
                <span className="flex items-center gap-1 text-xs text-yellow-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    checking
                </span>
            ) : online ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-500">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    online
                </span>
            ) : (
                <span className="flex items-center gap-1 text-xs text-red-500">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    offline
                </span>
            )}
        </div>
    );
}

function ToggleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={`h-6 px-2.5 text-xs rounded transition-colors ${
                active
                    ? 'bg-background text-foreground shadow-sm font-medium'
                    : 'text-muted-foreground hover:text-foreground'
            }`}
        >
            {children}
        </button>
    );
}
