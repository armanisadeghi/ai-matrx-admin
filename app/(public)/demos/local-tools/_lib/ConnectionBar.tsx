'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Loader2, RefreshCw, Wifi, WifiOff, XCircle, Zap } from 'lucide-react';
import { useState } from 'react';
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
        connectWs,
        disconnectWs,
        cancelAll,
        cancelRequest,
        useWebSocket,
        setUseWebSocket,
        healthInfo,
        versionInfo,
        activeRequests,
    } = hook;

    const [showRequests, setShowRequests] = useState(false);

    const isDiscovering = status === 'discovering';
    const isConnectingWs = status === 'connecting';

    // REST is "up" when the engine responds on the REST polling endpoint
    const restOnline = status === 'connected' || wsConnected;
    // WS connection state
    const wsOnline = wsConnected;

    return (
        <div className="border rounded-lg bg-card">
            {/* Main row */}
            <div className="flex items-center gap-3 p-3">
                {/* URL input */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground font-medium shrink-0">Engine URL</span>
                    <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        className="h-8 text-xs font-mono flex-1 min-w-0 rounded border px-2.5 bg-background"
                    />
                </div>

                {/* Recheck button */}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={discover}
                    disabled={isDiscovering}
                    className="h-8 px-3 gap-1.5 shrink-0"
                    title="Scan ports 22140–22159 for the engine"
                >
                    {isDiscovering ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    <span className="text-xs">{isDiscovering ? 'Scanning…' : 'Recheck'}</span>
                </Button>

                <div className="w-px h-6 bg-border shrink-0" />

                {/* REST status pill */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">REST</span>
                    {isDiscovering ? (
                        <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-500 h-6">
                            <Loader2 className="w-3 h-3 animate-spin" /> Checking
                        </Badge>
                    ) : restOnline ? (
                        <Badge variant="outline" className="gap-1 text-green-600 border-green-500 h-6">
                            <Zap className="w-3 h-3" /> Online
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="gap-1 text-muted-foreground h-6">
                            <WifiOff className="w-3 h-3" /> Offline
                        </Badge>
                    )}
                </div>

                {/* WS status pill + connect/disconnect */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">WS</span>
                    {isConnectingWs ? (
                        <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-500 h-6">
                            <Loader2 className="w-3 h-3 animate-spin" /> Connecting
                        </Badge>
                    ) : wsOnline ? (
                        <Badge variant="outline" className="gap-1 text-green-600 border-green-500 h-6">
                            <Wifi className="w-3 h-3" /> Connected
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="gap-1 text-muted-foreground h-6">
                            <WifiOff className="w-3 h-3" /> Disconnected
                        </Badge>
                    )}
                    {wsOnline ? (
                        <Button size="sm" variant="ghost" onClick={disconnectWs} className="h-7 px-2 text-xs text-muted-foreground">
                            Disconnect
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={connectWs}
                            disabled={isConnectingWs}
                            className="h-7 px-2 text-xs"
                        >
                            Connect
                        </Button>
                    )}
                </div>

                <div className="w-px h-6 bg-border shrink-0" />

                {/* Transport toggle */}
                {showTransportToggle && (
                    <div className="flex items-center gap-1 shrink-0 bg-muted rounded-md p-0.5">
                        <button
                            onClick={() => setUseWebSocket(true)}
                            className={`h-6 px-2.5 text-xs rounded transition-colors ${
                                useWebSocket
                                    ? 'bg-background text-foreground shadow-sm font-medium'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            WS
                        </button>
                        <button
                            onClick={() => setUseWebSocket(false)}
                            className={`h-6 px-2.5 text-xs rounded transition-colors ${
                                !useWebSocket
                                    ? 'bg-background text-foreground shadow-sm font-medium'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            REST
                        </button>
                    </div>
                )}

                {/* Active requests indicator */}
                {activeRequests.length > 0 && (
                    <div className="relative shrink-0">
                        <button
                            onClick={() => setShowRequests(!showRequests)}
                            className="flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-md bg-orange-50 dark:bg-orange-950/30 text-orange-600 border border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors"
                        >
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {activeRequests.length} running
                        </button>

                        {showRequests && (
                            <div className="absolute top-full mt-1.5 right-0 z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[220px]">
                                {activeRequests.map((req) => (
                                    <div
                                        key={req.id}
                                        className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-accent"
                                    >
                                        <span className="font-mono font-medium truncate flex-1">{req.tool}</span>
                                        <span className="text-muted-foreground shrink-0">
                                            {Math.round((Date.now() - req.startedAt.getTime()) / 1000)}s
                                        </span>
                                        <button
                                            onClick={() => cancelRequest(req.id)}
                                            className="text-destructive hover:text-destructive/80 shrink-0"
                                        >
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

                {/* Cancel button when loading */}
                {loading && (
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={cancelAll}
                        className="h-7 px-2.5 gap-1 text-xs shrink-0"
                    >
                        <XCircle className="w-3 h-3" /> Cancel
                    </Button>
                )}
            </div>

            {/* Info strip: health + version */}
            {(healthInfo || versionInfo || hook.availableTools.length > 0) && (
                <div className="flex items-center gap-3 px-3 pb-2 text-[11px] text-muted-foreground border-t pt-2">
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
                    {hook.availableTools.length > 0 && (
                        <span>{hook.availableTools.length} tools available</span>
                    )}
                    <span className="ml-auto">
                        Using <span className="font-medium text-foreground">{useWebSocket ? 'WebSocket' : 'REST'}</span> for tool calls
                    </span>
                </div>
            )}
        </div>
    );
}
