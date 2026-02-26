"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
    Wand2,
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    AlertTriangle,
    Loader2,
    Save,
    Eye,
    Database,
    Sparkles,
    FlaskConical,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    X,
    BookmarkCheck,
    ThumbsUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/utils/supabase/client";
import { formatDistanceToNow } from "date-fns";
import MarkdownStream from "@/components/MarkdownStream";
import { useToolComponentAgent } from "./hooks/useToolComponentAgent";
import { COMPONENT_GENERATOR_PROMPT_ID } from "./tool-ui-generator-prompt";

// Import only for the preview type bridge — not the full component tree
import type { ToolStreamEvent, FinalPayload } from "@/app/(public)/demos/api-tests/tool-testing/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratorProps {
    tools: Array<{ id: string; name: string; description: string; category?: string; output_schema?: unknown; parameters?: unknown; function_path?: string; tags?: string[]; icon?: string; is_active?: boolean; version?: string }>;
    onComplete?: () => void;
    /** When provided, skips step 1 and pre-selects this tool automatically */
    preselectedToolName?: string;
}

interface ToolTestSample {
    id: string;
    tool_id: string | null;
    tool_name: string;
    tested_by: string | null;
    arguments: Record<string, unknown>;
    raw_stream_events: unknown[];
    final_payload: Record<string, unknown> | null;
    admin_comments: string | null;
    is_success: boolean | null;
    use_for_component: boolean;
    created_at: string;
}

interface CxToolCallEntry {
    id: string;
    tool_name: string;
    call_id: string;
    status: string;
    arguments: Record<string, unknown>;
    output: string | null;
    output_type: string | null;
    duration_ms: number;
    started_at: string;
    completed_at: string;
}

interface GeneratedComponent {
    tool_name: string;
    display_name: string;
    results_label: string;
    inline_code: string;
    overlay_code: string;
    utility_code: string;
    header_extras_code: string;
    header_subtitle_code: string;
    keep_expanded_on_stream: boolean;
    allowed_imports: string[];
    version: string;
}

type WizardStep = "select-tool" | "select-data" | "generate" | "review" | "saved";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractJsonFromResponse(text: string): GeneratedComponent | null {
    const jsonBlockMatch = text.match(/```json\s*\n?([\s\S]*?)```/);
    if (jsonBlockMatch) {
        try {
            return JSON.parse(jsonBlockMatch[1].trim()) as GeneratedComponent;
        } catch {
            // fall through
        }
    }
    const braceMatch = text.match(/\{[\s\S]*"tool_name"[\s\S]*"inline_code"[\s\S]*\}/);
    if (braceMatch) {
        try {
            return JSON.parse(braceMatch[0]) as GeneratedComponent;
        } catch {
            // fall through
        }
    }
    return null;
}

function argsPreview(args: Record<string, unknown>): string {
    const keys = Object.keys(args);
    if (keys.length === 0) return "No arguments";
    return keys.slice(0, 3).map(k => {
        const v = args[k];
        const display = typeof v === "string" ? `"${v.slice(0, 30)}"` : JSON.stringify(v);
        return `${k}: ${display}`;
    }).join(", ") + (keys.length > 3 ? ", …" : "");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SampleCardProps {
    sample: ToolTestSample;
    selected: boolean;
    onToggle: () => void;
}

function SampleCard({ sample, selected, onToggle }: SampleCardProps) {
    return (
        <button
            onClick={onToggle}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
                selected
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-border hover:border-border/80 hover:bg-muted/30"
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        selected ? "bg-primary border-primary" : "border-border"
                    }`}>
                        {selected && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground truncate">{argsPreview(sample.arguments)}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {sample.use_for_component && (
                        <Badge variant="secondary" className="text-[10px] gap-0.5 h-4 px-1.5">
                            <BookmarkCheck className="h-2.5 w-2.5" />
                            Tagged
                        </Badge>
                    )}
                    {sample.is_success === true && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-success border-success/40">
                            <ThumbsUp className="h-2.5 w-2.5 mr-0.5" />
                            Pass
                        </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(sample.created_at), { addSuffix: true })}
                    </span>
                </div>
            </div>
            <div className="mt-1.5 text-[10px] text-muted-foreground">
                {sample.raw_stream_events?.length ?? 0} stream events
                {sample.admin_comments && <span className="ml-2 italic">"{sample.admin_comments.slice(0, 60)}"</span>}
            </div>
        </button>
    );
}

interface DbEntryCardProps {
    entry: CxToolCallEntry;
    selected: boolean;
    onToggle: () => void;
}

function DbEntryCard({ entry, selected, onToggle }: DbEntryCardProps) {
    const outputPreview = entry.output ? entry.output.slice(0, 100) + (entry.output.length > 100 ? "…" : "") : "No output";
    return (
        <button
            onClick={onToggle}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
                selected
                    ? "border-primary bg-primary/5 dark:bg-primary/10"
                    : "border-border hover:border-border/80 hover:bg-muted/30"
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        selected ? "bg-primary border-primary" : "border-border"
                    }`}>
                        {selected && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-xs font-mono text-muted-foreground truncate">{argsPreview(entry.arguments)}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground">
                        {(entry.duration_ms / 1000).toFixed(1)}s
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.completed_at), { addSuffix: true })}
                    </span>
                </div>
            </div>
            <div className="mt-1.5 text-[10px] text-muted-foreground font-mono truncate">{outputPreview}</div>
        </button>
    );
}

interface CodeBlockProps {
    code: string;
    label: string;
}

function CodeBlock({ code, label }: CodeBlockProps) {
    if (!code) {
        return <p className="text-xs text-muted-foreground italic py-4 text-center">Not generated</p>;
    }
    return (
        <pre className="text-xs bg-muted/40 dark:bg-slate-900 p-3 rounded-lg overflow-auto max-h-[350px] whitespace-pre-wrap font-mono leading-relaxed">
            {code}
        </pre>
    );
}

interface RawResponseProps {
    text: string;
}

function RawResponse({ text }: RawResponseProps) {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="rounded-lg border border-border">
            <button
                onClick={() => setExpanded(p => !p)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
                <span>Raw model response</span>
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {expanded && (
                <div className="border-t border-border">
                    <pre className="text-xs p-3 font-mono whitespace-pre-wrap overflow-auto max-h-[400px] text-muted-foreground">
                        {text}
                    </pre>
                </div>
            )}
        </div>
    );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────

interface LivePreviewProps {
    toolName: string;
    rawStreamEvents: unknown[];
}

function LivePreview({ toolName, rawStreamEvents }: LivePreviewProps) {
    // Dynamically import ToolRendererPreview to avoid bundling the test suite unnecessarily
    const [PreviewComponent, setPreviewComponent] = useState<React.ComponentType<{
        toolName: string;
        args: Record<string, unknown>;
        toolEvents: ToolStreamEvent[];
        finalPayload: FinalPayload | null;
        isRunning: boolean;
    }> | null>(null);

    useEffect(() => {
        import("@/app/(public)/demos/api-tests/tool-testing/components/ToolRendererPreview")
            .then(m => setPreviewComponent(() => m.ToolRendererPreview))
            .catch(() => setPreviewComponent(null));
    }, []);

    // Extract args from stream events
    const inputEvent = (rawStreamEvents as Array<{ type?: string; mcp_input?: { arguments?: Record<string, unknown> } }>)
        .find(e => e?.type === "mcp_input");
    const args = inputEvent?.mcp_input?.arguments ?? {};

    // Build tool events from stream — execution_events format from cx_tool_call
    const toolEvents: ToolStreamEvent[] = (rawStreamEvents as Array<{
        type?: string;
        user_message?: string;
        step_data?: { type?: string; content?: Record<string, unknown> };
        mcp_output?: Record<string, unknown>;
    }>).flatMap((e, i): ToolStreamEvent[] => {
        if (e.type === "user_message" && e.user_message) {
            return [{
                event: "tool_progress",
                call_id: "preview",
                tool_name: toolName,
                timestamp: i,
                message: e.user_message,
                show_spinner: true,
                data: {},
            }];
        }
        return [];
    });

    // Build final payload from mcp_output
    const outputEvent = (rawStreamEvents as Array<{ type?: string; mcp_output?: { result?: unknown } }>)
        .find(e => e?.type === "mcp_output");

    const finalPayload: FinalPayload | null = outputEvent?.mcp_output?.result != null ? {
        status: "complete",
        output: {
            model_facing_result: {
                tool_use_id: "preview",
                call_id: "preview",
                name: toolName,
                content: JSON.stringify(outputEvent.mcp_output.result),
                is_error: false,
            },
            full_result: {
                success: true,
                output: outputEvent.mcp_output.result,
                error: null,
                duration_ms: 0,
                usage: null,
                child_usages: [],
            },
        },
        metadata: {
            cost_estimate: null,
            output_schema: null,
        },
    } : null;

    if (!PreviewComponent) {
        return (
            <div className="flex items-center justify-center py-8 text-xs text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading preview…
            </div>
        );
    }

    return (
        <PreviewComponent
            toolName={toolName}
            args={args}
            toolEvents={toolEvents}
            finalPayload={finalPayload}
            isRunning={false}
        />
    );
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

const STEPS: { key: WizardStep; label: string }[] = [
    { key: "select-tool", label: "Select Tool" },
    { key: "select-data", label: "Select Data" },
    { key: "generate", label: "Generate" },
    { key: "review", label: "Review" },
    { key: "saved", label: "Saved" },
];

function StepProgress({ current }: { current: WizardStep }) {
    const currentIdx = STEPS.findIndex(s => s.key === current);
    return (
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
            {STEPS.map((s, i) => (
                <React.Fragment key={s.key}>
                    {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />}
                    <Badge
                        variant={current === s.key ? "default" : i < currentIdx ? "secondary" : "outline"}
                        className="text-[10px]"
                    >
                        {i + 1}. {s.label}
                    </Badge>
                </React.Fragment>
            ))}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ToolUiComponentGenerator({ tools, onComplete, preselectedToolName }: GeneratorProps) {
    const { toast } = useToast();
    const agent = useToolComponentAgent();

    const [step, setStep] = useState<WizardStep>(preselectedToolName ? "select-data" : "select-tool");
    const [selectedToolName, setSelectedToolName] = useState(preselectedToolName ?? "");

    // Data fetching state
    const [testSamples, setTestSamples] = useState<ToolTestSample[]>([]);
    const [dbEntries, setDbEntries] = useState<CxToolCallEntry[]>([]);
    const [isFetchingData, setIsFetchingData] = useState(false);

    // Selection state
    const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(new Set());
    const [selectedDbEntryIds, setSelectedDbEntryIds] = useState<Set<string>>(new Set());
    const [userInstructions, setUserInstructions] = useState("");

    // Generation state
    const [generatedComponent, setGeneratedComponent] = useState<GeneratedComponent | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [rawResponse, setRawResponse] = useState("");

    // Save state
    const [isSaving, setIsSaving] = useState(false);
    const [savedSampleStreamEvents, setSavedSampleStreamEvents] = useState<unknown[]>([]);

    const selectedTool = tools.find(t => t.name === selectedToolName);

    // ── Data fetching ──────────────────────────────────────────────────────────

    const fetchDataForTool = useCallback(async (toolName: string, toolId: string) => {
        setIsFetchingData(true);
        setTestSamples([]);
        setDbEntries([]);
        setSelectedSampleIds(new Set());
        setSelectedDbEntryIds(new Set());

        try {
            const [samplesResult, dbResult] = await Promise.all([
                supabase
                    .from("tool_test_samples")
                    .select("*")
                    .or(`tool_name.eq.${toolName},tool_id.eq.${toolId}`)
                    .order("created_at", { ascending: false })
                    .limit(10),
                supabase
                    .from("cx_tool_call")
                    .select("id, tool_name, call_id, status, arguments, output, output_type, duration_ms, started_at, completed_at")
                    .eq("tool_name", toolName)
                    .eq("status", "completed")
                    .not("output", "is", null)
                    .order("completed_at", { ascending: false })
                    .limit(5),
            ]);

            const samples = (samplesResult.data ?? []) as ToolTestSample[];
            const entries = (dbResult.data ?? []) as CxToolCallEntry[];
            setTestSamples(samples);
            setDbEntries(entries);

            // Auto-select samples tagged for component use
            const taggedIds = new Set(
                samples.filter(s => s.use_for_component || s.is_success === true).map(s => s.id)
            );
            setSelectedSampleIds(taggedIds.size > 0 ? taggedIds : new Set(samples.slice(0, 1).map(s => s.id)));

            // Auto-select first db entry
            if (entries.length > 0) {
                setSelectedDbEntryIds(new Set([entries[0].id]));
            }
        } catch (err) {
            toast({
                title: "Error loading data",
                description: err instanceof Error ? err.message : "Unknown error",
                variant: "destructive",
            });
        } finally {
            setIsFetchingData(false);
        }
    }, [toast]);

    // Auto-fetch when preselectedToolName is provided
    useEffect(() => {
        if (preselectedToolName && selectedTool) {
            fetchDataForTool(selectedTool.name, selectedTool.id);
        }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Step 1: Tool selection ─────────────────────────────────────────────────

    const handleToolSelected = () => {
        if (!selectedToolName || !selectedTool) {
            toast({ title: "Select a tool", variant: "destructive" });
            return;
        }
        fetchDataForTool(selectedTool.name, selectedTool.id);
        setStep("select-data");
    };

    // ── Step 2: Data selection → Generate ─────────────────────────────────────

    const handleGenerate = async () => {
        if (!selectedTool) return;

        const selectedSamples = testSamples.filter(s => selectedSampleIds.has(s.id));
        const selectedEntries = dbEntries.filter(e => selectedDbEntryIds.has(e.id));

        // Require at least one sample for stream data
        if (selectedSamples.length === 0) {
            toast({
                title: "No stream samples selected",
                description: "Select at least one test sample to provide stream data.",
                variant: "destructive",
            });
            return;
        }

        // Build db entry data: prefer cx_tool_call output, fall back to final_payload
        let dbEntryData: unknown;
        if (selectedEntries.length > 0) {
            dbEntryData = selectedEntries.map(e => {
                try { return JSON.parse(e.output ?? "null"); }
                catch { return e.output; }
            });
        } else {
            // Fallback: use final_payload from test samples
            dbEntryData = selectedSamples
                .map(s => s.final_payload)
                .filter(Boolean);
        }

        // Save sample stream events for live preview after generation
        const firstSample = selectedSamples[0];
        setSavedSampleStreamEvents(firstSample.raw_stream_events ?? []);

        agent.reset();
        setRawResponse("");
        setGeneratedComponent(null);
        setParseError(null);
        setStep("generate");

        const variables: Record<string, string> = {
            complete_tool_object: JSON.stringify(selectedTool, null, 2),
            output_schema: JSON.stringify(selectedTool.output_schema ?? {}, null, 2),
            sample_stream: JSON.stringify(
                selectedSamples.map(s => s.raw_stream_events),
                null, 2
            ),
            sample_database_entry: JSON.stringify(dbEntryData, null, 2),
        };

        const fullText = await agent.execute({
            agentId: COMPONENT_GENERATOR_PROMPT_ID,
            variables,
            userInput: userInstructions.trim() || undefined,
        });

        if (fullText) {
            setRawResponse(fullText);
            const parsed = extractJsonFromResponse(fullText);
            if (parsed) {
                setGeneratedComponent(parsed);
                setParseError(null);
            } else {
                setParseError(
                    "Could not extract a valid JSON component object from the model's response. " +
                    "Review the raw response below — you may copy the code manually into the editor."
                );
            }
        }

        setStep("review");
    };

    // ── Step 4: Save ──────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!generatedComponent) return;

        setIsSaving(true);
        try {
            const toolRecord = tools.find(t => t.name === generatedComponent.tool_name);

            const response = await fetch("/api/admin/tool-ui-components", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...generatedComponent,
                    tool_id: toolRecord?.id ?? null,
                    language: "tsx",
                    is_active: true,
                    notes: "Auto-generated by AI Component Generator",
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to save");
            }

            toast({ title: "Saved", description: "Component saved. It will be active on the next tool use." });
            setStep("saved");
            onComplete?.();
        } catch (err) {
            toast({
                title: "Save failed",
                description: err instanceof Error ? err.message : "Unknown error",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // ── Reset ─────────────────────────────────────────────────────────────────

    const handleReset = () => {
        agent.reset();
        setStep("select-tool");
        setSelectedToolName("");
        setTestSamples([]);
        setDbEntries([]);
        setSelectedSampleIds(new Set());
        setSelectedDbEntryIds(new Set());
        setUserInstructions("");
        setGeneratedComponent(null);
        setParseError(null);
        setRawResponse("");
        setSavedSampleStreamEvents([]);
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4 p-1">
            {!preselectedToolName && <StepProgress current={step} />}

            {/* ── Step 1: Select Tool ───────────────────────────────────────── */}
            {step === "select-tool" && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Select Tool
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-xs mb-1.5 block">Choose a tool to generate a UI component for</Label>
                            <Select value={selectedToolName} onValueChange={setSelectedToolName}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a tool…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tools.map(tool => (
                                        <SelectItem key={tool.name} value={tool.name}>
                                            <span className="font-mono text-xs">{tool.name}</span>
                                            {tool.category && (
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    [{tool.category}]
                                                </span>
                                            )}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedTool && (
                            <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-1.5 border border-border">
                                <div className="font-medium font-mono">{selectedTool.name}</div>
                                <div className="text-muted-foreground">{selectedTool.description}</div>
                                <div className="flex gap-2 flex-wrap">
                                    {selectedTool.category && (
                                        <Badge variant="outline" className="text-[10px]">{selectedTool.category}</Badge>
                                    )}
                                    {selectedTool.output_schema ? (
                                        <Badge variant="secondary" className="text-[10px]">Has output schema</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[10px] text-warning border-warning/40">No output schema</Badge>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <Button onClick={handleToolSelected} disabled={!selectedToolName} size="sm">
                                Next
                                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Step 2: Select Data ───────────────────────────────────────── */}
            {step === "select-data" && (
                <div className="space-y-4">
                    {isFetchingData ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading saved data for {selectedToolName}…
                        </div>
                    ) : (
                        <>
                            {/* No samples warning */}
                            {testSamples.length === 0 && (
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
                                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">No test samples saved</p>
                                        <p className="text-xs text-muted-foreground">
                                            Run this tool on the{" "}
                                            <a href="/demos/api-tests/tool-testing" target="_blank" className="underline text-primary">
                                                Tool Testing page
                                            </a>{" "}
                                            and save a sample first. Samples provide the stream data the AI needs to generate accurate components.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Summary row when preselected (collapsed view) */}
                            {preselectedToolName ? (
                                <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground py-1">
                                    <span className="flex items-center gap-1.5">
                                        <FlaskConical className="w-3.5 h-3.5" />
                                        <span className="font-medium text-foreground">{selectedSampleIds.size}</span> of {testSamples.length} samples selected
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Database className="w-3.5 h-3.5" />
                                        <span className="font-medium text-foreground">{selectedDbEntryIds.size}</span> of {dbEntries.length} db entries selected
                                    </span>
                                    {dbEntries.length === 0 && testSamples.length > 0 && (
                                        <span className="text-warning">↳ Using final_payload fallback</span>
                                    )}
                                    <button
                                        onClick={() => {/* show advanced — handled by toggle below */}}
                                        className="ml-auto text-[11px] underline text-primary"
                                        style={{ display: "none" }}
                                    />
                                </div>
                            ) : (
                                <>
                                    {/* Full sample selection cards (standalone mode) */}
                                    {testSamples.length > 0 && (
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <FlaskConical className="w-4 h-4" />
                                                    Stream Samples
                                                    <Badge variant="outline" className="text-[10px] ml-1">{testSamples.length}</Badge>
                                                    <span className="text-xs font-normal text-muted-foreground ml-auto">{selectedSampleIds.size} selected</span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                {testSamples.map(sample => (
                                                    <SampleCard
                                                        key={sample.id}
                                                        sample={sample}
                                                        selected={selectedSampleIds.has(sample.id)}
                                                        onToggle={() => setSelectedSampleIds(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(sample.id)) next.delete(sample.id); else next.add(sample.id);
                                                            return next;
                                                        })}
                                                    />
                                                ))}
                                            </CardContent>
                                        </Card>
                                    )}
                                    {dbEntries.length > 0 && (
                                        <Card>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm flex items-center gap-2">
                                                    <Database className="w-4 h-4" />
                                                    Database Entries
                                                    <Badge variant="outline" className="text-[10px] ml-1">{dbEntries.length}</Badge>
                                                    <span className="text-xs font-normal text-muted-foreground ml-auto">{selectedDbEntryIds.size} selected</span>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                {dbEntries.map(entry => (
                                                    <DbEntryCard
                                                        key={entry.id}
                                                        entry={entry}
                                                        selected={selectedDbEntryIds.has(entry.id)}
                                                        onToggle={() => setSelectedDbEntryIds(prev => {
                                                            const next = new Set(prev);
                                                            if (next.has(entry.id)) next.delete(entry.id); else next.add(entry.id);
                                                            return next;
                                                        })}
                                                    />
                                                ))}
                                            </CardContent>
                                        </Card>
                                    )}
                                    {dbEntries.length === 0 && testSamples.length > 0 && (
                                        <p className="text-xs text-muted-foreground px-1">
                                            No <span className="font-mono">cx_tool_call</span> entries found — <span className="font-mono">final_payload</span> from test samples will be used as fallback.
                                        </p>
                                    )}
                                </>
                            )}

                            {/* Instructions */}
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Additional Instructions (Optional)</Label>
                                <Textarea
                                    value={userInstructions}
                                    onChange={e => setUserInstructions(e.target.value)}
                                    placeholder="e.g., Use a card grid layout, emphasize the score field, add a copy button…"
                                    className="text-xs min-h-[72px] resize-none"
                                    style={{ fontSize: "16px" }}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                {!preselectedToolName && (
                                    <Button variant="outline" size="sm" onClick={() => setStep("select-tool")}>
                                        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                                        Back
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    onClick={handleGenerate}
                                    disabled={selectedSampleIds.size === 0 || isFetchingData}
                                    className={preselectedToolName ? "w-full" : ""}
                                >
                                    <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                                    Generate Component
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Step 3 + 4: Generating → Review (single persistent panel) ── */}
            {(step === "generate" || step === "review") && (
                <div className="space-y-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            {agent.isStreaming ? (
                                <>
                                    <Sparkles className="w-4 h-4 animate-pulse text-primary" />
                                    <span className="text-sm font-medium">Generating…</span>
                                </>
                            ) : step === "review" && parseError ? (
                                <>
                                    <AlertTriangle className="w-4 h-4 text-warning" />
                                    <span className="text-sm font-medium">Parse failed — review the response below</span>
                                </>
                            ) : step === "review" ? (
                                <>
                                    <CheckCircle className="w-4 h-4 text-success" />
                                    <span className="text-sm font-medium">Component ready to save</span>
                                </>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                            {agent.isStreaming && (
                                <Button variant="ghost" size="sm" onClick={agent.cancel} className="text-xs h-7 gap-1">
                                    <X className="w-3 h-3" />
                                    Cancel
                                </Button>
                            )}
                            {step === "review" && (
                                <Button variant="outline" size="sm" onClick={() => { setStep("select-data"); agent.reset(); }} className="text-xs h-7 gap-1">
                                    <RefreshCw className="w-3 h-3" />
                                    Regenerate
                                </Button>
                            )}
                            {step === "review" && generatedComponent && (
                                <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-7 text-xs gap-1">
                                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    {isSaving ? "Saving…" : "Save to Database"}
                                </Button>
                            )}
                        </div>
                    </div>

                    {agent.error && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            {agent.error}
                        </div>
                    )}

                    {/* ── Always-visible MarkdownStream ────────────────────── */}
                    {/* This stays visible throughout generate AND review.      */}
                    {/* Even on parse failure the admin sees the full response. */}
                    <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
                        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground">
                                Model response
                            </span>
                            {step === "review" && rawResponse && (
                                <span className="text-[11px] text-muted-foreground font-mono">
                                    {rawResponse.length.toLocaleString()} chars
                                </span>
                            )}
                        </div>
                        <div className="p-4 min-h-[200px] max-h-[600px] overflow-y-auto">
                            {(agent.accumulatedText || rawResponse) ? (
                                <MarkdownStream
                                    content={agent.accumulatedText || rawResponse}
                                    isStreamActive={agent.isStreaming}
                                    type="message"
                                    role="assistant"
                                />
                            ) : (
                                <p className="text-xs text-muted-foreground italic">
                                    Waiting for model response…
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── Parsed component tabs (only when parse succeeded) ── */}
                    {step === "review" && generatedComponent && (
                        <Card>
                            <CardContent className="pt-4 space-y-4">
                                {/* Metadata row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <span className="text-muted-foreground block">Tool</span>
                                        <p className="font-mono font-medium">{generatedComponent.tool_name}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Display Name</span>
                                        <p className="font-medium">{generatedComponent.display_name}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Results Label</span>
                                        <p className="font-medium">{generatedComponent.results_label || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground block">Keep Expanded</span>
                                        <p className="font-medium">{generatedComponent.keep_expanded_on_stream ? "Yes" : "No"}</p>
                                    </div>
                                </div>

                                {/* Code tabs */}
                                <Tabs defaultValue="inline">
                                    <TabsList>
                                        <TabsTrigger value="inline" className="text-xs">Inline</TabsTrigger>
                                        <TabsTrigger value="overlay" className="text-xs">Overlay</TabsTrigger>
                                        <TabsTrigger value="utility" className="text-xs">Utility</TabsTrigger>
                                        <TabsTrigger value="headers" className="text-xs">Headers</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="inline">
                                        <CodeBlock code={generatedComponent.inline_code} label="inline_code" />
                                    </TabsContent>
                                    <TabsContent value="overlay">
                                        <CodeBlock code={generatedComponent.overlay_code} label="overlay_code" />
                                    </TabsContent>
                                    <TabsContent value="utility">
                                        <CodeBlock code={generatedComponent.utility_code} label="utility_code" />
                                    </TabsContent>
                                    <TabsContent value="headers" className="space-y-3">
                                        <div>
                                            <Label className="text-[10px] text-muted-foreground mb-1 block">header_subtitle_code</Label>
                                            <CodeBlock code={generatedComponent.header_subtitle_code} label="header_subtitle_code" />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] text-muted-foreground mb-1 block">header_extras_code</Label>
                                            <CodeBlock code={generatedComponent.header_extras_code} label="header_extras_code" />
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* ── Step 5: Saved + Live Preview ──────────────────────────────── */}
            {step === "saved" && (
                <div className="space-y-4">
                    <Card className="border-success/30 bg-success/5">
                        <CardContent className="pt-6 text-center space-y-2">
                            <CheckCircle className="w-10 h-10 text-success mx-auto" />
                            <h3 className="text-base font-semibold">Component Saved</h3>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                The UI component for <span className="font-mono font-medium">{selectedToolName}</span> is
                                now active. It will render automatically the next time this tool is used in chat.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Live preview */}
                    {savedSampleStreamEvents.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Eye className="w-4 h-4" />
                                    Live Preview
                                    <Badge variant="secondary" className="text-[10px]">New component</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Preview uses the first selected sample's stream data. The component is fetched fresh from the database.
                                </p>
                                <LivePreview
                                    toolName={selectedToolName}
                                    rawStreamEvents={savedSampleStreamEvents}
                                />
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex justify-center">
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            Generate Another
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
