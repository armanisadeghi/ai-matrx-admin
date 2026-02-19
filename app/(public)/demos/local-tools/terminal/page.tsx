'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Terminal,
    Wifi,
    WifiOff,
    Loader2,
    XCircle,
    Trash2,
    FolderOpen,
    ChevronRight,
    ArrowLeft,
} from 'lucide-react';

import type { ToolResult } from '../_lib/types';
import { DEFAULT_LOCAL_URL } from '../_lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TerminalLine {
    id: string;
    type: 'input' | 'output' | 'error' | 'info';
    text: string;
    timestamp: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCommand(raw: string): { tool: string; input: Record<string, unknown> } | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Built-in shell-like commands
    if (trimmed === 'pwd') return { tool: 'Bash', input: { command: 'pwd' } };
    if (trimmed === 'ls') return { tool: 'ListDirectory', input: {} };
    if (trimmed === 'ls -a') return { tool: 'ListDirectory', input: { show_hidden: true } };
    if (trimmed.startsWith('ls ')) return { tool: 'Bash', input: { command: trimmed } };
    if (trimmed === 'sysinfo') return { tool: 'SystemInfo', input: {} };
    if (trimmed === 'screenshot') return { tool: 'Screenshot', input: {} };
    if (trimmed === 'help') return null; // handled inline
    if (trimmed === 'clear') return null; // handled inline
    if (trimmed === 'cancel') return null; // handled inline

    // cd — handled specially via Bash so cwd tracking works
    if (trimmed === 'cd' || trimmed.startsWith('cd ')) {
        return { tool: 'Bash', input: { command: trimmed } };
    }

    // cat <file> → Read
    if (trimmed.startsWith('cat ')) {
        const filePath = trimmed.slice(4).trim();
        return { tool: 'Read', input: { file_path: filePath } };
    }

    // head <file> → Read with limit
    if (trimmed.startsWith('head ')) {
        const filePath = trimmed.slice(5).trim();
        return { tool: 'Read', input: { file_path: filePath, limit: 20 } };
    }

    // find <pattern> → Glob
    if (trimmed.startsWith('find ')) {
        const pattern = trimmed.slice(5).trim();
        return { tool: 'Glob', input: { pattern, path: '.' } };
    }

    // grep <pattern> [path] → Grep
    if (trimmed.startsWith('grep ')) {
        const parts = trimmed.slice(5).trim().split(/\s+/);
        const pattern = parts[0] || '';
        const path = parts[1] || '.';
        return { tool: 'Grep', input: { pattern, path, max_results: 30 } };
    }

    // open <path> → OpenPath
    if (trimmed.startsWith('open ')) {
        return { tool: 'OpenPath', input: { path: trimmed.slice(5).trim() } };
    }

    // write <path> <content> → Write
    if (trimmed.startsWith('write ')) {
        const rest = trimmed.slice(6).trim();
        const spaceIdx = rest.indexOf(' ');
        if (spaceIdx === -1) return { tool: 'Write', input: { file_path: rest, content: '' } };
        return { tool: 'Write', input: { file_path: rest.slice(0, spaceIdx), content: rest.slice(spaceIdx + 1) } };
    }

    // Raw JSON tool call: {"tool": "...", "input": {...}}
    if (trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            if (parsed.tool) return { tool: parsed.tool, input: parsed.input || {} };
        } catch { /* fall through */ }
    }

    // Everything else → Bash
    return { tool: 'Bash', input: { command: trimmed, timeout: 15000 } };
}

const HELP_TEXT = `Available commands:
  <any command>     Run as shell command (bash)
  cd <dir>          Change directory (persists in session)
  ls / ls -a        List directory
  cat <file>        Read entire file
  head <file>       Read first 20 lines
  find <pattern>    Find files by glob pattern
  grep <pat> [path] Search file contents
  open <path>       Open in Finder/Explorer
  pwd               Print working directory
  sysinfo           System info
  screenshot        Capture screen
  write <f> <text>  Write text to file
  cancel            Cancel running tasks
  clear             Clear terminal
  help              Show this help
  {"tool":"..."}    Raw JSON tool call`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LocalToolsDemo() {
    const [baseUrl, setBaseUrl] = useState(DEFAULT_LOCAL_URL);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [lines, setLines] = useState<TerminalLine[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const [running, setRunning] = useState(false);
    const [cwd, setCwd] = useState('~');

    const wsRef = useRef<WebSocket | null>(null);
    const termEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pendingRef = useRef<{
        resolve: (r: ToolResult) => void;
        reject: (e: Error) => void;
        timer: ReturnType<typeof setTimeout>;
    } | null>(null);

    // ── Helpers ───────────────────────────────────────────────────────────

    const addLine = useCallback((type: TerminalLine['type'], text: string) => {
        setLines(prev => [
            ...prev,
            { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, text, timestamp: new Date() },
        ]);
    }, []);

    // Auto-scroll
    useEffect(() => {
        termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines]);

    // Focus input on click anywhere in terminal
    const focusInput = useCallback(() => inputRef.current?.focus(), []);

    // ── WebSocket ─────────────────────────────────────────────────────────

    const connectWs = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;
        setConnecting(true);

        const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws';
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setConnected(true);
            setConnecting(false);
            addLine('info', `Connected to ${wsUrl}`);

            // Get initial cwd
            ws.send(JSON.stringify({ id: '__init_cwd', tool: 'Bash', input: { command: 'pwd' } }));
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as ToolResult;

                // Handle initial cwd probe
                if (data.id === '__init_cwd') {
                    const dir = data.output?.trim();
                    if (dir) setCwd(dir);
                    return;
                }

                pendingRef.current?.resolve(data);
                if (pendingRef.current?.timer) clearTimeout(pendingRef.current.timer);
                pendingRef.current = null;
            } catch {
                // ignore
            }
        };

        ws.onclose = () => {
            setConnected(false);
            setConnecting(false);
            addLine('info', 'Disconnected');
            if (pendingRef.current) {
                pendingRef.current.reject(new Error('Connection closed'));
                clearTimeout(pendingRef.current.timer);
                pendingRef.current = null;
            }
        };

        ws.onerror = () => {
            setConnected(false);
            setConnecting(false);
        };

        wsRef.current = ws;
    }, [baseUrl, addLine]);

    const disconnectWs = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
    }, []);

    useEffect(() => () => disconnectWs(), [disconnectWs]);

    // ── Send tool call ────────────────────────────────────────────────────

    const sendTool = useCallback((tool: string, input: Record<string, unknown>): Promise<ToolResult> => {
        return new Promise((resolve, reject) => {
            const ws = wsRef.current;
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                reject(new Error('Not connected'));
                return;
            }

            const reqId = `req-${Date.now()}`;
            const timer = setTimeout(() => {
                if (pendingRef.current?.resolve === resolve) {
                    pendingRef.current = null;
                    reject(new Error('Timed out (30s)'));
                }
            }, 30_000);

            pendingRef.current = { resolve, reject, timer };
            ws.send(JSON.stringify({ id: reqId, tool, input }));
        });
    }, []);

    const cancelAll = useCallback(() => {
        const ws = wsRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'cancel_all' }));
        }
        if (pendingRef.current) {
            pendingRef.current.reject(new Error('Cancelled'));
            clearTimeout(pendingRef.current.timer);
            pendingRef.current = null;
        }
        setRunning(false);
        addLine('info', 'Cancelled all running tasks');
    }, [addLine]);

    // ── Execute command ───────────────────────────────────────────────────

    const executeCommand = useCallback(async (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;

        // Add to history
        setHistory(prev => {
            const filtered = prev.filter(h => h !== trimmed);
            return [trimmed, ...filtered].slice(0, 100);
        });
        setHistoryIdx(-1);

        addLine('input', `${cwd} $ ${trimmed}`);

        // Built-in commands
        if (trimmed === 'clear') {
            setLines([]);
            return;
        }
        if (trimmed === 'help') {
            addLine('info', HELP_TEXT);
            return;
        }
        if (trimmed === 'cancel') {
            cancelAll();
            return;
        }

        const parsed = parseCommand(trimmed);
        if (!parsed) {
            addLine('error', `Unknown command. Type "help" for available commands.`);
            return;
        }

        if (!connected) {
            addLine('error', 'Not connected. Click Connect first.');
            return;
        }

        setRunning(true);
        try {
            const result = await sendTool(parsed.tool, parsed.input);

            if (result.output) {
                addLine(result.type === 'error' ? 'error' : 'output', result.output);
            }

            // Update cwd from metadata or detect cd
            if (result.metadata?.cwd) {
                setCwd(String(result.metadata.cwd));
            } else if (trimmed.startsWith('cd ') || trimmed === 'cd') {
                // After cd, grab the new cwd
                try {
                    const pwdResult = await sendTool('Bash', { command: 'pwd' });
                    const dir = pwdResult.output?.trim();
                    if (dir) setCwd(dir);
                } catch { /* ignore */ }
            }

            if (result.image) {
                addLine('info', `[Image: ${result.image.media_type}]`);
            }
        } catch (err) {
            addLine('error', err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setRunning(false);
        }
    }, [connected, cwd, addLine, sendTool, cancelAll]);

    // ── Key handling ──────────────────────────────────────────────────────

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = inputValue;
            setInputValue('');
            executeCommand(val);
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const nextIdx = Math.min(historyIdx + 1, history.length - 1);
            if (history[nextIdx]) {
                setHistoryIdx(nextIdx);
                setInputValue(history[nextIdx]);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = historyIdx - 1;
            if (nextIdx < 0) {
                setHistoryIdx(-1);
                setInputValue('');
            } else {
                setHistoryIdx(nextIdx);
                setInputValue(history[nextIdx] || '');
            }
            return;
        }

        // Ctrl+C → cancel
        if (e.key === 'c' && e.ctrlKey) {
            e.preventDefault();
            cancelAll();
            setInputValue('');
        }
    }, [inputValue, history, historyIdx, executeCommand, cancelAll]);

    // ── Render ────────────────────────────────────────────────────────────

    return (
        <div className="h-[calc(100dvh-var(--header-height))] flex flex-col overflow-hidden bg-background">
            {/* Top bar */}
            <div className="border-b px-4 py-2 flex items-center gap-3 shrink-0">
                <Link href="/demos/local-tools">
                    <Button variant="ghost" size="sm" className="h-7 text-xs px-2 gap-1">
                        <ArrowLeft className="w-3 h-3" /> Dashboard
                    </Button>
                </Link>
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Matrx Local Terminal</span>

                <div className="flex items-center gap-2 ml-4">
                    <input
                        type="text"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        className="h-7 text-xs font-mono rounded border px-2 bg-background w-52"
                    />
                    {connected ? (
                        <>
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-600 text-xs">
                                <Wifi className="w-3 h-3" /> Connected
                            </Badge>
                            <Button size="sm" variant="outline" onClick={disconnectWs} className="h-7 text-xs px-2">
                                Disconnect
                            </Button>
                        </>
                    ) : (
                        <>
                            <Badge variant="outline" className="gap-1 text-muted-foreground text-xs">
                                <WifiOff className="w-3 h-3" /> Disconnected
                            </Badge>
                            <Button size="sm" onClick={connectWs} disabled={connecting} className="h-7 text-xs px-2">
                                {connecting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                Connect
                            </Button>
                        </>
                    )}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {running && (
                        <Button size="sm" variant="destructive" onClick={cancelAll} className="h-7 text-xs px-2 gap-1">
                            <XCircle className="w-3 h-3" /> Cancel
                        </Button>
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setLines([])}
                        className="h-7 text-xs px-2 gap-1"
                    >
                        <Trash2 className="w-3 h-3" /> Clear
                    </Button>
                </div>
            </div>

            {/* Terminal body */}
            <div
                className="flex-1 overflow-y-auto bg-zinc-950 text-zinc-100 font-mono text-sm p-4 cursor-text"
                onClick={focusInput}
            >
                {/* Welcome message */}
                {lines.length === 0 && (
                    <div className="text-zinc-500 mb-2">
                        Matrx Local Terminal — type &quot;help&quot; for commands, &quot;cancel&quot; or Ctrl+C to abort
                    </div>
                )}

                {/* Lines */}
                {lines.map((line) => (
                    <div
                        key={line.id}
                        className={`whitespace-pre-wrap break-all leading-relaxed ${
                            line.type === 'input'
                                ? 'text-green-400'
                                : line.type === 'error'
                                  ? 'text-red-400'
                                  : line.type === 'info'
                                    ? 'text-zinc-500'
                                    : 'text-zinc-200'
                        }`}
                    >
                        {line.text}
                    </div>
                ))}

                {/* Loading indicator */}
                {running && (
                    <div className="flex items-center gap-2 text-yellow-500 mt-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="text-xs">Running... (type &quot;cancel&quot; or Ctrl+C to abort)</span>
                    </div>
                )}

                {/* Input line */}
                <div className="flex items-center gap-0 mt-1">
                    <span className="text-blue-400 shrink-0 flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />
                        {cwd.replace(/^\/Users\/[^/]+/, '~')}
                    </span>
                    <ChevronRight className="w-3 h-3 text-zinc-600 mx-1 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent outline-none text-zinc-100 caret-green-400"
                        autoFocus
                        spellCheck={false}
                        autoComplete="off"
                    />
                </div>

                <div ref={termEndRef} />
            </div>
        </div>
    );
}
