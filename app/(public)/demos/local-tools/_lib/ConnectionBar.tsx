'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Wifi, WifiOff, XCircle, Zap } from 'lucide-react';
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
        useWebSocket,
        setUseWebSocket,
    } = hook;

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
