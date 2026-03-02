'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
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
// Auth helpers
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}

async function buildAuthHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
    const token = await getAuthToken();
    const headers: Record<string, string> = { ...extra };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

// Browser WebSocket API does not support custom headers.
// Pass the token as a query param — the engine middleware accepts both.
async function buildWsUrl(httpUrl: string): Promise<string> {
    const token = await getAuthToken();
    const wsBase = httpUrl.replace(/^http/, 'ws') + '/ws';
    if (!token) return wsBase;
    return `${wsBase}?token=${encodeURIComponent(token)}`;
}

// ---------------------------------------------------------------------------
// Fix #4: Authenticated fetch with automatic 401 → session refresh → retry
// ---------------------------------------------------------------------------

async function authenticatedFetch(url: string, opts: RequestInit): Promise<Response> {
    const res = await fetch(url, opts);
    if (res.status === 401) {
        const { data } = await supabase.auth.refreshSession();
        if (data.session) {
            const retryOpts: RequestInit = {
                ...opts,
                headers: {
                    ...(opts.headers as Record<string, string>),
                    Authorization: `Bearer ${data.session.access_token}`,
                },
            };
            return fetch(url, retryOpts);
        }
    }
    return res;
}

// ---------------------------------------------------------------------------
// Fix #3: Port discovery — probe /health (lighter weight than /tools/list)
// Fix #7: Capture version from /health response at discovery time
// ---------------------------------------------------------------------------

export interface DiscoveryResult extends ConnectionInfo {
    availableTools: string[];
    version: string | null;
}

export async function discoverMatrxLocal(): Promise<DiscoveryResult | null> {
    for (let offset = 0; offset < MATRX_LOCAL_PORT_RANGE; offset++) {
        const port = MATRX_LOCAL_PORT_START + offset;
        const url = `http://127.0.0.1:${port}`;
        try {
            // Fix #3: probe /health instead of /tools/list
            const healthRes = await fetch(`${url}/health`, {
                signal: AbortSignal.timeout(DISCOVERY_TIMEOUT),
            });
            if (!healthRes.ok) continue;

            const healthData = await healthRes.json().catch(() => ({})) as HealthInfo;

            // Fix #1: fetch actual tool list from server
            const authHeaders = await buildAuthHeaders();
            const toolsRes = await authenticatedFetch(`${url}/tools/list`, {
                headers: authHeaders,
                signal: AbortSignal.timeout(2000),
            });
            const availableTools: string[] = toolsRes.ok
                ? ((await toolsRes.json().catch(() => ({}))) as { tools?: string[] }).tools ?? []
                : [];

            return {
                url,
                ws: `ws://127.0.0.1:${port}/ws`,
                port,
                availableTools,
                // Fix #7: capture version at discovery time instead of polling it every 15s
                version: healthData.version ?? null,
            };
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
    connectWs: () => Promise<void>;
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

    // Fix #1: live tool list from server
    availableTools: string[];

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

    // Fix #1: server-reported available tools
    const [availableTools, setAvailableTools] = useState<string[]>([]);

    // Active requests
    const [activeRequests, setActiveRequests] = useState<ActiveRequest[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const pendingCallbacks = useRef<Map<string, (result: ToolResult) => void>>(new Map());
    const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const healthPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Enhancement: WS auto-reconnect backoff state
    const wsRetryCountRef = useRef(0);
    const wsRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const wsAutoReconnect = useRef(true);

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
        const result = await discoverMatrxLocal();
        if (result) {
            setBaseUrl(result.url);
            setStatus('disconnected');
            // Fix #1: populate available tools from server
            if (result.availableTools.length > 0) {
                setAvailableTools(result.availableTools);
            }
            // Fix #7: set version from discovery, skip separate /version polling
            if (result.version) {
                setVersionInfo({ version: result.version });
            }
            addLog('received', { event: 'discovered', ...result });
        } else {
            setStatus('disconnected');
            addLog('received', { event: 'discovery_failed', message: 'Matrx Local not found on ports 22140–22159' });
        }
    }, [addLog]);

    // ── Status polling ──────────────────────────────────────────────────────

    const checkRestStatus = useCallback(async () => {
        try {
            // Fix #3: poll /health (already public) instead of /tools/list
            const res = await fetch(`${baseUrl}/health`, {
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

    // ── Health / Ports polling ────────────────────────────────────────────
    // Fix #2: /health and /ports are public — no auth headers needed
    // Fix #7: /version no longer polled — fetched once at discovery

    const pollHealth = useCallback(async () => {
        try {
            const [healthRes, portsRes] = await Promise.allSettled([
                fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(3000) }),
                fetch(`${baseUrl}/ports`, { signal: AbortSignal.timeout(3000) }),
            ]);
            if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
                setHealthInfo(await healthRes.value.json());
            } else {
                setHealthInfo(null);
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

    const connectWs = useCallback(async () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        setStatus('connecting');

        const wsUrl = await buildWsUrl(baseUrl);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setWsConnected(true);
            setStatus('connected');
            wsRetryCountRef.current = 0; // Reset backoff on successful connect
            addLog('received', { event: 'connected', url: wsUrl });
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as ToolResult & { id?: string };
                addLog('received', data, data.id ?? undefined);
                if (data.id && pendingCallbacks.current.has(data.id)) {
                    pendingCallbacks.current.get(data.id)!(data);
                    pendingCallbacks.current.delete(data.id);
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

            // Enhancement: auto-reconnect with exponential backoff (max 30s)
            if (wsAutoReconnect.current) {
                const delay = Math.min(2000 * Math.pow(2, wsRetryCountRef.current), 30_000);
                wsRetryCountRef.current += 1;
                addLog('received', { event: 'reconnect_scheduled', delay_ms: delay });
                wsRetryTimerRef.current = setTimeout(() => connectWs(), delay);
            }
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
        // Disable auto-reconnect when the user explicitly disconnects
        wsAutoReconnect.current = false;
        if (wsRetryTimerRef.current) {
            clearTimeout(wsRetryTimerRef.current);
            wsRetryTimerRef.current = null;
        }
        wsRef.current?.close();
        wsRef.current = null;
    }, []);

    // Re-enable auto-reconnect whenever connectWs is called manually
    const connectWsWithReconnect = useCallback(async () => {
        wsAutoReconnect.current = true;
        wsRetryCountRef.current = 0;
        await connectWs();
    }, [connectWs]);

    useEffect(() => () => {
        wsAutoReconnect.current = false;
        if (wsRetryTimerRef.current) clearTimeout(wsRetryTimerRef.current);
        disconnectWs();
    }, [disconnectWs]);

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
                const headers = await buildAuthHeaders({ 'Content-Type': 'application/json' });
                const res = await authenticatedFetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });

                // Fix #5: check status before parsing as ToolResult
                if (!res.ok) {
                    const errText = await res.text().catch(() => '');
                    const result: ToolResult = {
                        type: 'error',
                        output: `HTTP ${res.status}: ${errText || res.statusText}`,
                    };
                    addLog('received', result, tool);
                    return result;
                }

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
            const authHeaders = await buildAuthHeaders(headers);
            const res = await authenticatedFetch(`${baseUrl}${path}`, {
                signal: AbortSignal.timeout(10_000),
                headers: authHeaders,
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
            const authHeaders = await buildAuthHeaders({ 'Content-Type': 'application/json', ...headers });
            const res = await authenticatedFetch(`${baseUrl}${path}`, {
                method: 'POST',
                headers: authHeaders,
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
            const authHeaders = await buildAuthHeaders({ 'Content-Type': 'application/json', ...headers });
            const res = await authenticatedFetch(`${baseUrl}${path}`, {
                method: 'PUT',
                headers: authHeaders,
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
            const authHeaders = await buildAuthHeaders(headers);
            const res = await authenticatedFetch(`${baseUrl}${path}`, {
                method: 'DELETE',
                headers: authHeaders,
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
        connectWs: connectWsWithReconnect,
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
        availableTools,
        activeRequests,
        restGet,
        restPost,
        restPut,
        restDelete,
    };
}
