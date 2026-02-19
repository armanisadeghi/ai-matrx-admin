'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Activity,
    ChevronRight,
    FileText,
    FolderOpen,
    Globe,
    Loader2,
    Monitor,
    Send,
    Terminal,
    Wifi,
} from 'lucide-react';
import { ConnectionBar } from './_lib/ConnectionBar';
import { MessageLog, ResultPanel } from './_lib/ResultPanel';
import { useMatrxLocal } from './_lib/useMatrxLocal';
import { ALL_TOOLS } from './_lib/constants';
import type { ToolResult } from './_lib/types';

// ---------------------------------------------------------------------------
// Navigation cards
// ---------------------------------------------------------------------------

const SUB_PAGES = [
    {
        href: '/demos/local-tools/scraper',
        icon: Globe,
        label: 'Scraper Engine',
        description: 'Scrape, Search & Research with residential IP + anti-bot',
        badge: 'New',
    },
    {
        href: '/demos/local-tools/files',
        icon: FileText,
        label: 'File Operations',
        description: 'Read, Write, Edit, Glob, Grep, Download, Upload',
    },
    {
        href: '/demos/local-tools/system',
        icon: Monitor,
        label: 'System Tools',
        description: 'SystemInfo, Screenshot, Clipboard, Notify, Open',
    },
    {
        href: '/demos/local-tools/shell',
        icon: Terminal,
        label: 'Shell Execution',
        description: 'Bash, background processes, BashOutput, TaskStop',
    },
    {
        href: '/demos/local-tools/terminal',
        icon: FolderOpen,
        label: 'Terminal',
        description: 'Interactive shell-like terminal interface',
    },
] as const;

// ---------------------------------------------------------------------------
// Quick presets
// ---------------------------------------------------------------------------

const QUICK_PRESETS: { label: string; tool: string; input: Record<string, unknown> }[] = [
    { label: 'System Info', tool: 'SystemInfo', input: {} },
    { label: 'List Home', tool: 'ListDirectory', input: { show_hidden: false } },
    { label: 'ls -la', tool: 'Bash', input: { command: 'ls -la', timeout: 10000 } },
    { label: 'Find .py', tool: 'Glob', input: { pattern: '*.py', path: '.' } },
    { label: 'Screenshot', tool: 'Screenshot', input: {} },
    { label: 'Clipboard', tool: 'ClipboardRead', input: {} },
    {
        label: 'Scrape Example',
        tool: 'Scrape',
        input: { urls: ['https://httpbin.org/html'], use_cache: false },
    },
    {
        label: 'Fetch URL',
        tool: 'FetchUrl',
        input: { url: 'https://httpbin.org/get' },
    },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LocalToolsDemo() {
    const local = useMatrxLocal();
    const { invokeTool, loading, logs, clearLogs } = local;

    const [activeResult, setActiveResult] = useState<ToolResult | null>(null);
    const [customTool, setCustomTool] = useState('Bash');
    const [customInput, setCustomInput] = useState('{"command": "echo hello"}');

    const logEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const runTool = async (tool: string, input: Record<string, unknown>) => {
        setActiveResult(null);
        const result = await invokeTool(tool, input);
        setActiveResult(result);
    };

    const runCustom = () => {
        try {
            runTool(customTool, JSON.parse(customInput));
        } catch {
            setActiveResult({ type: 'error', output: 'Invalid JSON input' });
        }
    };

    const isDisabled = !!loading || (local.useWebSocket && !local.wsConnected);

    return (
        <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-textured">
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-6xl mx-auto space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                <Wifi className="w-5 h-5" />
                                Matrx Local
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Connect to your local machine and test all 23 tools
                            </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                            {ALL_TOOLS.length} tools
                        </Badge>
                    </div>

                    {/* Connection Bar */}
                    <ConnectionBar hook={local} />

                    {/* Navigation Grid */}
                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                            Feature Pages
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {SUB_PAGES.map((page) => {
                                const Icon = page.icon;
                                return (
                                    <Link key={page.href} href={page.href}>
                                        <div className="border rounded-lg p-3 bg-card hover:bg-accent/50 transition-colors cursor-pointer group">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Icon className="w-4 h-4 text-primary shrink-0" />
                                                    <span className="text-sm font-medium">{page.label}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {'badge' in page && (
                                                        <Badge variant="default" className="text-[10px] h-4 px-1.5">
                                                            {page.badge}
                                                        </Badge>
                                                    )}
                                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 ml-6">
                                                {page.description}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick presets */}
                    <div className="border rounded-lg p-3 bg-card">
                        <h2 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
                            Quick Fire
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {QUICK_PRESETS.map((preset) => (
                                <Button
                                    key={`${preset.tool}-${preset.label}`}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={isDisabled}
                                    onClick={() => runTool(preset.tool, preset.input)}
                                >
                                    {loading === `${preset.tool}-${Date.now()}` && (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    )}
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Custom tool invocation */}
                    <div className="border rounded-lg p-3 bg-card space-y-2">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Custom Tool Call
                        </h2>
                        <div className="flex gap-2 flex-wrap">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-muted-foreground">Tool</label>
                                <select
                                    value={customTool}
                                    onChange={(e) => setCustomTool(e.target.value)}
                                    className="h-8 text-xs font-mono rounded border px-2 bg-background"
                                >
                                    {ALL_TOOLS.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                                <label className="text-xs text-muted-foreground">Input (JSON)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customInput}
                                        onChange={(e) => setCustomInput(e.target.value)}
                                        className="h-8 text-xs font-mono rounded border px-2 bg-background flex-1"
                                        placeholder='{"command": "echo hello"}'
                                        onKeyDown={(e) => e.key === 'Enter' && runCustom()}
                                    />
                                    <Button
                                        size="sm"
                                        className="h-8 px-3"
                                        disabled={isDisabled}
                                        onClick={runCustom}
                                    >
                                        {loading ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <Send className="w-3 h-3 mr-1" />
                                        )}
                                        Send
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result + Log */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ResultPanel result={activeResult} loading={!!loading} />
                        <div>
                            <MessageLog logs={logs} onClear={clearLogs} />
                            <div ref={logEndRef} />
                        </div>
                    </div>

                    {/* WS Monitor summary */}
                    <div className="border rounded-lg p-3 bg-card">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4" />
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Connection Info
                            </h2>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                                <p className="text-muted-foreground">REST Endpoint</p>
                                <p className="font-mono truncate">{local.baseUrl}/tools/invoke</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">WS Endpoint</p>
                                <p className="font-mono truncate">
                                    {local.baseUrl.replace(/^http/, 'ws')}/ws
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Transport</p>
                                <p>{local.useWebSocket ? 'WebSocket' : 'REST'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Messages</p>
                                <p>{logs.length} logged</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
