"use client";

import React, { useState, useCallback, useRef } from "react";
import { parseNdjsonStream } from "@/lib/api/stream-parser";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { useApiTestConfig, ApiTestConfigPanel } from "@/components/api-test-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import MarkdownStream from "@/components/MarkdownStream";
import type { StreamEvent } from "@/types/python-generated/stream-events";
import { Loader2, Cpu, Send, Copy, Trash2, Waves, FileText, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

interface BlockResult {
    block_count: number;
    blocks: Record<string, unknown>[];
}

type ApiMode = "json" | "stream";
type OutputTab = "raw" | "direct" | "processed";

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
// Output tabs
// ─────────────────────────────────────────────────────

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    badge?: React.ReactNode;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-3 h-8 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
        >
            {icon}
            {label}
            {badge}
        </button>
    );
}

// ─────────────────────────────────────────────────────
// Main client
// ─────────────────────────────────────────────────────

export default function BlockProcessingClient() {
    const apiConfig = useApiTestConfig({ defaultServerType: "local" });

    const [content, setContent] = useState(SAMPLE_CONTENT);
    const [includeRaw, setIncludeRaw] = useState(false);
    const [apiMode, setApiMode] = useState<ApiMode>("stream");
    const [outputTab, setOutputTab] = useState<OutputTab>("raw");
    const [isRunning, setIsRunning] = useState(false);

    // JSON mode result
    const [jsonResult, setJsonResult] = useState<BlockResult | null>(null);
    // Stream mode events (raw NDJSON objects for Raw tab)
    const [rawEvents, setRawEvents] = useState<Record<string, unknown>[]>([]);
    // Typed stream events for Processed tab (what MarkdownStream.events expects)
    const [processedEvents, setProcessedEvents] = useState<StreamEvent[]>([]);

    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const abortRef = useRef<AbortController | null>(null);

    const copyText = useCallback((text: string) => {
        navigator.clipboard.writeText(text).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, []);

    const handleRun = useCallback(async () => {
        if (!content.trim() || isRunning) return;
        setError(null);
        setJsonResult(null);
        setRawEvents([]);
        setProcessedEvents([]);
        setIsRunning(true);

        const controller = new AbortController();
        abortRef.current = controller;

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiConfig.authToken) headers["Authorization"] = `Bearer ${apiConfig.authToken}`;
        const body = JSON.stringify({ content, include_raw: includeRaw });

        try {
            if (apiMode === "json") {
                const res = await fetch(`${apiConfig.baseUrl}${ENDPOINTS.blockProcessing.process}`, {
                    method: "POST", headers, body, signal: controller.signal,
                });
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d?.detail || d?.message || `HTTP ${res.status}`);
                }
                const data: BlockResult = await res.json();
                setJsonResult(data);

                // Convert JSON blocks into synthetic content_block stream events
                // so the Processed tab can pass them to MarkdownStream.events
                const syntheticEvents: StreamEvent[] = data.blocks.map((block, i) => ({
                    event: "content_block" as const,
                    data: {
                        blockId: (block.block_id as string) || `block-${i}`,
                        blockIndex: (block.block_index as number) ?? i,
                        type: block.type as string,
                        status: "complete" as const,
                        content: (block.content as string) ?? null,
                        data: (block.data as Record<string, unknown>) ?? null,
                        metadata: (block.metadata as Record<string, unknown>) ?? undefined,
                    } as unknown as Record<string, unknown>,
                }));
                setProcessedEvents(syntheticEvents);
            } else {
                // Stream mode — collect raw events AND build typed StreamEvent[]
                const res = await fetch(`${apiConfig.baseUrl}${ENDPOINTS.blockProcessing.processStream}`, {
                    method: "POST", headers, body, signal: controller.signal,
                });
                if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    throw new Error(d?.detail || d?.message || `HTTP ${res.status}`);
                }
                const { events } = parseNdjsonStream(res, controller.signal);
                const accRaw: Record<string, unknown>[] = [];
                const accTyped: StreamEvent[] = [];

                for await (const ev of events) {
                    accRaw.push(ev as unknown as Record<string, unknown>);
                    accTyped.push(ev);
                    // Spread to trigger re-render on each event (live preview)
                    setRawEvents([...accRaw]);
                    setProcessedEvents([...accTyped]);
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
    }, [content, includeRaw, apiMode, apiConfig.baseUrl, apiConfig.authToken, isRunning]);

    const handleStop = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    // Derive display values for Raw tab
    const rawOutputText = apiMode === "json" && jsonResult
        ? JSON.stringify(jsonResult, null, 2)
        : rawEvents.length > 0
            ? rawEvents.map(e => JSON.stringify(e)).join("\n")
            : "";

    const blockCount = apiMode === "json"
        ? jsonResult?.block_count ?? 0
        : rawEvents.filter(e => (e as { event?: string }).event === "content_block").length;

    const hasOutput = rawOutputText.length > 0 || processedEvents.length > 0;

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
                {/* ── Left: input + controls ── */}
                <div className="w-[380px] flex-shrink-0 border-r border-border overflow-y-auto px-4 py-4 space-y-4">
                    {/* API mode */}
                    <div>
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">API Mode</Label>
                        <div className="flex gap-2 mt-1.5">
                            <button
                                onClick={() => setApiMode("json")}
                                className={cn(
                                    "flex-1 h-7 text-xs rounded-md border transition-colors",
                                    apiMode === "json"
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                )}
                            >
                                JSON (one-shot)
                            </button>
                            <button
                                onClick={() => setApiMode("stream")}
                                className={cn(
                                    "flex-1 h-7 text-xs rounded-md border transition-colors flex items-center justify-center gap-1",
                                    apiMode === "stream"
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Waves className="w-3 h-3" />
                                Stream (NDJSON)
                            </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            {apiMode === "json"
                                ? "Returns all blocks at once. Processed tab simulates them as stream events."
                                : "Replays content_block events live — Processed tab renders in real time."}
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
                            rows={20}
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
                            disabled={isRunning || apiMode === "stream"}
                            className="h-3.5 w-3.5 rounded border-input"
                        />
                        <Label
                            htmlFor="include_raw"
                            className={cn("text-xs cursor-pointer", apiMode === "stream" && "text-muted-foreground/50")}
                        >
                            Include raw_content (JSON mode only)
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
                            <Button onClick={handleStop} size="sm" variant="destructive" className="h-7 text-xs px-3">
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

                {/* ── Right: tabbed output ── */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                    {/* Tab bar */}
                    <div className="flex-shrink-0 flex items-center gap-0 border-b border-border bg-card px-2">
                        <TabButton
                            active={outputTab === "raw"}
                            onClick={() => setOutputTab("raw")}
                            icon={<FileText className="w-3.5 h-3.5" />}
                            label="Raw Output"
                            badge={blockCount > 0 ? (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 ml-0.5">
                                    {blockCount}
                                </Badge>
                            ) : undefined}
                        />
                        <TabButton
                            active={outputTab === "direct"}
                            onClick={() => setOutputTab("direct")}
                            icon={<FileText className="w-3.5 h-3.5" />}
                            label="Direct Render"
                        />
                        <TabButton
                            active={outputTab === "processed"}
                            onClick={() => setOutputTab("processed")}
                            icon={<Layers className="w-3.5 h-3.5" />}
                            label="Processed Render"
                            badge={isRunning && apiMode === "stream" ? (
                                <Loader2 className="w-3 h-3 animate-spin text-blue-500 ml-1" />
                            ) : undefined}
                        />

                        <div className="ml-auto flex items-center gap-1 pr-1">
                            <Button
                                size="sm" variant="ghost" className="h-5 w-5 p-0"
                                onClick={() => { setJsonResult(null); setRawEvents([]); setProcessedEvents([]); setError(null); }}
                                disabled={isRunning || !hasOutput}
                                title="Clear output"
                            >
                                <Trash2 className="w-3 h-3 text-muted-foreground" />
                            </Button>
                            {outputTab === "raw" && (
                                <Button
                                    size="sm" variant="ghost" className="h-5 w-5 p-0"
                                    onClick={() => copyText(rawOutputText)}
                                    disabled={!rawOutputText}
                                    title="Copy raw output"
                                >
                                    <Copy className={cn("w-3 h-3", copied ? "text-green-500" : "text-muted-foreground")} />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 min-h-0 overflow-y-auto">

                        {/* ── Tab 1: Raw Output ── */}
                        {outputTab === "raw" && (
                            <div className="p-4 h-full">
                                {!rawOutputText && !isRunning && (
                                    <p className="text-xs text-muted-foreground italic">
                                        Click Process to see raw block output here.
                                    </p>
                                )}
                                {isRunning && !rawOutputText && (
                                    <p className="text-xs text-muted-foreground italic">Waiting for response...</p>
                                )}
                                {rawOutputText && (
                                    <pre className="text-[11px] font-mono leading-relaxed text-foreground/85 whitespace-pre-wrap break-all">
                                        {rawOutputText}
                                    </pre>
                                )}
                            </div>
                        )}

                        {/* ── Tab 2: Direct Render ── */}
                        {/* Renders input content directly via MarkdownStream — shows what the
                            current client-side parser produces. No API call needed. */}
                        {outputTab === "direct" && (
                            <div className="p-4">
                                {!content.trim() ? (
                                    <p className="text-xs text-muted-foreground italic">
                                        Enter content on the left to see how MarkdownStream currently renders it.
                                    </p>
                                ) : (
                                    <>
                                        <p className="text-[10px] text-muted-foreground mb-3 pb-2 border-b border-border">
                                            Rendering input directly with <code className="font-mono">MarkdownStream</code> (client-side parser, no API).
                                        </p>
                                        <MarkdownStream
                                            content={content}
                                            type="message"
                                            role="assistant"
                                            isStreamActive={false}
                                            hideCopyButton={false}
                                            allowFullScreenEditor={false}
                                        />
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Tab 3: Processed Render ── */}
                        {/* Renders the API response (content_block events) via MarkdownStream.events.
                            If the system works correctly, this should look identical to Tab 2. */}
                        {outputTab === "processed" && (
                            <div className="p-4">
                                {!hasOutput && !isRunning && (
                                    <p className="text-xs text-muted-foreground italic">
                                        Click Process to see how MarkdownStream renders the server-processed blocks.
                                        If correct, this should look identical to the Direct Render tab.
                                    </p>
                                )}
                                {isRunning && processedEvents.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">Waiting for blocks...</p>
                                )}
                                {processedEvents.length > 0 && (
                                    <>
                                        <p className="text-[10px] text-muted-foreground mb-3 pb-2 border-b border-border">
                                            Rendering server-processed <code className="font-mono">content_block</code> events
                                            via <code className="font-mono">MarkdownStream</code>.
                                            {processedEvents.filter(e => e.event === "content_block").length} block event{processedEvents.filter(e => e.event === "content_block").length !== 1 ? "s" : ""} received.
                                        </p>
                                        <MarkdownStream
                                            content=""
                                            events={processedEvents}
                                            type="message"
                                            role="assistant"
                                            isStreamActive={isRunning && apiMode === "stream"}
                                            hideCopyButton={false}
                                            allowFullScreenEditor={false}
                                        />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
