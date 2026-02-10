'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    Loader2,
    Terminal,
    FileText,
    FolderTree,
    Search,
    Monitor,
    Wifi,
    WifiOff,
    Send,
    Trash2,
    ChevronDown,
    XCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolResult {
    id?: string;
    type: 'success' | 'error';
    output: string;
    image?: { media_type: string; base64_data: string };
    metadata?: Record<string, unknown>;
}

interface LogEntry {
    id: string;
    timestamp: Date;
    direction: 'sent' | 'received';
    tool?: string;
    data: unknown;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_LOCAL_URL = 'http://localhost:8000';

const PRESET_TOOLS: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tool: string;
    input: Record<string, unknown>;
    description: string;
}[] = [
    {
        label: 'System Info',
        icon: Monitor,
        tool: 'SystemInfo',
        input: {},
        description: 'Get platform, hostname, Python version',
    },
    {
        label: 'List Home',
        icon: FolderTree,
        tool: 'ListDirectory',
        input: { show_hidden: false },
        description: 'List home directory contents',
    },
    {
        label: 'Run ls -la',
        icon: Terminal,
        tool: 'Bash',
        input: { command: 'ls -la', timeout: 10000 },
        description: 'Execute ls -la in current directory',
    },
    {
        label: 'Find .py files',
        icon: Search,
        tool: 'Glob',
        input: { pattern: '*.py', path: '.' },
        description: 'Glob for Python files in cwd',
    },
    {
        label: 'Read pyproject.toml',
        icon: FileText,
        tool: 'Read',
        input: { file_path: 'pyproject.toml', limit: 20 },
        description: 'Read first 20 lines of pyproject.toml',
    },
    {
        label: 'Grep FastAPI',
        icon: Search,
        tool: 'Grep',
        input: { pattern: 'FastAPI', path: '.', include: '*.py', max_results: 20 },
        description: 'Search for "FastAPI" in .py files',
    },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LocalToolsDemo() {
    const [baseUrl, setBaseUrl] = useState(DEFAULT_LOCAL_URL);
    const [wsConnected, setWsConnected] = useState(false);
    const [wsConnecting, setWsConnecting] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activeResult, setActiveResult] = useState<ToolResult | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const [customTool, setCustomTool] = useState('Bash');
    const [customInput, setCustomInput] = useState('{"command": "echo hello"}');
    const [useWebSocket, setUseWebSocket] = useState(true);

    const wsRef = useRef<WebSocket | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);
    const pendingCallbacks = useRef<Map<string, (result: ToolResult) => void>>(new Map());

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

    // ── WebSocket connection ──────────────────────────────────────────────

    const connectWs = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        setWsConnecting(true);

        const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setWsConnected(true);
            setWsConnecting(false);
            addLog('received', { event: 'connected', url: wsUrl });
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as ToolResult;
                addLog('received', data, data.id ?? undefined);

                // Route response to the correct pending callback by id
                if (data.id && pendingCallbacks.current.has(data.id)) {
                    pendingCallbacks.current.get(data.id)!(data);
                    pendingCallbacks.current.delete(data.id);
                }

                setActiveResult(data);
            } catch {
                addLog('received', event.data);
            }
        };

        ws.onclose = () => {
            setWsConnected(false);
            setWsConnecting(false);
            addLog('received', { event: 'disconnected' });
            // Reject all pending
            pendingCallbacks.current.clear();
        };

        ws.onerror = () => {
            setWsConnected(false);
            setWsConnecting(false);
            addLog('received', { event: 'error' });
            pendingCallbacks.current.clear();
        };

        wsRef.current = ws;
    }, [baseUrl, addLog]);

    const disconnectWs = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
    }, []);

    useEffect(() => () => disconnectWs(), [disconnectWs]);

    // ── Cancel ────────────────────────────────────────────────────────────

    const cancelAll = useCallback(() => {
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'cancel_all' }));
        }
        pendingCallbacks.current.clear();
        setLoading(null);
        addLog('sent', { action: 'cancel_all' });
    }, [addLog]);

    // ── Tool execution ────────────────────────────────────────────────────

    const invokeViaWs = useCallback(
        (tool: string, input: Record<string, unknown>): Promise<ToolResult> => {
            return new Promise((resolve, reject) => {
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
                    reject(new Error('WebSocket not connected'));
                    return;
                }
                const reqId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                const msg = { id: reqId, tool, input };
                addLog('sent', msg, tool);

                pendingCallbacks.current.set(reqId, resolve);
                wsRef.current.send(JSON.stringify(msg));

                setTimeout(() => {
                    if (pendingCallbacks.current.has(reqId)) {
                        pendingCallbacks.current.delete(reqId);
                        reject(new Error('Timeout (30s)'));
                    }
                }, 30_000);
            });
        },
        [addLog],
    );

    const invokeViaRest = useCallback(
        async (tool: string, input: Record<string, unknown>): Promise<ToolResult> => {
            const url = `${baseUrl}/tools/invoke`;
            const body = { tool, input };
            addLog('sent', body, tool);

            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 30_000);

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
        async (tool: string, input: Record<string, unknown>) => {
            const key = `${tool}-${Date.now()}`;
            setLoading(key);
            setActiveResult(null);

            try {
                const result =
                    useWebSocket && wsConnected
                        ? await invokeViaWs(tool, input)
                        : await invokeViaRest(tool, input);
                setActiveResult(result);
            } catch (err) {
                const error = err instanceof Error ? err.message : 'Unknown error';
                setActiveResult({ type: 'error', output: error });
            } finally {
                setLoading(null);
            }
        },
        [useWebSocket, wsConnected, invokeViaWs, invokeViaRest],
    );

    // ── Scroll log to bottom ──────────────────────────────────────────────

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-background">
            <div className="flex-1 overflow-y-auto p-4 pb-24">
                <div className="max-w-6xl mx-auto space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Terminal className="w-5 h-5" />
                                Matrx Local Tools
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Test two-way communication with your local machine
                            </p>
                        </div>
                        <Link href="/demos/local-tools/terminal">
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <Terminal className="w-4 h-4" />
                                Open Terminal
                            </Button>
                        </Link>
                    </div>

                    {/* Connection Config */}
                    <div className="border rounded-lg p-3 space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* URL */}
                            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
                                <span className="text-xs font-semibold shrink-0">URL:</span>
                                <input
                                    type="text"
                                    value={baseUrl}
                                    onChange={(e) => setBaseUrl(e.target.value)}
                                    className="h-7 text-xs font-mono flex-1 rounded border px-2 bg-background"
                                />
                            </div>

                            {/* Transport toggle */}
                            <div className="flex items-center gap-1.5">
                                <Button
                                    size="sm"
                                    variant={useWebSocket ? 'default' : 'outline'}
                                    onClick={() => setUseWebSocket(true)}
                                    className="h-7 text-xs px-2"
                                >
                                    WebSocket
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

                            {/* WS connect / disconnect */}
                            {useWebSocket && (
                                <div className="flex items-center gap-2">
                                    {wsConnected ? (
                                        <>
                                            <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                                                <Wifi className="w-3 h-3" /> Connected
                                            </Badge>
                                            <Button size="sm" variant="outline" onClick={disconnectWs} className="h-7 text-xs px-2">
                                                Disconnect
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Badge variant="outline" className="gap-1 text-muted-foreground">
                                                <WifiOff className="w-3 h-3" /> Disconnected
                                            </Badge>
                                            <Button
                                                size="sm"
                                                onClick={connectWs}
                                                disabled={wsConnecting}
                                                className="h-7 text-xs px-2"
                                            >
                                                {wsConnecting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                                Connect
                                            </Button>
                                        </>
                                    )}

                                    {/* Cancel all */}
                                    {wsConnected && loading && (
                                        <Button size="sm" variant="destructive" onClick={cancelAll} className="h-7 text-xs px-2 gap-1">
                                            <XCircle className="w-3 h-3" /> Cancel
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick-fire presets */}
                    <div className="border rounded-lg p-3">
                        <h2 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                            Quick Tools
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                            {PRESET_TOOLS.map((preset) => {
                                const Icon = preset.icon;
                                return (
                                    <Button
                                        key={preset.tool + preset.label}
                                        variant="outline"
                                        size="sm"
                                        className="h-auto py-2 flex flex-col items-center gap-1 text-xs"
                                        disabled={!!loading || (useWebSocket && !wsConnected)}
                                        onClick={() => invokeTool(preset.tool, preset.input)}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {preset.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Custom tool invocation */}
                    <div className="border rounded-lg p-3 space-y-2">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Custom Tool Call
                        </h2>
                        <div className="flex gap-2">
                            <div className="flex flex-col gap-1 w-40">
                                <label className="text-xs text-muted-foreground">Tool Name</label>
                                <input
                                    type="text"
                                    value={customTool}
                                    onChange={(e) => setCustomTool(e.target.value)}
                                    className="h-8 text-xs font-mono rounded border px-2 bg-background"
                                    placeholder="e.g. Bash"
                                />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-xs text-muted-foreground">Input (JSON)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customInput}
                                        onChange={(e) => setCustomInput(e.target.value)}
                                        className="h-8 text-xs font-mono rounded border px-2 bg-background flex-1"
                                        placeholder='{"command": "echo hello"}'
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                try {
                                                    invokeTool(customTool, JSON.parse(customInput));
                                                } catch {
                                                    setActiveResult({ type: 'error', output: 'Invalid JSON input' });
                                                }
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        className="h-8 px-3"
                                        disabled={!!loading || (useWebSocket && !wsConnected)}
                                        onClick={() => {
                                            try {
                                                invokeTool(customTool, JSON.parse(customInput));
                                            } catch {
                                                setActiveResult({ type: 'error', output: 'Invalid JSON input' });
                                            }
                                        }}
                                    >
                                        <Send className="w-3 h-3 mr-1" />
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main content area — result + log side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Result panel */}
                        <div className="border rounded-lg flex flex-col overflow-hidden">
                            <div className="px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
                                <h2 className="text-xs font-semibold flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5" />
                                    Result
                                </h2>
                                {activeResult && (
                                    <Badge
                                        variant={activeResult.type === 'success' ? 'outline' : 'destructive'}
                                        className="text-[10px] h-5"
                                    >
                                        {activeResult.type}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex-1 min-h-0 max-h-[400px] overflow-y-auto">
                                {loading && (
                                    <div className="flex items-center justify-center p-6">
                                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                    </div>
                                )}

                                {!loading && activeResult && (
                                    <div className="p-3 space-y-3">
                                        <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-muted/30 rounded p-2">
                                            {activeResult.output}
                                        </pre>

                                        {activeResult.image && (
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1">Image:</p>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={`data:${activeResult.image.media_type};base64,${activeResult.image.base64_data}`}
                                                    alt="Tool result"
                                                    className="max-w-full rounded border"
                                                />
                                            </div>
                                        )}

                                        {activeResult.metadata && (
                                            <details className="text-xs">
                                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-1">
                                                    <ChevronDown className="w-3 h-3" />
                                                    Metadata
                                                </summary>
                                                <pre className="mt-1 p-2 bg-muted rounded font-mono text-[10px] overflow-auto max-h-32">
                                                    {JSON.stringify(activeResult.metadata, null, 2)}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                )}

                                {!loading && !activeResult && (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                        Run a tool to see results here
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Communication log */}
                        <div className="border rounded-lg flex flex-col overflow-hidden">
                            <div className="px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
                                <h2 className="text-xs font-semibold">Message Log</h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-1.5"
                                    onClick={() => setLogs([])}
                                >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    Clear
                                </Button>
                            </div>
                            <div className="flex-1 min-h-0 max-h-[400px] overflow-y-auto font-mono text-[11px]">
                                {logs.length === 0 && (
                                    <div className="p-6 text-center text-sm text-muted-foreground font-sans">
                                        Messages will appear here
                                    </div>
                                )}
                                {logs.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className={`px-3 py-1.5 border-b border-border/50 ${
                                            entry.direction === 'sent' ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] h-4 px-1 ${
                                                    entry.direction === 'sent'
                                                        ? 'text-blue-600 border-blue-300'
                                                        : 'text-green-600 border-green-300'
                                                }`}
                                            >
                                                {entry.direction === 'sent' ? 'SEND' : 'RECV'}
                                            </Badge>
                                            {entry.tool && (
                                                <span className="text-muted-foreground">{entry.tool}</span>
                                            )}
                                            <span className="text-muted-foreground/50 ml-auto">
                                                {entry.timestamp.toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <pre className="whitespace-pre-wrap break-all text-[10px] max-h-24 overflow-y-auto">
                                            {typeof entry.data === 'string'
                                                ? entry.data
                                                : JSON.stringify(entry.data, null, 2)}
                                        </pre>
                                    </div>
                                ))}
                                <div ref={logEndRef} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
