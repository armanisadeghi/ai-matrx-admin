'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, ChevronDown, Loader2, RefreshCw, Wifi, WifiOff, XCircle, Zap } from 'lucide-react';
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

    const [showActiveReqs, setShowActiveReqs] = useState(false);

    const statusBadge = () => {
        if (status === 'discovering') {
            return (
                <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> Discovering…
                </Badge>
            );
        }
        if (wsConnected) {
            return (
                <Badge variant="outline" className="gap-1 text-green-600 border-green-500">
                    <Wifi className="w-3 h-3" /> WS Connected
                </Badge>
            );
        }
        if (status === 'connected') {
            return (
                <Badge variant="outline" className="gap-1 text-blue-600 border-blue-500">
                    <Zap className="w-3 h-3" /> REST Online
                </Badge>
            );
        }
        if (status === 'connecting') {
            return (
                <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> Connecting…
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
                <WifiOff className="w-3 h-3" /> Offline
            </Badge>
        );
    };

    return (
        <div className="border rounded-lg p-3 bg-card space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                {/* URL */}
                <span className="text-xs font-semibold shrink-0">URL:</span>
                <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    className="h-7 text-xs font-mono flex-1 min-w-[200px] rounded border px-2 bg-background"
                />

                {/* Auto-discover */}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={discover}
                    disabled={status === 'discovering'}
                    className="h-7 text-xs px-2 gap-1"
                >
                    {status === 'discovering' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                        <RefreshCw className="w-3 h-3" />
                    )}
                    Auto-Detect
                </Button>

                {/* Status */}
                {statusBadge()}

                {/* Health badge */}
                {healthInfo && (
                    <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500 text-[10px]">
                        <Activity className="w-2.5 h-2.5" />
                        {healthInfo.status === 'ok' || healthInfo.status === 'healthy' ? 'Healthy' : healthInfo.status}
                    </Badge>
                )}

                {/* Version badge */}
                {(versionInfo?.version || healthInfo?.version) && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                        v{versionInfo?.version || healthInfo?.version}
                    </Badge>
                )}

                {/* Active requests badge */}
                {activeRequests.length > 0 && (
                    <div className="relative">
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2 gap-1 text-orange-600 border-orange-400"
                            onClick={() => setShowActiveReqs(!showActiveReqs)}
                        >
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            {activeRequests.length} in-flight
                            <ChevronDown className="w-2.5 h-2.5" />
                        </Button>

                        {showActiveReqs && (
                            <div className="absolute top-full mt-1 right-0 z-50 bg-popover border rounded-md shadow-lg p-1 min-w-[200px]">
                                {activeRequests.map((req) => (
                                    <div
                                        key={req.id}
                                        className="flex items-center justify-between gap-2 px-2 py-1 text-xs rounded hover:bg-accent"
                                    >
                                        <span className="font-mono truncate flex-1">{req.tool}</span>
                                        <span className="text-muted-foreground text-[10px] shrink-0">
                                            {Math.round((Date.now() - req.startedAt.getTime()) / 1000)}s
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                            onClick={() => cancelRequest(req.id)}
                                        >
                                            <XCircle className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                                <div className="border-t mt-1 pt-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full h-6 text-[10px] text-destructive"
                                        onClick={() => {
                                            cancelAll();
                                            setShowActiveReqs(false);
                                        }}
                                    >
                                        Cancel All
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Transport toggle */}
                {showTransportToggle && (
                    <div className="flex items-center gap-1 ml-auto">
                        <Button
                            size="sm"
                            variant={useWebSocket ? 'default' : 'outline'}
                            onClick={() => setUseWebSocket(true)}
                            className="h-7 text-xs px-2"
                        >
                            WS
                        </Button>
                        <Button
                            size="sm"
                            variant={!useWebSocket ? 'default' : 'outline'}
                            onClick={() => setUseWebSocket(false)}
                            className="h-7 text-xs px-2"
                        >
                            REST
                        </Button>
                    </div>
                )}

                {/* WS connect / disconnect */}
                {useWebSocket && (
                    <div className="flex items-center gap-1.5">
                        {wsConnected ? (
                            <Button size="sm" variant="outline" onClick={disconnectWs} className="h-7 text-xs px-2">
                                Disconnect
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                onClick={connectWs}
                                disabled={status === 'connecting'}
                                className="h-7 text-xs px-2"
                            >
                                {status === 'connecting' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                Connect WS
                            </Button>
                        )}
                        {wsConnected && loading && (
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={cancelAll}
                                className="h-7 text-xs px-2 gap-1"
                            >
                                <XCircle className="w-3 h-3" /> Cancel
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
