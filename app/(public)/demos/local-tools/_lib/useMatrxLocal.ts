'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
    DEFAULT_LOCAL_URL,
    DISCOVERY_TIMEOUT,
    HEALTH_POLL_INTERVAL,
    MATRX_LOCAL_PORT_RANGE,
    MATRX_LOCAL_PORT_START,
    STATUS_POLL_INTERVAL,
    WS_TIMEOUT_DEFAULT,
    WS_TIMEOUT_RESEARCH,
} from './constants';
import type {
    ActiveRequest,
    ConnectionInfo,
    ConnectionStatus,
    EngineSettings,
    HealthInfo,
    LogEntry,
    PortInfo,
    ToolResult,
    VersionInfo,
} from './types';

// ---------------------------------------------------------------------------
// Port discovery
// ---------------------------------------------------------------------------

export async function discoverMatrxLocal(): Promise<ConnectionInfo | null> {
    for (let offset = 0; offset < MATRX_LOCAL_PORT_RANGE; offset++) {
        const port = MATRX_LOCAL_PORT_START + offset;
        const url = `http://127.0.0.1:${port}`;
        try {
            const res = await fetch(`${url}/tools/list`, {
                signal: AbortSignal.timeout(DISCOVERY_TIMEOUT),
            });
            if (res.ok) {
                return { url, ws: `ws://127.0.0.1:${port}/ws`, port };
            }
        } catch {
            // Port not responding — try next
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseMatrxLocalReturn {
    baseUrl: string;
    setBaseUrl: (url: string) => void;
    status: ConnectionStatus;
    wsConnected: boolean;
    loading: string | null;
    logs: LogEntry[];
    discover: () => Promise<void>;
    connectWs: () => void;
    disconnectWs: () => void;
    cancelAll: () => void;
    cancelRequest: (id: string) => void;
    invokeTool: (tool: string, input: Record<string, unknown>, timeoutMs?: number) => Promise<ToolResult>;
    invokeViaRest: (tool: string, input: Record<string, unknown>, timeoutMs?: number) => Promise<ToolResult>;
    clearLogs: () => void;
    useWebSocket: boolean;
    setUseWebSocket: (v: boolean) => void;

    // Health / Version / Engine
    healthInfo: HealthInfo | null;
    versionInfo: VersionInfo | null;
    portInfo: PortInfo | null;

    // Active request tracking
    activeRequests: ActiveRequest[];

    // REST helpers for non-tool endpoints
    restGet: (path: string, headers?: Record<string, string>) => Promise<unknown>;
    restPost: (path: string, body?: unknown, headers?: Record<string, string>) => Promise<unknown>;
    restPut: (path: string, body?: unknown, headers?: Record<string, string>) => Promise<unknown>;
    restDelete: (path: string, headers?: Record<string, string>) => Promise<unknown>;
}

export function useMatrxLocal(): UseMatrxLocalReturn {
    const [baseUrl, setBaseUrl] = useState(DEFAULT_LOCAL_URL);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [wsConnected, setWsConnected] = useState(false);
    const [loading, setLoading] = useState<string | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [useWebSocket, setUseWebSocket] = useState(true);

    // Health / Version / Ports
    const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
    const [portInfo, setPortInfo] = useState<PortInfo | null>(null);

    // Active requests
    const [activeRequests, setActiveRequests] = useState<ActiveRequest[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const pendingCallbacks = useRef<Map<string, (result: ToolResult) => void>>(new Map());
    const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const healthPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const addLog = useCallback((direction: 'sent' | 'received', data: unknown, tool?: string) => {
        setLogs(prev => [
            ...prev,
            {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                timestamp: new Date(),
                direction,
                tool,
                data,
            },
        ]);
    }, []);

    const clearLogs = useCallback(() => setLogs([]), []);

    // ── Port discovery ──────────────────────────────────────────────────────

    const discover = useCallback(async () => {
        setStatus('discovering');
        const info = await discoverMatrxLocal();
        if (info) {
            setBaseUrl(info.url);
            setStatus('disconnected');
            addLog('received', { event: 'discovered', ...info });
        } else {
            setStatus('disconnected');
            addLog('received', { event: 'discovery_failed', message: 'Matrx Local not found on ports 22140-22159' });
        }
    }, [addLog]);

    // ── Status polling ──────────────────────────────────────────────────────

    const checkRestStatus = useCallback(async () => {
        try {
            const res = await fetch(`${baseUrl}/tools/list`, {
                signal: AbortSignal.timeout(2000),
            });
            if (res.ok && !wsConnected) {
                setStatus('connected');
            }
        } catch {
            if (!wsConnected) {
                setStatus('disconnected');
            }
        }
    }, [baseUrl, wsConnected]);

    useEffect(() => {
        checkRestStatus();
        statusPollRef.current = setInterval(checkRestStatus, STATUS_POLL_INTERVAL);
        return () => {
            if (statusPollRef.current) clearInterval(statusPollRef.current);
        };
    }, [checkRestStatus]);

    // ── Health / Version / Ports polling ─────────────────────────────────────

    const pollHealth = useCallback(async () => {
        try {
            const [healthRes, versionRes, portsRes] = await Promise.allSettled([
                fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(3000) }),
                fetch(`${baseUrl}/version`, { signal: AbortSignal.timeout(3000) }),
                fetch(`${baseUrl}/ports`, { signal: AbortSignal.timeout(3000) }),
            ]);
            if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
                setHealthInfo(await healthRes.value.json());
            } else {
                setHealthInfo(null);
            }
            if (versionRes.status === 'fulfilled' && versionRes.value.ok) {
                setVersionInfo(await versionRes.value.json());
            }
            if (portsRes.status === 'fulfilled' && portsRes.value.ok) {
                setPortInfo(await portsRes.value.json());
            }
        } catch {
            // Silently ignore — health data is optional
        }
    }, [baseUrl]);

    useEffect(() => {
        pollHealth();
        healthPollRef.current = setInterval(pollHealth, HEALTH_POLL_INTERVAL);
        return () => {
            if (healthPollRef.current) clearInterval(healthPollRef.current);
        };
    }, [pollHealth]);

    // ── WebSocket connection ────────────────────────────────────────────────

    const connectWs = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        setStatus('connecting');

        const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setWsConnected(true);
            setStatus('connected');
            addLog('received', { event: 'connected', url: wsUrl });
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as ToolResult & { id?: string };
                addLog('received', data, data.id ?? undefined);
                if (data.id && pendingCallbacks.current.has(data.id)) {
                    pendingCallbacks.current.get(data.id)!(data);
                    pendingCallbacks.current.delete(data.id);
                    // Remove from active requests
                    setActiveRequests(prev => prev.filter(r => r.id !== data.id));
                }
            } catch {
                addLog('received', event.data);
            }
        };

        ws.onclose = () => {
            setWsConnected(false);
            setStatus('disconnected');
            addLog('received', { event: 'disconnected' });
            pendingCallbacks.current.clear();
            setActiveRequests([]);
        };

        ws.onerror = () => {
            setWsConnected(false);
            setStatus('disconnected');
            addLog('received', { event: 'error' });
            pendingCallbacks.current.clear();
            setActiveRequests([]);
        };

        wsRef.current = ws;
    }, [baseUrl, addLog]);

    const disconnectWs = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
    }, []);

    useEffect(() => () => disconnectWs(), [disconnectWs]);

    // ── Cancel ──────────────────────────────────────────────────────────────

    const cancelAll = useCallback(() => {
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'cancel_all' }));
        }
        pendingCallbacks.current.clear();
        setActiveRequests([]);
        setLoading(null);
        addLog('sent', { action: 'cancel_all' });
    }, [addLog]);

    const cancelRequest = useCallback(
        (id: string) => {
            const ws = wsRef.current;
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ id, action: 'cancel' }));
            }
            pendingCallbacks.current.delete(id);
            setActiveRequests(prev => prev.filter(r => r.id !== id));
            addLog('sent', { id, action: 'cancel' });
        },
        [addLog],
    );

    // ── Tool execution ──────────────────────────────────────────────────────

    const invokeViaWs = useCallback(
        (tool: string, input: Record<string, unknown>, timeoutMs = WS_TIMEOUT_DEFAULT): Promise<ToolResult> => {
            return new Promise((resolve, reject) => {
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                    reject(new Error('WebSocket not connected'));
                    return;
                }
                const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                const msg = { id: reqId, tool, input };
                addLog('sent', msg, tool);

                // Track active request
                setActiveRequests(prev => [...prev, { id: reqId, tool, startedAt: new Date() }]);

                pendingCallbacks.current.set(reqId, resolve);
                wsRef.current.send(JSON.stringify(msg));

                const timer = setTimeout(() => {
                    if (pendingCallbacks.current.has(reqId)) {
                        pendingCallbacks.current.delete(reqId);
                        setActiveRequests(prev => prev.filter(r => r.id !== reqId));
                        reject(new Error(`Timeout (${timeoutMs / 1000}s)`));
                    }
                }, timeoutMs);

                // Clear timer on early resolution
                pendingCallbacks.current.set(reqId, (result) => {
                    clearTimeout(timer);
                    resolve(result);
                });
            });
        },
        [addLog],
    );

    const invokeViaRest = useCallback(
        async (tool: string, input: Record<string, unknown>, timeoutMs = WS_TIMEOUT_DEFAULT): Promise<ToolResult> => {
            const url = `${baseUrl}/tools/invoke`;
            const body = { tool, input };
            addLog('sent', body, tool);

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);

            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
                const data = (await res.json()) as ToolResult;
                addLog('received', data, tool);
                return data;
            } finally {
                clearTimeout(timer);
            }
        },
        [baseUrl, addLog],
    );

    const invokeTool = useCallback(
        async (tool: string, input: Record<string, unknown>, timeoutMs?: number): Promise<ToolResult> => {
            const effectiveTimeout = timeoutMs ?? (tool === 'Research' ? WS_TIMEOUT_RESEARCH : WS_TIMEOUT_DEFAULT);
            const key = `${tool}-${Date.now()}`;
            setLoading(key);

            try {
                const result =
                    useWebSocket && wsConnected
                        ? await invokeViaWs(tool, input, effectiveTimeout)
                        : await invokeViaRest(tool, input, effectiveTimeout);
                return result;
            } catch (err) {
                const error = err instanceof Error ? err.message : 'Unknown error';
                return { type: 'error', output: error };
            } finally {
                setLoading(null);
            }
        },
        [useWebSocket, wsConnected, invokeViaWs, invokeViaRest],
    );

    // ── Generic REST helpers (for non-tool endpoints) ───────────────────────

    const restGet = useCallback(
        async (path: string, headers?: Record<string, string>): Promise<unknown> => {
            const res = await fetch(`${baseUrl}${path}`, {
                signal: AbortSignal.timeout(10_000),
                headers,
            });
            if (!res.ok) {
                const body = await res.text().catch(() => '');
                throw new Error(`GET ${path} failed (${res.status}): ${body || res.statusText}`);
            }
            return res.json();
        },
        [baseUrl],
    );

    const restPost = useCallback(
        async (path: string, body?: unknown, headers?: Record<string, string>): Promise<unknown> => {
            const res = await fetch(`${baseUrl}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: body ? JSON.stringify(body) : undefined,
                signal: AbortSignal.timeout(30_000),
            });
            if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                throw new Error(`POST ${path} failed (${res.status}): ${errBody || res.statusText}`);
            }
            return res.json();
        },
        [baseUrl],
    );

    const restPut = useCallback(
        async (path: string, body?: unknown, headers?: Record<string, string>): Promise<unknown> => {
            const res = await fetch(`${baseUrl}${path}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: body ? JSON.stringify(body) : undefined,
                signal: AbortSignal.timeout(10_000),
            });
            if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                throw new Error(`PUT ${path} failed (${res.status}): ${errBody || res.statusText}`);
            }
            return res.json();
        },
        [baseUrl],
    );

    const restDelete = useCallback(
        async (path: string, headers?: Record<string, string>): Promise<unknown> => {
            const res = await fetch(`${baseUrl}${path}`, {
                method: 'DELETE',
                headers,
                signal: AbortSignal.timeout(10_000),
            });
            if (res.status === 204) return { ok: true };
            if (!res.ok) {
                const errBody = await res.text().catch(() => '');
                throw new Error(`DELETE ${path} failed (${res.status}): ${errBody || res.statusText}`);
            }
            return res.json();
        },
        [baseUrl],
    );

    return {
        baseUrl,
        setBaseUrl,
        status,
        wsConnected,
        loading,
        logs,
        discover,
        connectWs,
        disconnectWs,
        cancelAll,
        cancelRequest,
        invokeTool,
        invokeViaRest,
        clearLogs,
        useWebSocket,
        setUseWebSocket,
        healthInfo,
        versionInfo,
        portInfo,
        activeRequests,
        restGet,
        restPost,
        restPut,
        restDelete,
    };
}
