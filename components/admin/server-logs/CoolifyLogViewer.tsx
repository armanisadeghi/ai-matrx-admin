'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Loader2, AlertCircle, Terminal, Play, Square, ChevronDown } from 'lucide-react';

const APPS = [
    { key: 'ai-dream-server',     label: 'AI Dream Server (prod)',  env: 'production' },
    { key: 'ai-dream-server-dev', label: 'AI Dream Server (dev)',   env: 'development' },
    { key: 'scraper-service',     label: 'Scraper Service (prod)',  env: 'production' },
    { key: 'scraper-service-dev', label: 'Scraper Service (dev)',   env: 'development' },
    { key: 'matrx-ai',            label: 'Matrx AI (prod)',         env: 'production' },
    { key: 'matrx-ai-dev',        label: 'Matrx AI (dev)',          env: 'development' },
] as const;

const LINE_OPTIONS = [50, 100, 200, 500, 1000];
const POLL_INTERVALS = [
    { value: 0,     label: 'Manual only' },
    { value: 5000,  label: 'Every 5s' },
    { value: 10000, label: 'Every 10s' },
    { value: 30000, label: 'Every 30s' },
    { value: 60000, label: 'Every 60s' },
];

type LogResponse = {
    app: string;
    uuid: string;
    lines: number;
    logs: string;
    fetched_at: string;
    error?: string;
};

function colorize(line: string): string {
    if (/\[ERROR\]|\bERROR\b|Traceback|Exception:/.test(line)) return 'text-red-400';
    if (/\[WARNING\]|\bWARN\b/.test(line))  return 'text-yellow-400';
    if (/\[INFO\]|\bINFO\b/.test(line))     return 'text-blue-300';
    if (/\[DEBUG\]|\bDEBUG\b/.test(line))   return 'text-gray-500';
    if (/^\d{4}-\d{2}-\d{2}/.test(line))   return 'text-gray-300';
    return 'text-gray-400';
}

export default function CoolifyLogViewer() {
    const [selectedApp, setSelectedApp] = useState<string>('ai-dream-server');
    const [lineCount, setLineCount] = useState<number>(200);
    const [pollInterval, setPollInterval] = useState<number>(0);
    const [logs, setLogs] = useState<string>('');
    const [fetchedAt, setFetchedAt] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    const logRef = useRef<HTMLPreElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                `/api/admin/coolify-logs?app=${selectedApp}&lines=${lineCount}`,
                { cache: 'no-store' }
            );
            const data: LogResponse = await res.json();
            if (!res.ok) {
                setError(data.error ?? `HTTP ${res.status}`);
            } else {
                setLogs(data.logs);
                setFetchedAt(data.fetched_at);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fetch failed');
        } finally {
            setLoading(false);
        }
    }, [selectedApp, lineCount]);

    // Auto-scroll to bottom when logs update
    useEffect(() => {
        if (autoScroll && logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    // Manage polling interval
    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (pollInterval > 0) {
            intervalRef.current = setInterval(fetchLogs, pollInterval);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [pollInterval, fetchLogs]);

    // Re-fetch when app or line count changes
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const appMeta = APPS.find(a => a.key === selectedApp);
    const logLines = logs ? logs.split('\n') : [];

    return (
        <div className="w-full h-full bg-gray-50 dark:bg-neutral-900 p-6 flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        Server Logs
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Live container logs via Coolify API
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Poll toggle */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPollInterval(prev => prev > 0 ? 0 : 10000)}
                        className={pollInterval > 0
                            ? 'border-green-500 text-green-600 dark:text-green-400'
                            : 'border-gray-300 dark:border-gray-600'
                        }
                    >
                        {pollInterval > 0 ? (
                            <><Square className="h-3.5 w-3.5 mr-1.5" /> Stop polling</>
                        ) : (
                            <><Play className="h-3.5 w-3.5 mr-1.5" /> Auto-poll</>
                        )}
                    </Button>

                    <Button
                        onClick={fetchLogs}
                        disabled={loading}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {loading
                            ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Fetching…</>
                            : <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh</>
                        }
                    </Button>
                </div>
            </div>

            {/* Controls row */}
            <Card className="p-4 bg-white dark:bg-neutral-800 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Application</span>
                        <Select value={selectedApp} onValueChange={setSelectedApp}>
                            <SelectTrigger className="w-56 h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {APPS.map(app => (
                                    <SelectItem key={app.key} value={app.key}>
                                        <span className="flex items-center gap-2">
                                            {app.label}
                                            <Badge
                                                variant="outline"
                                                className={app.env === 'production'
                                                    ? 'text-xs border-orange-400 text-orange-500'
                                                    : 'text-xs border-gray-400 text-gray-500'
                                                }
                                            >
                                                {app.env === 'production' ? 'prod' : 'dev'}
                                            </Badge>
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Lines</span>
                        <Select value={String(lineCount)} onValueChange={v => setLineCount(parseInt(v, 10))}>
                            <SelectTrigger className="w-28 h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {LINE_OPTIONS.map(n => (
                                    <SelectItem key={n} value={String(n)}>{n} lines</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Poll interval</span>
                        <Select value={String(pollInterval)} onValueChange={v => setPollInterval(parseInt(v, 10))}>
                            <SelectTrigger className="w-36 h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {POLL_INTERVALS.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="ml-auto flex items-end gap-3 pb-0.5">
                        {fetchedAt && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Last fetched: {new Date(fetchedAt).toLocaleTimeString()}
                            </span>
                        )}
                        {pollInterval > 0 && (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700">
                                Live — polling every {pollInterval / 1000}s
                            </Badge>
                        )}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {logLines.length} lines
                        </span>
                    </div>
                </div>
            </Card>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Log output */}
            <Card className="flex-1 flex flex-col min-h-0 bg-neutral-950 border-neutral-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800 bg-neutral-900 shrink-0">
                    <Terminal className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-mono text-neutral-400">
                        {appMeta?.label} — last {lineCount} lines
                    </span>
                    <button
                        onClick={() => {
                            setAutoScroll(prev => !prev);
                            if (!autoScroll && logRef.current) {
                                logRef.current.scrollTop = logRef.current.scrollHeight;
                            }
                        }}
                        className="ml-auto flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${autoScroll ? '' : '-rotate-90'}`} />
                        {autoScroll ? 'Auto-scroll on' : 'Auto-scroll off'}
                    </button>
                </div>

                <pre
                    ref={logRef}
                    className="flex-1 overflow-auto p-4 text-xs font-mono leading-5 min-h-0"
                    style={{ scrollbarGutter: 'stable' }}
                >
                    {loading && !logs ? (
                        <span className="text-neutral-500">Loading…</span>
                    ) : !logs ? (
                        <span className="text-neutral-500">No logs available. Select an app and click Refresh.</span>
                    ) : (
                        logLines.map((line, i) => (
                            <span key={i} className={`block ${colorize(line)}`}>
                                {line || '\u00a0'}
                            </span>
                        ))
                    )}
                </pre>
            </Card>
        </div>
    );
}
