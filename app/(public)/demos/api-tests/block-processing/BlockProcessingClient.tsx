"use client";

import React, { useState, useCallback, useRef } from "react";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import { ENDPOINTS, BACKEND_URLS } from "@/lib/api/endpoints";
import { useApiTestConfig, ApiTestConfigPanel } from "@/components/api-test-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Cpu, Send, Copy, Trash2, Waves } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

interface BlockResult {
    block_count: number;
    blocks: Record<string, unknown>[];
}

type Mode = "json" | "stream";

// ─────────────────────────────────────────────────────
// Sample content
// ─────────────────────────────────────────────────────

const SAMPLE_CONTENT = `Here is a brief overview of the topic.

\`\`\`python
def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("World"))
\`\`\`

| Model | Speed | Quality |
|-------|-------|---------|
| GPT-4 | Slow | High |
| Claude | Fast | High |

Some more text follows here with additional context.`;

// ─────────────────────────────────────────────────────
// Main client
// ─────────────────────────────────────────────────────

export default function BlockProcessingClient() {
    const apiConfig = useApiTestConfig({ defaultServerType: "local" });

    const [content, setContent] = useState(SAMPLE_CONTENT);
    const [includeRaw, setIncludeRaw] = useState(false);
    const [mode, setMode] = useState<Mode>("json");
    const [isRunning, setIsRunning] = useState(false);
    const [result, setResult] = useState<BlockResult | null>(null);
    const [streamEvents, setStreamEvents] = useState<Record<string, unknown>[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const abortRef = useRef<AbortController | null>(null);

    const copyOutput = useCallback((text: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, []);

    const handleRun = useCallback(async () => {
        if (!content.trim() || isRunning) return;
        setError(null);
        setResult(null);
        setStreamEvents([]);
        setIsRunning(true);

        const controller = new AbortController();
        abortRef.current = controller;

        const baseUrl = apiConfig.baseUrl;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiConfig.authToken) headers["Authorization"] = `Bearer ${apiConfig.authToken}`;

        const body = JSON.stringify({ content, include_raw: includeRaw });

        try {
            if (mode === "json") {
                const res = await fetch(`${baseUrl}${ENDPOINTS.blockProcessing.process}`, {
                    method: "POST",
                    headers,
                    body,
                    signal: controller.signal,
                });
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d?.detail || d?.message || `HTTP ${res.status}`);
                }
                const data: BlockResult = await res.json();
                setResult(data);
            } else {
                // Streaming mode
                const res = await fetch(`${baseUrl}${ENDPOINTS.blockProcessing.processStream}`, {
                    method: "POST",
                    headers,
                    body,
                    signal: controller.signal,
                });
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d?.detail || d?.message || `HTTP ${res.status}`);
                }
                const { events } = parseNdjsonStream(res, controller.signal);
                const accumulated: Record<string, unknown>[] = [];
                for await (const ev of events) {
                    accumulated.push(ev as Record<string, unknown>);
                    setStreamEvents([...accumulated]);
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.name !== "AbortError") {
                setError(err.message);
            }
        } finally {
            abortRef.current = null;
            setIsRunning(false);
        }
    }, [content, includeRaw, mode, apiConfig.baseUrl, apiConfig.authToken, isRunning]);

    const handleStop = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    const outputText = mode === "json" && result
        ? JSON.stringify(result, null, 2)
        : streamEvents.length > 0
            ? streamEvents.map(e => JSON.stringify(e)).join("\n")
            : "";

    const blockCount = mode === "json"
        ? result?.block_count ?? 0
        : streamEvents.filter(e => (e as { event?: string }).event === "content_block").length;

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background text-sm">
            {/* Header */}
            <div className="flex-shrink-0 border-b border-border bg-card">
                <div className="flex items-center gap-2 px-4 pt-3 pb-1">
                    <Cpu className="w-5 h-5 text-primary" />
                    <h1 className="text-base font-bold">Block Processing Tester</h1>
                    <Badge variant={isRunning ? "default" : "secondary"} className="ml-auto text-[10px]">
                        {isRunning ? "Processing..." : "Ready"}
                    </Badge>
                </div>
                <div className="px-4 pb-2">
                    <ApiTestConfigPanel config={apiConfig} />
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
                {/* Left: input controls */}
                <div className="w-[400px] flex-shrink-0 border-r border-border overflow-y-auto px-4 py-4 space-y-4">
                    {/* Mode selector */}
                    <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Mode</Label>
                        <div className="flex gap-2 mt-1.5">
                            <button
                                onClick={() => setMode("json")}
                                className={cn(
                                    "flex-1 h-7 text-xs rounded-md border transition-colors",
                                    mode === "json"
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                                )}
                            >
                                JSON (one-shot)
                            </button>
                            <button
                                onClick={() => setMode("stream")}
                                className={cn(
                                    "flex-1 h-7 text-xs rounded-md border transition-colors flex items-center justify-center gap-1",
                                    mode === "stream"
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                                )}
                            >
                                <Waves className="w-3 h-3" />
                                Stream (NDJSON)
                            </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {mode === "json"
                                ? "Processes content and returns all blocks at once as JSON."
                                : "Simulates real-time streaming — replays block events as content_block NDJSON."}
                        </p>
                    </div>

                    {/* Content textarea */}
                    <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            Content to process
                        </Label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            rows={18}
                            placeholder="Paste any markdown, LLM response, or text here..."
                            disabled={isRunning}
                            className="mt-1 w-full text-xs resize-none rounded-md border border-input bg-background px-3 py-2 font-mono focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
                            style={{ fontSize: 12 }}
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {content.length.toLocaleString()} chars
                        </p>
                    </div>

                    {/* Options */}
                    <div className="flex items-center gap-2">
                        <input
                            id="include_raw"
                            type="checkbox"
                            checked={includeRaw}
                            onChange={e => setIncludeRaw(e.target.checked)}
                            disabled={isRunning || mode === "stream"}
                            className="h-3.5 w-3.5 rounded border-input"
                        />
                        <Label
                            htmlFor="include_raw"
                            className={cn("text-xs cursor-pointer", (mode === "stream") && "text-muted-foreground/50")}
                        >
                            Include raw_content field (JSON mode only)
                        </Label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Button
                            onClick={handleRun}
                            disabled={!content.trim() || isRunning}
                            size="sm"
                            className="flex-1 h-7 text-xs"
                        >
                            {isRunning
                                ? <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                : <Send className="w-3 h-3 mr-1" />}
                            Process
                        </Button>
                        {isRunning && (
                            <Button
                                onClick={handleStop}
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs px-3"
                            >
                                Stop
                            </Button>
                        )}
                    </div>

                    {error && (
                        <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive">
                            {error}
                        </div>
                    )}
                </div>

                {/* Right: output */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-1.5 border-b border-border bg-card flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">Output</span>
                            {(result || streamEvents.length > 0) && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                    {blockCount} block{blockCount !== 1 ? "s" : ""}
                                </Badge>
                            )}
                            {isRunning && mode === "stream" && (
                                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                onClick={() => { setResult(null); setStreamEvents([]); setError(null); }}
                                disabled={isRunning}
                                title="Clear output"
                            >
                                <Trash2 className="w-3 h-3 text-muted-foreground" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-5 w-5 p-0"
                                onClick={() => copyOutput(outputText)}
                                disabled={!outputText}
                                title="Copy output"
                            >
                                <Copy className={cn("w-3 h-3", copied ? "text-green-500" : "text-muted-foreground")} />
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-4">
                        {!outputText && !isRunning && (
                            <p className="text-xs text-muted-foreground italic">
                                Paste content on the left and click Process to see block output here.
                            </p>
                        )}
                        {isRunning && !outputText && (
                            <p className="text-xs text-muted-foreground italic">Waiting for response...</p>
                        )}
                        {outputText && (
                            <pre className="text-[11px] font-mono leading-relaxed text-foreground/85 whitespace-pre-wrap break-all">
                                {outputText}
                            </pre>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
